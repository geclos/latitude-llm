import { useMemo } from 'react'

import { ProviderLogDto } from '@latitude-data/core/browser'
import { DocumentLogWithMetadataAndError } from '@latitude-data/core/repositories'
import { ClickToCopy, Text } from '@latitude-data/web-ui'
import { formatCostInMillicents, formatDuration } from '$/app/_lib/formatUtils'
import { RunErrorMessage } from '$/app/(private)/projects/[projectId]/versions/[commitUuid]/_components/RunErrorMessage'
import useProviderApiKeys from '$/stores/providerApiKeys'
import { format } from 'date-fns'

import {
  FinishReasonItem,
  MetadataItem,
  MetadataItemTooltip,
} from '../../../../../[documentUuid]/_components/MetadataItem'

function ProviderLogsMetadata({
  providerLog,
  documentLog,
  providerLogs,
}: {
  providerLog: ProviderLogDto
  documentLog: DocumentLogWithMetadataAndError
  providerLogs: ProviderLogDto[]
}) {
  const { data: providers, isLoading: providersLoading } = useProviderApiKeys()
  const tokensByModel = useMemo(
    () =>
      providerLogs?.reduce(
        (acc, log) => {
          acc[log.model!] = (acc[log.model!] ?? 0) + log.tokens
          return acc
        },
        {} as Record<string, number>,
      ) ?? {},
    [providerLogs],
  )

  const costByModel = useMemo(
    () =>
      providerLogs?.reduce(
        (acc, log) => {
          const key = String(log.providerId)
          acc[key] = (acc[key] ?? 0) + log.costInMillicents
          return acc
        },
        {} as Record<string, number>,
      ) ?? {},
    [providerLogs],
  )

  return (
    <>
      <MetadataItem
        label='Timestamp'
        value={format(documentLog.createdAt, 'PPp')}
      />
      <FinishReasonItem providerLog={providerLog} />
      <MetadataItemTooltip
        label='Tokens'
        loading={providersLoading}
        trigger={
          <Text.H5 color='foregroundMuted'>{documentLog.tokens}</Text.H5>
        }
        tooltipContent={
          <div className='flex flex-col justify-between'>
            {Object.entries(tokensByModel).map(([model, tokens]) => (
              <div
                key={model}
                className='flex flex-row w-full justify-between items-center gap-4'
              >
                <Text.H6B>{model}</Text.H6B>
                <Text.H6>{tokens}</Text.H6>
              </div>
            ))}
            {Object.values(tokensByModel).some((t) => t === 0) && (
              <div className='pt-4'>
                <Text.H6 color='foregroundMuted'>
                  Note: Number of tokens is provided by your LLM Provider. Some
                  providers may return 0 tokens.
                </Text.H6>
              </div>
            )}
          </div>
        }
      />
      <MetadataItemTooltip
        label='Cost'
        loading={providersLoading}
        trigger={
          <Text.H5 color='foregroundMuted'>
            {formatCostInMillicents(documentLog.costInMillicents ?? 0)}
          </Text.H5>
        }
        tooltipContent={
          <div className='flex flex-col justify-between'>
            {Object.entries(costByModel).map(
              ([providerId, cost_in_millicents]) => (
                <div
                  key={providerId}
                  className='flex flex-row w-full justify-between items-center gap-4'
                >
                  <Text.H6B>
                    {providers?.find((p) => p.id === Number(providerId))
                      ?.name ?? 'Unknown'}
                  </Text.H6B>
                  <Text.H6>
                    {formatCostInMillicents(cost_in_millicents)}
                  </Text.H6>
                </div>
              ),
            )}
            <div className='pt-4'>
              <Text.H6 color='foregroundMuted'>
                Note: This is just an estimate based on the token usage and your
                provider's pricing. Actual cost may vary.
              </Text.H6>
            </div>
          </div>
        }
      />
      {(providerLogs?.length ?? 0) > 0 && (
        <MetadataItem
          label='Time until last message'
          value={formatDuration(
            documentLog.duration - (providerLog.duration ?? 0),
          )}
          loading={providersLoading}
        />
      )}
    </>
  )
}

export function DocumentLogMetadata({
  documentLog,
  providerLogs = [],
}: {
  documentLog: DocumentLogWithMetadataAndError
  providerLogs?: ProviderLogDto[]
}) {
  const providerLog = providerLogs[providerLogs.length - 1]
  return (
    <>
      <RunErrorMessage error={documentLog.error} />
      <MetadataItem label='Log uuid'>
        <ClickToCopy copyValue={documentLog.uuid}>
          <Text.H5 align='right' color='foregroundMuted'>
            {documentLog.uuid.split('-')[0]}
          </Text.H5>
        </ClickToCopy>
      </MetadataItem>
      <MetadataItem label='Version'>
        <ClickToCopy copyValue={documentLog.commit.uuid}>
          <Text.H5 align='right' color='foregroundMuted'>
            {documentLog.commit.uuid.split('-')[0]}
          </Text.H5>
        </ClickToCopy>
      </MetadataItem>
      <MetadataItem
        label='Duration'
        value={formatDuration(documentLog.duration)}
      />
      {providerLog ? (
        <ProviderLogsMetadata
          providerLog={providerLog}
          providerLogs={providerLogs}
          documentLog={documentLog}
        />
      ) : null}
    </>
  )
}
