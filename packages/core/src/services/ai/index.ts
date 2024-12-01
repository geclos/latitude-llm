import { omit } from 'lodash-es'

import { Message } from '@latitude-data/compiler'
import { RunErrorCodes } from '@latitude-data/constants/errors'
import {
  CoreMessage,
  CoreTool,
  jsonSchema,
  LanguageModel,
  ObjectStreamPart,
  streamObject as originalStreamObject,
  streamText as originalStreamText,
  StreamObjectResult,
  StreamTextResult,
  TextStreamPart,
} from 'ai'
import { JSONSchema7 } from 'json-schema'

import { ProviderApiKey, StreamType } from '../../browser'
import { Result, TypedResult } from '../../lib'
import { ChainError } from '../chains/ChainErrors'
import { buildTools } from './buildTools'
import { handleAICallAPIError } from './handleError'
import { createProvider, PartialConfig } from './helpers'
import { Providers, UNSUPPORTED_STREAM_MODELS } from './providers/models'
import { applyCustomRules } from './providers/rules'
import { runNoStreamingModels } from './runNoStreamingModels'

const DEFAULT_AI_SDK_PROVIDER = {
  streamText: originalStreamText,
  streamObject: originalStreamObject,
}
type AISDKProvider = typeof DEFAULT_AI_SDK_PROVIDER
type AIReturnObject = {
  type: 'object'
  data: Pick<
    StreamObjectResult<unknown, unknown, never>,
    'fullStream' | 'object' | 'usage' | 'response'
  > & {
    providerName: Providers
  }
}
type AIReturnText = {
  type: 'text'
  data: Pick<
    StreamTextResult<Record<string, CoreTool<any, any>>>,
    'fullStream' | 'text' | 'usage' | 'toolCalls' | 'response'
  > & {
    providerName: Providers
  }
}

export type AIReturn<T extends StreamType> = T extends 'object'
  ? AIReturnObject
  : T extends 'text'
    ? AIReturnText
    : never

export type StreamChunk =
  | TextStreamPart<Record<string, CoreTool>>
  | ObjectStreamPart<unknown>

export type ObjectOutput = 'object' | 'array' | 'no-schema' | undefined
export async function ai({
  provider: apiProvider,
  prompt,
  messages: originalMessages,
  config: originalConfig,
  schema,
  output,
  customLanguageModel,
  aiSdkProvider,
}: {
  provider: ProviderApiKey
  config: PartialConfig
  messages: Message[]
  prompt?: string
  schema?: JSONSchema7
  customLanguageModel?: LanguageModel
  output?: ObjectOutput
  aiSdkProvider?: Partial<AISDKProvider>
}): Promise<
  TypedResult<
    AIReturn<StreamType>,
    ChainError<
      | RunErrorCodes.AIProviderConfigError
      | RunErrorCodes.AIRunError
      | RunErrorCodes.Unknown
    >
  >
> {
  const { streamText, streamObject } = {
    ...DEFAULT_AI_SDK_PROVIDER,
    ...(aiSdkProvider || {}),
  }
  try {
    const rule = applyCustomRules({
      providerType: apiProvider.provider,
      messages: originalMessages,
      config: originalConfig,
    })

    const { provider, token: apiKey, url } = apiProvider
    const config = rule.config as PartialConfig
    const messages = rule.messages
    const model = config.model
    const tools = config.tools
    const llmProvider = createProvider({
      messages,
      provider,
      apiKey,
      config,
      ...(url ? { url } : {}),
    })

    if (llmProvider.error) return llmProvider

    const languageModel = customLanguageModel
      ? customLanguageModel
      : llmProvider.value(model, { cacheControl: config.cacheControl })
    const toolsResult = buildTools(tools)
    if (toolsResult.error) return toolsResult

    const commonOptions = {
      ...omit(config, ['schema']),
      model: languageModel,
      prompt,
      messages: messages as CoreMessage[],
      tools: toolsResult.value,
    }

    if (UNSUPPORTED_STREAM_MODELS.includes(model)) {
      return runNoStreamingModels({
        schema,
        output,
        commonOptions,
        provider,
      })
    }

    if (schema && output) {
      const result = await streamObject({
        ...commonOptions,
        schema: jsonSchema(schema),
        output: output as 'object',
      })

      return Result.ok({
        type: 'object',
        data: {
          fullStream: result.fullStream,
          object: result.object,
          usage: result.usage,
          providerName: provider,
          response: result.response,
        },
      })
    }

    const result = await streamText(commonOptions)
    return Result.ok({
      type: 'text',
      data: {
        fullStream: result.fullStream,
        response: result.response,
        text: result.text,
        usage: result.usage,
        toolCalls: result.toolCalls,
        providerName: provider,
      },
    })
  } catch (e) {
    return handleAICallAPIError(e)
  }
}

export { estimateCost } from './estimateCost'
export type { Config, PartialConfig } from './helpers'
