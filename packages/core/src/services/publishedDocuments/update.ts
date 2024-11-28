import { eq } from 'drizzle-orm'

import { PublishedDocument } from '../../browser'
import { database } from '../../client'
import { Result, Transaction } from '../../lib'
import { publishedDocuments } from '../../schema'

type UpdatablePublishedDocument = Pick<
  PublishedDocument,
  'isPublished' | 'canFollowConversation' | 'title' | 'description'
>
export async function updatePublishedDocument(
  {
    publishedDocument,
    data,
  }: {
    publishedDocument: PublishedDocument
    data: Partial<UpdatablePublishedDocument>
  },
  db = database,
) {
  return await Transaction.call<PublishedDocument>(async (trx) => {
    const inserts = await trx
      .update(publishedDocuments)
      .set(data)
      .where(eq(publishedDocuments.uuid, publishedDocument.uuid!))
      .returning()

    return Result.ok(inserts[0]!)
  }, db)
}