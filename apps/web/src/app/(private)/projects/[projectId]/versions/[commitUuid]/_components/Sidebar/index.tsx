import {
  Commit,
  CommitStatus,
  DocumentVersion,
  Project,
} from '@latitude-data/core/browser'
import { paginateQuery } from '@latitude-data/core/lib/index'
import { CommitsRepository } from '@latitude-data/core/repositories/index'
import { DocumentSidebar } from '@latitude-data/web-ui'
import { getDocumentsAtCommitCached } from '$/app/(private)/_data-access'
import { ULTRA_LARGE_PAGE_SIZE } from '$/app/api/projects/[projectId]/commits/route'
import { getCurrentUser } from '$/services/auth/getCurrentUser'

import ClientFilesTree from './ClientFilesTree'
import CommitSelector from './CommitSelector'

export default async function Sidebar({
  project,
  commit,
  currentDocument,
}: {
  project: Project
  commit: Commit
  currentDocument?: DocumentVersion
}) {
  const { workspace } = await getCurrentUser()
  const documents = await getDocumentsAtCommitCached({ commit })

  const commitsScope = new CommitsRepository(workspace.id)
  const { rows } = await paginateQuery({
    dynamicQuery: commitsScope
      .getCommitsByProjectQuery({
        project,
        filterByStatus: CommitStatus.Draft,
      })
      .$dynamic(),
    defaultPaginate: {
      pageSize: ULTRA_LARGE_PAGE_SIZE,
    },
  })

  const headCommitResult = await commitsScope.getHeadCommit(project.id)
  const headCommit = headCommitResult.value

  return (
    <DocumentSidebar
      header={
        <CommitSelector
          headCommit={headCommit}
          currentCommit={commit}
          currentDocument={currentDocument}
          draftCommits={rows}
        />
      }
      tree={
        <ClientFilesTree
          currentDocument={currentDocument}
          documents={documents}
        />
      }
    />
  )
}
