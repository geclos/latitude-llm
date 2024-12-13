import { Commit, Workspace } from '@latitude-data/core/browser'
import {
  CommitsRepository,
  DocumentVersionsRepository,
} from '@latitude-data/core/repositories'
import { authHandler } from '$/middlewares/authHandler'
import { errorHandler } from '$/middlewares/errorHandler'
import { NextRequest, NextResponse } from 'next/server'
import { documentVersionPresenter } from '@latitude-data/core/services/providerLogs/documentVersionPresenter'
import { findCommitById } from '@latitude-data/core/data-access/commits'
import { BadRequestError, NotFoundError } from '@latitude-data/core/lib/errors'

export const GET = errorHandler(
  authHandler(
    async (
      req: NextRequest,
      {
        params,
        workspace,
      }: {
        params: {
          documentUuid: string
        }
        workspace: Workspace
      },
    ) => {
      const { documentUuid } = params
      if (!documentUuid) {
        throw new BadRequestError('Document UUID is required')
      }
      const commitUuid = req.nextUrl.searchParams.get('commitUuid')

      let commit: Commit | null = null
      if (commitUuid) {
        const commitsScope = new CommitsRepository(workspace.id)
        commit = await commitsScope
          .getCommitByUuid({ uuid: commitUuid })
          .then((r) => r.unwrap())
      }

      const docsScope = new DocumentVersionsRepository(workspace.id)
      const documentVersion = await docsScope
        .getDocumentByUuid({
          documentUuid,
          commit: commit ?? undefined,
        })
        .then((r) => r.unwrap())

      commit =
        commit ||
        (await findCommitById({ id: documentVersion.commitId }).then((r) =>
          r.unwrap(),
        ))
      if (!commit) {
        throw new NotFoundError('Commit not found')
      }

      return NextResponse.json(
        documentVersionPresenter({
          documentVersion,
          commit,
        }),
      )
    },
  ),
)
