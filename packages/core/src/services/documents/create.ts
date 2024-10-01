import { eq } from 'drizzle-orm'

import {
  findFirstModelForProvider,
  User,
  Workspace,
  type Commit,
  type DocumentVersion,
} from '../../browser'
import { database } from '../../client'
import { publisher } from '../../events/publisher'
import { Result, Transaction, TypedResult } from '../../lib'
import { BadRequestError } from '../../lib/errors'
import {
  DocumentVersionsRepository,
  ProviderApiKeysRepository,
} from '../../repositories'
import { documentVersions } from '../../schema'

export async function createNewDocument(
  {
    workspace,
    user,
    commit,
    path,
    content,
  }: {
    workspace: Workspace
    user: User
    commit: Commit
    path: string
    content?: string
  },
  db = database,
): Promise<TypedResult<DocumentVersion, Error>> {
  return await Transaction.call(async (tx) => {
    if (commit.mergedAt !== null) {
      return Result.error(new BadRequestError('Cannot modify a merged commit'))
    }

    const docsScope = new DocumentVersionsRepository(workspace!.id, tx)

    const currentDocs = await docsScope
      .getDocumentsAtCommit(commit)
      .then((r) => r.unwrap())

    if (currentDocs.find((d) => d.path === path)) {
      return Result.error(
        new BadRequestError('A document with the same path already exists'),
      )
    }

    const providerScope = new ProviderApiKeysRepository(workspace!.id, tx)
    const provider = await providerScope.findFirst().then((r) => r.unwrap())
    const newDoc = await tx
      .insert(documentVersions)
      .values({
        commitId: commit.id,
        path,
        content:
          content ??
          (provider
            ? `
---
provider: ${provider.name}
model: ${findFirstModelForProvider(provider.provider)}
---
        `.trim()
            : ''),
      })
      .returning()

    // Invalidate all resolvedContent for this commit
    await tx
      .update(documentVersions)
      .set({ resolvedContent: null })
      .where(eq(documentVersions.commitId, commit.id))

    publisher.publishLater({
      type: 'documentCreated',
      data: {
        document: newDoc[0]!,
        workspaceId: workspace.id,
        userEmail: user.email,
      },
    })

    return Result.ok(newDoc[0]!)
  }, db)
}
