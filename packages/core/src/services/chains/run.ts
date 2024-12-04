import { Chain as LegacyChain } from '@latitude-data/compiler'
import { RunErrorCodes } from '@latitude-data/constants/errors'
import { Chain as PromptlChain } from '@latitude-data/promptl'

import { ProviderApiKey, Workspace } from '../../browser'
import {
  ChainEvent,
  ChainStepResponse,
  ErrorableEntity,
  LogSources,
  StreamType,
} from '../../constants'
import { Result, TypedResult } from '../../lib'
import { generateUUIDIdentifier } from '../../lib/generateUUID'
import { ai, AIReturn } from '../ai'
import { getCachedResponse, setCachedResponse } from '../commits/promptCache'
import { createRunError as createRunErrorFn } from '../runErrors/create'
import { ChainError } from './ChainErrors'
import { ChainStreamConsumer } from './ChainStreamConsumer'
import { consumeStream } from './ChainStreamConsumer/consumeStream'
import { ConfigOverrides, validateChain } from './ChainValidator'
import { processResponse } from './ProviderProcessor'
import {
  buildProviderLogDto,
  saveOrPublishProviderLogs,
} from './ProviderProcessor/saveOrPublishProviderLogs'

export type CachedApiKeys = Map<string, ProviderApiKey>
type SomeChain = LegacyChain | PromptlChain

async function createRunError({
  error,
  errorableUuid,
  errorableType,
  persistErrors,
}: {
  errorableUuid: string
  error: ChainError<RunErrorCodes>
  persistErrors: boolean
  errorableType?: ErrorableEntity
}) {
  if (!persistErrors || !errorableType) return error

  const dbError = await createRunErrorFn({
    data: {
      errorableUuid,
      errorableType,
      code: error.errorCode,
      message: error.message,
      details: error.details,
    },
  }).then((r) => r.unwrap())

  error.dbError = dbError

  return error
}

export type ChainResponse<T extends StreamType> = TypedResult<
  ChainStepResponse<T>,
  ChainError<RunErrorCodes>
>
type CommonArgs<T extends boolean = true, C extends SomeChain = LegacyChain> = {
  workspace: Workspace
  chain: C
  promptlVersion: number
  source: LogSources
  providersMap: CachedApiKeys
  configOverrides?: ConfigOverrides
  generateUUID?: () => string
  persistErrors?: T
}
type RunChainArgs<T extends boolean, C extends SomeChain> = T extends true
  ? CommonArgs<T, C> & {
      errorableType: ErrorableEntity
    }
  : CommonArgs<T, C> & { errorableType?: undefined }

export async function runChain<T extends boolean, C extends SomeChain>({
  workspace,
  chain,
  promptlVersion,
  providersMap,
  source,
  errorableType,
  configOverrides,
  persistErrors = true,
  generateUUID = generateUUIDIdentifier,
}: RunChainArgs<T, C>) {
  const errorableUuid = generateUUID()

  let responseResolve: (value: ChainResponse<StreamType>) => void

  const response = new Promise<ChainResponse<StreamType>>((resolve) => {
    responseResolve = resolve
  })

  const chainStartTime = Date.now()
  const stream = new ReadableStream<ChainEvent>({
    start(controller) {
      runStep({
        workspace,
        source,
        chain,
        promptlVersion,
        providersMap,
        controller,
        errorableUuid,
        errorableType,
        configOverrides,
      })
        .then((okResponse) => {
          responseResolve(Result.ok(okResponse))
        })
        .catch(async (e: ChainError<RunErrorCodes>) => {
          const error = await createRunError({
            error: e,
            errorableUuid,
            errorableType,
            persistErrors,
          })

          responseResolve(Result.error(error))
        })
    },
  })

  return {
    stream,
    response,
    resolvedContent: chain.rawText,
    errorableUuid,
    duration: response.then(() => Date.now() - chainStartTime),
  }
}

