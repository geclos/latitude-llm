import { ReactNode } from 'react'

import { cn, Skeleton, Text } from '@latitude-data/web-ui'

export function ChartWrapper({
  label,
  loading,
  error,
  children,
}: {
  label?: string
  loading?: boolean
  error?: Error
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'h-[192px] min-w-[300px] flex-1 rounded-lg flex flex-col gap-2 p-2 overflow-hidden border',
        {
          'border-border': !error,
          'border-destructive': !!error,
          'bg-destructive/50': !!error,
        },
      )}
    >
      {label && (
        <Text.H5 color={error ? 'destructiveForeground' : 'foregroundMuted'}>
          {label}
        </Text.H5>
      )}

      {loading && <Skeleton className='h-full w-full bg-muted animate-pulse' />}
      {error && (
        <>
          <Text.H5B color='destructiveForeground'>{error.name}</Text.H5B>
          <Text.H6 color='destructiveForeground'>{error.message}</Text.H6>
        </>
      )}

      {!loading && !error && children}
    </div>
  )
}

export function NoData() {
  return (
    <div className='flex w-full h-full items-center justify-center'>
      <Text.H6 color='foregroundMuted'>No data</Text.H6>
    </div>
  )
}
