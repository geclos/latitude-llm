import { Providers } from '$core/constants'
import { mergeCommit } from '$core/services'
import * as factories from '$core/tests/factories'
import { describe, expect, it } from 'vitest'

import { EvaluationResultsRepository } from '.'

describe('findEvaluationResultsByDocumentUuid', () => {
  it('return evaluation results', async () => {
    const { workspace, project, user } = await factories.createProject()
    const provider = await factories.createProviderApiKey({
      workspace,
      type: Providers.OpenAI,
      name: 'openai',
      user,
    })
    const evaluation = await factories.createEvaluation({ provider })

    const { commit: draft } = await factories.createDraft({ project, user })
    const { documentVersion: doc } = await factories.createDocumentVersion({
      commit: draft,
      content: factories.helpers.createPrompt({ provider }),
    })
    const commit = await mergeCommit(draft).then((r) => r.unwrap())

    const { documentLog } = await factories.createDocumentLog({
      document: doc,
      commit,
    })

    const evaluationResult = await factories.createEvaluationResult({
      documentLog,
      evaluation,
    })

    const evaluationResultsScope = new EvaluationResultsRepository(workspace.id)
    const result = await evaluationResultsScope
      .findByDocumentUuid(doc.documentUuid)
      .then((r) => r.unwrap())

    expect(result.length).toBe(1)
    expect(result[0]).toEqual(evaluationResult)
  })
})
