import { ErrorableEntity, LogSources, Workspace } from '../../../browser'
import { NotFoundError, Result } from '../../../lib'
import {
  DocumentLogsRepository,
  DocumentVersionsRepository,
} from '../../../repositories'
import { getCachedChain } from '../../chains/chainCache'
import { runChain } from '../../chains/run'
import { buildProvidersMap } from '../../providerApiKeys/buildMap'
import { ToolCallResponse } from '@latitude-data/constants'
import { buildToolResponseMessages } from '../addToolResponse/index'

export async function resumeConversation({
  workspace,
  documentLogUuid,
  commitUuid,
  toolCallResponses,
  source,
}: {
  workspace: Workspace
  documentLogUuid: string
  commitUuid?: string
  toolCallResponses: ToolCallResponse[]
  source: LogSources
}) {
  const errorableType = ErrorableEntity.DocumentLog
  const providersMap = await buildProvidersMap({
    workspaceId: workspace.id,
  })
  const chain = await getCachedChain({ workspace, documentLogUuid })

  if (!chain) {
    return Result.error(
      new NotFoundError(
        `Chain not found in cache for document log with UUID: ${documentLogUuid}`,
      ),
    )
  }

  const logRep = new DocumentLogsRepository(workspace.id)
  const logResult = await logRep.findByUuid(documentLogUuid)
  if (logResult.error) return logResult

  const documentLog = logResult.value
  const documentsRepo = new DocumentVersionsRepository(workspace.id)
  const result = await documentsRepo.getDocumentByUuid({
    commitUuid,
    documentUuid: documentLog.documentUuid,
  })
  if (result.error) return result

  const document = result.value
  const errorableUuid = documentLogUuid

  const run = await runChain({
    generateUUID: () => errorableUuid,
    errorableType,
    workspace,
    chain,
    promptlVersion: document.promptlVersion,
    providersMap,
    source,
    extraMessages: buildToolResponseMessages(toolCallResponses),
  })

  return Result.ok({
    stream: run.stream,
    duration: run.duration,
    resolvedContent: result.value,
    errorableUuid,
    response: run.response,
  })
}
