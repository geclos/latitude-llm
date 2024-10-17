import type { Dataset } from '@latitude-data/core/browser'
import { useToast } from '@latitude-data/web-ui'
import { createDatasetAction } from '$/actions/datasets/create'
import { destroyDatasetAction } from '$/actions/datasets/destroy'
import useFetcher from '$/hooks/useFetcher'
import useLatitudeAction from '$/hooks/useLatitudeAction'
import { ROUTES } from '$/services/routes'
import useCurrentWorkspace from '$/stores/currentWorkspace'
import useSWR, { SWRConfiguration } from 'swr'

export default function useDatasets(
  { onCreateSuccess }: { onCreateSuccess?: (dataset: Dataset) => void } = {},
  opts?: SWRConfiguration,
) {
  const { data: workspace } = useCurrentWorkspace()
  const { toast } = useToast()
  const fetcher = useFetcher(ROUTES.api.datasets.root, {
    serializer: (rows) => rows.map(deserialize),
  })
  const {
    data = [],
    mutate,
    ...rest
  } = useSWR<Dataset[]>(['workspace', workspace.id, 'datasets'], fetcher, opts)
  const {
    isPending: isCreating,
    error: createError,
    executeFormAction: createFormAction,
  } = useLatitudeAction<typeof createDatasetAction>(createDatasetAction, {
    onSuccess: ({ data: dataset }) => {
      toast({
        title: 'Success',
        description: 'Dataset uploaded successfully! 🎉',
      })

      mutate([...data, dataset])
      onCreateSuccess?.(dataset)
    },
  })

  const { execute: destroy, isPending: isDestroying } = useLatitudeAction<
    typeof destroyDatasetAction
  >(destroyDatasetAction, {
    onSuccess: ({ data: dataset }) => {
      toast({
        title: 'Success',
        description: 'Dataset removed successfully',
      })

      mutate(data.filter((ds) => ds.id === dataset.id))
    },
  })

  return {
    data,
    mutate,
    isCreating,
    createFormAction,
    createError,
    destroy,
    isDestroying,
    ...rest,
  }
}

function deserialize(item: Dataset) {
  return {
    ...item,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }
}