async function runStep({
  workspace,
  source,
  chain,
  promptlVersion,
  providersMap,
  controller,
  previousCount = 0,
  previousResponse,
  errorableUuid,
  errorableType,
  configOverrides,
}: {
  workspace: Workspace
  source: LogSources
  chain: SomeChain
  promptlVersion: number
  providersMap: CachedApiKeys
  controller: ReadableStreamDefaultController
  errorableUuid: string
  errorableType?: ErrorableEntity
  previousCount?: number
  previousResponse?: ChainStepResponse<StreamType>
  configOverrides?: ConfigOverrides
}) {
  const prevText = previousResponse?.text
  const streamConsumer = new ChainStreamConsumer({
    controller,
    previousCount,
    errorableUuid,
  })

  try {
    const step = await validateChain({
      workspace,
      prevText,
      chain,
      promptlVersion,
      providersMap,
      configOverrides,
    }).then((r) => r.unwrap())

    if (chain instanceof PromptlChain && step.chainCompleted) {
      streamConsumer.chainCompleted({
        step,
        response: previousResponse!,
      })

      return previousResponse!
    }

    const { messageCount, stepStartTime } = streamConsumer.setup(step)

    const cachedResponse = await getCachedResponse({
      workspace,
      config: step.config,
      conversation: step.conversation,
    })

    if (cachedResponse) {
      const providerLog = await saveOrPublishProviderLogs({
        workspace,
        streamType: cachedResponse.streamType,
        finishReason: 'stop', // TODO: we probably should add a cached reason here
        data: buildProviderLogDto({
          workspace,
          source,
          provider: step.provider,
          conversation: step.conversation,
          stepStartTime,
          errorableUuid,
          response: cachedResponse as ChainStepResponse<StreamType>,
        }),
        saveSyncProviderLogs: true, // TODO: temp bugfix, it should only save last one syncronously
      })

      const response = {
        ...cachedResponse,
        providerLog,
        documentLogUuid: errorableUuid,
      } as ChainStepResponse<StreamType>

      if (step.chainCompleted) {
        streamConsumer.chainCompleted({
          step,
          response,
        })

        return response
      } else {
        streamConsumer.stepCompleted(response)

        return runStep({
          workspace,
          source,
          chain,
          promptlVersion,
          providersMap,
          controller,
          errorableUuid,
          errorableType,
          previousCount: previousCount + 1,
          previousResponse: response,
          configOverrides,
        })
      }
    }

    const aiResult = await ai({
      messages: step.conversation.messages,
      config: step.config,
      provider: step.provider,
      schema: step.schema,
      output: step.output,
    }).then((r) => r.unwrap())

    const checkResult = checkValidType(aiResult)
    if (checkResult.error) throw checkResult.error

    const consumedStream = await consumeStream({
      controller,
      result: aiResult,
    })
    if (consumedStream.error) throw consumedStream.error

    const _response = await processResponse({
      aiResult,
      apiProvider: step.provider,
      config: step.config,
      errorableUuid,
      messages: step.conversation.messages,
      source,
      workspace,
      startTime: stepStartTime,
    })

    const providerLog = await saveOrPublishProviderLogs({
      workspace,
      streamType: aiResult.type,
      finishReason: consumedStream.finishReason,
      data: buildProviderLogDto({
        workspace,
        source,
        provider: step.provider,
        conversation: step.conversation,
        stepStartTime,
        errorableUuid,
        response: _response,
      }),
      saveSyncProviderLogs: true, // TODO: temp bugfix, shuold only save last one syncronously
    })

    const response = { ..._response, providerLog }

    await setCachedResponse({
      workspace,
      config: step.config,
      conversation: step.conversation,
      response,
    })

    if (step.chainCompleted) {
      streamConsumer.chainCompleted({
        step,
        response,
      })

      return response
    } else {
      streamConsumer.stepCompleted(response)

      return runStep({
        workspace,
        source,
        chain,
        promptlVersion,
        errorableUuid,
        errorableType,
        providersMap,
        controller,
        previousCount: messageCount,
        previousResponse: response,
        configOverrides,
      })
    }
  } catch (e: unknown) {
    const error = streamConsumer.chainError(e)
    throw error
  }
}

function checkValidType(aiResult: AIReturn<StreamType>) {
  const { type } = aiResult
  const invalidType = type !== 'text' && type !== 'object'
  if (!invalidType) return Result.nil()

  return Result.error(
    new ChainError({
      code: RunErrorCodes.UnsupportedProviderResponseTypeError,
      message: `Invalid stream type ${type} result is not a textStream or objectStream`,
    }),
  )
}
