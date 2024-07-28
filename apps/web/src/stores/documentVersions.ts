'use client'

import { useCallback } from 'react'

import { DocumentVersion } from '@latitude-data/core'
import {
  SidebarDocument,
  useCurrentCommit,
  useCurrentProject,
  useToast,
} from '@latitude-data/web-ui'
import { createDocumentVersionAction } from '$/actions/documents/create'
import { destroyDocumentAction } from '$/actions/documents/destroyDocumentAction'
import { destroyFolderAction } from '$/actions/documents/destroyFolderAction'
import { getDocumentsAtCommitAction } from '$/actions/documents/getDocumentsAtCommitAction'
import { ROUTES } from '$/services/routes'
import { useRouter } from 'next/navigation'
import useSWR, { SWRConfiguration } from 'swr'
import { useServerAction } from 'zsa-react'

export default function useDocumentVersions(
  { currentDocument }: { currentDocument: SidebarDocument | undefined },
  opts?: SWRConfiguration,
) {
  const { toast } = useToast()
  const router = useRouter()
  const { project } = useCurrentProject()
  const { commit } = useCurrentCommit()
  const { execute: executeCreateDocument } = useServerAction(
    createDocumentVersionAction,
  )
  const { execute: executeDestroyDocument, isPending: isDestroyingFile } =
    useServerAction(destroyDocumentAction)
  const { execute: executeDestroyFolder, isPending: isDestroyingFolder } =
    useServerAction(destroyFolderAction)
  const {
    mutate,
    data,
    isValidating,
    isLoading,
    error: swrError,
  } = useSWR<DocumentVersion[]>(
    ['documentVersions', project.id, commit.id],
    async () => {
      const [fetchedDocuments, errorFetchingDocuments] =
        await getDocumentsAtCommitAction({
          projectId: project.id,
          commitId: commit.id,
        })

      if (errorFetchingDocuments) {
        toast({
          title: 'Error fetching sidebar documents',
          description:
            errorFetchingDocuments.formErrors?.[0] ||
            errorFetchingDocuments.message,
          variant: 'destructive',
        })
        return []
      }

      return fetchedDocuments
    },
    opts,
  )
  const createFile = useCallback(
    async ({ path }: { path: string }) => {
      const [document, error] = await executeCreateDocument({
        path,
        projectId: project.id,
        commitUuid: commit.uuid,
      })

      if (error) {
        toast({
          title: 'Error creating document',
          description: error.formErrors?.[0] || error.message,
          variant: 'destructive',
        })
      } else if (document) {
        const prevDocuments = data || []

        if (document) {
          mutate([...prevDocuments, document])
          router.push(
            ROUTES.projects
              .detail({ id: project.id })
              .commits.detail({ uuid: commit.uuid })
              .documents.detail({ uuid: document.documentUuid }).root,
          )
        }
      }
    },
    [executeCreateDocument, mutate, data],
  )

  const destroyFile = useCallback(
    async (documentUuid: string) => {
      const [_, error] = await executeDestroyDocument({
        documentUuid,
        projectId: project.id,
        commitId: commit.id,
      })
      if (error) {
        toast({
          title: 'Error deleting document',
          description: error.formErrors?.[0] || error.message,
          variant: 'destructive',
        })
      } else {
        const prevDocuments = data || []
        mutate(prevDocuments.filter((d) => d.documentUuid !== documentUuid))
        if (currentDocument?.documentUuid === documentUuid) {
          router.push(
            ROUTES.projects
              .detail({ id: project.id })
              .commits.detail({ uuid: commit.uuid }).documents.root,
          )
        }
      }
    },
    [executeDestroyDocument, mutate, data, currentDocument?.documentUuid],
  )

  const destroyFolder = useCallback(
    async (path: string) => {
      const [_, error] = await executeDestroyFolder({
        projectId: project.id,
        commitId: commit.id,
        path,
      })

      if (error) {
        toast({
          title: 'Error deleting folder',
          description: error.formErrors?.[0] || error.message,
          variant: 'destructive',
        })
      } else {
        await mutate()

        if (currentDocument?.path?.startsWith?.(`${path}/`)) {
          router.push(
            ROUTES.projects
              .detail({ id: project.id })
              .commits.detail({ uuid: commit.uuid }).documents.root,
          )
        }
      }
    },
    [executeDestroyDocument, mutate, data, currentDocument?.path],
  )

  return {
    isValidating: isValidating,
    isLoading: isLoading,
    error: swrError,
    documents: data ?? [],
    createFile,
    destroyFile,
    destroyFolder,
    isDestroying: isDestroyingFile || isDestroyingFolder,
  }
}
