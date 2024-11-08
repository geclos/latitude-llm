'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

import {
  EvaluationConfigurationText,
  EvaluationDto,
  EvaluationMetadataLlmAsJudgeSimple,
  EvaluationMetadataType,
  EvaluationResultableType,
  findFirstModelForProvider,
} from '@latitude-data/core/browser'
import {
  Button,
  FormField,
  Input,
  Label,
  Text,
  useToast,
} from '@latitude-data/web-ui'
import {
  IProviderByName,
  ProviderModelSelector,
  useModelsOptions,
} from '$/components/EditorHeader'
import { envClient } from '$/envClient'
import useEvaluations from '$/stores/evaluations'
import useProviderApiKeys from '$/stores/providerApiKeys'

export default function TextEvaluationEditor({
  evaluation,
}: {
  evaluation: EvaluationDto
}) {
  const { toast } = useToast()
  const { data: providerApiKeys } = useProviderApiKeys()
  const metadata = evaluation.metadata as EvaluationMetadataLlmAsJudgeSimple
  const resultConfiguration =
    evaluation.resultConfiguration as EvaluationConfigurationText
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>()
  const [selectedModel, setSelectedModel] = useState<
    string | undefined | null
  >()
  useEffect(() => {
    const provider = providerApiKeys.find(
      (pk) => pk.id === metadata.providerApiKeyId,
    )
    if (!provider) return

    setSelectedProvider(provider.name)
    setSelectedModel(metadata.model)
  }, [providerApiKeys])

  const { update } = useEvaluations()

  const providerOptions = useMemo(() => {
    return providerApiKeys.map((apiKey) => ({
      label: apiKey.name,
      value: apiKey.name,
    }))
  }, [providerApiKeys])
  const providersByName = useMemo(() => {
    return providerApiKeys.reduce((acc, data) => {
      acc[data.name] = data
      return acc
    }, {} as IProviderByName)
  }, [providerApiKeys])
  const modelOptions = useModelsOptions({
    provider: selectedProvider
      ? providersByName[selectedProvider]?.provider
      : undefined,
    isDefaultProvider:
      selectedProvider === envClient.NEXT_PUBLIC_DEFAULT_PROJECT_ID,
  })
  const onProviderChange = async (value: string) => {
    if (!value) return

    const provider = providersByName[value]!
    if (!provider) return
    if (selectedProvider === provider.name) return

    setSelectedProvider(provider.name)

    const firstModel = findFirstModelForProvider(provider.provider)
    if (!firstModel) return

    setSelectedModel(firstModel)
  }
  const onModelChange = async (value: string) => {
    if (!value) return
    if (selectedModel === value) return

    setSelectedModel(value)
  }
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const provider = selectedProvider
      ? providersByName[selectedProvider]
      : undefined

    const [_, error] = await update({
      id: evaluation.id,
      metadata: {
        type: EvaluationMetadataType.LlmAsJudgeSimple,
        providerApiKeyId: provider?.id,
        model: selectedModel ?? undefined,
        objective: formData.get('objective') as string,
        additionalInstructions: formData.get(
          'additionalInstructions',
        ) as string,
      },
      configuration: {
        type: EvaluationResultableType.Text,
        valueDescription: formData.get('valueDescription') as string,
      },
    })
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className='flex flex-col gap-y-2 h-full'>
      <div className='flex flex-row items-center justify-between'>
        <Text.H4M>{evaluation.name}</Text.H4M>
        <Button fancy form='simple-text-evaluation-editor' type='submit'>
          Save changes
        </Button>
      </div>
      <form
        className='bg-backgroundCode flex flex-grow flex-col gap-y-4 p-4 rounded-lg border'
        id='simple-text-evaluation-editor'
        onSubmit={onSubmit}
      >
        <FormField>
          <ProviderModelSelector
            modelDisabled={!selectedProvider}
            modelOptions={modelOptions}
            onModelChange={onModelChange}
            onProviderChange={onProviderChange}
            providerDisabled={!providerOptions.length}
            providerOptions={providerOptions}
            selectedModel={selectedModel}
            selectedProvider={selectedProvider}
          />
        </FormField>
        <FormField label='Evaluation objective'>
          <Input
            name='objective'
            defaultValue={metadata.objective}
            placeholder='The main objective of the evaluation'
          />
        </FormField>
        <FormField label='Value description'>
          <Input
            name='valueDescription'
            defaultValue={resultConfiguration.valueDescription ?? ''}
            placeholder='Description of the evaluation output value'
          />
        </FormField>
        <div className='flex flex-col gap-2 flex-grow'>
          <Label>Additional instructions</Label>
          <textarea
            name='additionalInstructions'
            className='w-full h-full border rounded-lg p-2 text-sm text-foreground'
            defaultValue={metadata.additionalInstructions ?? ''}
            placeholder='Additional instructions the eval should take into account...'
          />
        </div>
      </form>
    </div>
  )
}
