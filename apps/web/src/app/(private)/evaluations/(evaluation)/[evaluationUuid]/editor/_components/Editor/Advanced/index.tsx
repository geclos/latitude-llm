'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'

import {
  EvaluationDto,
  EvaluationMetadataLlmAsJudgeAdvanced,
  EvaluationMetadataType,
  ProviderApiKey,
  SERIALIZED_DOCUMENT_LOG_FIELDS,
} from '@latitude-data/core/browser'
import {
  Button,
  DocumentTextEditor,
  DocumentTextEditorFallback,
} from '@latitude-data/web-ui'
import EditorHeader from '$/components/EditorHeader'
import { useMetadata } from '$/hooks/useMetadata'
import useEvaluations from '$/stores/evaluations'
import useProviderApiKeys from '$/stores/providerApiKeys'

const promptlVersion = (evaluation?: EvaluationDto) => {
  if (
    evaluation?.metadataType === EvaluationMetadataType.LlmAsJudgeAdvanced &&
    evaluation?.metadata.promptlVersion !== 0
  ) {
    return 0
  }

  return 1
}

export default function AdvancedEvaluationEditor({
  evaluation: serverEvaluation,
  defaultPrompt,
  providerApiKeys,
  freeRunsCount,
}: {
  evaluation: EvaluationDto
  defaultPrompt: string
  providerApiKeys?: ProviderApiKey[]
  freeRunsCount?: number
}) {
  const { findEvaluation, isLoading, update, isUpdating } = useEvaluations({
    fallbackData: [serverEvaluation],
  })
  const evaluation = findEvaluation(serverEvaluation.uuid)
  const evaluationMetadata = useMemo(
    () => evaluation?.metadata as EvaluationMetadataLlmAsJudgeAdvanced,
    [evaluation],
  )
  const { data: providers } = useProviderApiKeys({
    fallbackData: providerApiKeys,
  })
  const [value, setValue] = useState(defaultPrompt)
  const { metadata, runReadMetadata } = useMetadata()

  useEffect(() => {
    runReadMetadata({
      prompt: value,
      withParameters: SERIALIZED_DOCUMENT_LOG_FIELDS,
      promptlVersion: promptlVersion(evaluation),
    })
  }, [providers, runReadMetadata])

  const save = useCallback(
    (val: string) => {
      update({
        id: evaluation!.id,
        metadata: {
          type: EvaluationMetadataType.LlmAsJudgeAdvanced,
          prompt: val,
        },
      })
    },
    [update, evaluation],
  )

  const onChange = useCallback(
    (value: string) => {
      setValue(value)
      runReadMetadata({
        prompt: value,
        withParameters: SERIALIZED_DOCUMENT_LOG_FIELDS,
        promptlVersion: promptlVersion(evaluation),
      })
    },
    [setValue, runReadMetadata, providers],
  )

  if (!evaluation) return null

  return (
    <>
      <EditorHeader
        freeRunsCount={freeRunsCount}
        providers={providers}
        title='Evaluation editor'
        metadata={metadata}
        prompt={value}
        onChangePrompt={onChange}
        rightActions={
          <>
            {value !== evaluationMetadata.prompt && (
              <Button
                fancy
                disabled={isUpdating || isLoading}
                onClick={() => save(value)}
              >
                Save changes
              </Button>
            )}
          </>
        }
      />
      <Suspense fallback={<DocumentTextEditorFallback />}>
        <DocumentTextEditor
          value={value}
          metadata={metadata}
          onChange={onChange}
        />
      </Suspense>
    </>
  )
}
