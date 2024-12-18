import { ParameterType } from '../constants'

export const INPUT_SOURCE = {
  manual: 'manual',
  dataset: 'dataset',
  history: 'history',
} as const
const LOCAL_INPUT_SOURCE = {
  manual: 'manual',
  history: 'history',
} as const
export type LocalInputSource =
  (typeof LOCAL_INPUT_SOURCE)[keyof typeof LOCAL_INPUT_SOURCE]

export type InputSource = (typeof INPUT_SOURCE)[keyof typeof INPUT_SOURCE]
type PlaygroundInputMetadata = {
  type?: ParameterType
  includeInPrompt?: boolean
}

type LocalPlaygroundInput<_S extends LocalInputSource = 'manual'> = {
  value: string
  metadata: PlaygroundInputMetadata
}
export type PlaygroundInput<S extends InputSource> = S extends 'dataset'
  ? {
      value: string
      metadata: PlaygroundInputMetadata & { includeInPrompt: boolean }
    }
  : LocalPlaygroundInput<LocalInputSource>

type ManualInput = PlaygroundInput<'manual'>
type DatasetInput = PlaygroundInput<'dataset'>
type HistoryInput = PlaygroundInput<'history'>

export type Inputs<S extends InputSource> = Record<string, PlaygroundInput<S>>
export type LocalInputs<S extends LocalInputSource> = Record<
  string,
  LocalPlaygroundInput<S>
>

export type LinkedDataset = {
  rowIndex: number | undefined
  inputs: Record<string, DatasetInput>
  mappedInputs: Record<string, number>
}

export type PlaygroundInputs<S extends InputSource> = {
  source: S
  manual: {
    inputs: Record<string, ManualInput>
  }
  // DEPRECATED: Remove after a while
  dataset: LinkedDataset & {
    datasetId: number | undefined
  }
  history: {
    logUuid: string | undefined
    inputs: Record<string, HistoryInput>
  }
}