import { useMemo } from 'react'

import { Dataset, DocumentVersion } from '@latitude-data/core/browser'
import {
  Button,
  FormFieldGroup,
  Icon,
  Input,
  NumeredList,
  ReactStateDispatch,
  Select,
  SelectOption,
  SwitchInput,
} from '@latitude-data/web-ui'
import { ROUTES } from '$/services/routes'
import Link from 'next/link'

function LineRangeInputs({
  disabled,
  fromDefaultValue,
  toDefaultValue,
  onChangeToLine,
  max,
}: {
  disabled: boolean
  fromDefaultValue: number | undefined
  toDefaultValue: number | undefined
  onChangeToLine: ReactStateDispatch<number | undefined>
  max: number | undefined
}) {
  return (
    <FormFieldGroup>
      <Input
        disabled={disabled}
        type='number'
        name='fromLine'
        label='From line'
        defaultValue={fromDefaultValue}
        placeholder='Starting line'
        min={1}
        max={toDefaultValue}
      />
      <Input
        disabled={disabled}
        type='number'
        name='fromLine'
        label='To line'
        placeholder='Ending line'
        defaultValue={toDefaultValue}
        onChange={(e) => {
          onChangeToLine(Number(e.target.value))
        }}
        min={fromDefaultValue}
        max={max}
      />
    </FormFieldGroup>
  )
}

export default function DatasetForm({
  document,
  onParametersChange,
  selectedDataset,
  headers,
  wantAllLines,
  fromLine,
  toLine,
  onChangeToLine,
  datasets,
  isLoadingDatasets,
  parametersList,
  onToggleAllLines,
  onSelectDataset,
  errors,
}: {
  document: DocumentVersion
  onParametersChange: (param: string) => (header: string) => void
  parametersList: string[]
  wantAllLines: boolean
  fromLine: number | undefined
  toLine: number | undefined
  onChangeToLine: ReactStateDispatch<number | undefined>
  headers: SelectOption[]
  selectedDataset: Dataset | null
  datasets: Dataset[]
  isLoadingDatasets: boolean
  onSelectDataset: (value: string) => void
  onToggleAllLines: (checked: boolean) => void
  errors: Record<string, string[] | undefined> | undefined
}) {
  const paramaterErrors = useMemo(() => {
    if (!errors) return {}
    if (!errors.parameters) return {}

    const paramErrors = errors.parameters
    if (!Array.isArray(paramErrors)) return {}

    return paramErrors.reduce(
      (acc, error) => {
        const parts = error.split(': ')
        const param = parts[0]
        const message = parts[1]
        if (!param || !message) return acc

        const prevMessage = acc[param] || []
        prevMessage.push(message)
        acc[param] = prevMessage
        return acc
      },
      {} as Record<string, string[]>,
    )
  }, [errors])
  const datasetOptions = useMemo(
    () => datasets.map((ds) => ({ value: ds.id, label: ds.name })),
    [datasets],
  )
  return (
    <>
      <NumeredList>
        <NumeredList.Item title='Pick dataset'>
          <div className='flex flex-row items-center gap-4'>
            <div className='w-1/2'>
              <Select
                name='datasetId'
                placeholder='Select dataset'
                disabled={isLoadingDatasets}
                options={datasetOptions}
                onChange={onSelectDataset}
                defaultValue={selectedDataset?.id?.toString()}
              />
            </div>
            <Link
              href={`${ROUTES.datasets.generate.root}?name='${document.path}'&parameters=${parametersList.join(',')}&backUrl=${window.location.href}`}
              className='flex flex-row items-center gap-1'
            >
              <Button variant='link'>
                Generate dataset <Icon name='externalLink' />
              </Button>
            </Link>
          </div>
        </NumeredList.Item>
        <NumeredList.Item title='Select lines from dataset' width='w-1/2'>
          {selectedDataset ? (
            <div className='flex flex-col gap-y-2'>
              <LineRangeInputs
                disabled={wantAllLines}
                fromDefaultValue={fromLine}
                toDefaultValue={toLine}
                onChangeToLine={onChangeToLine}
                max={selectedDataset?.fileMetadata?.rowCount}
              />
              <SwitchInput
                name='wantAllLines'
                disabled={!selectedDataset}
                defaultChecked={wantAllLines}
                onCheckedChange={onToggleAllLines}
                label='Include all lines'
                description='You can pass to evaluations all lines from a dataset or a selection from one line to another. Uncheck this option to select the lines.'
              />
            </div>
          ) : null}
        </NumeredList.Item>
        <NumeredList.Item
          title='Select the columns that contain the data to fill out the variables'
          width='w-1/2'
        >
          {selectedDataset ? (
            <div className='flex flex-col gap-y-3'>
              {parametersList.map((param) => (
                <Select
                  key={param}
                  name={`parameter[${param}]`}
                  disabled={headers.length === 0}
                  errors={paramaterErrors[param]}
                  badgeLabel
                  label={param}
                  options={headers}
                  onChange={onParametersChange(param)}
                  placeholder='Select csv column'
                />
              ))}
            </div>
          ) : null}
        </NumeredList.Item>
      </NumeredList>
    </>
  )
}
