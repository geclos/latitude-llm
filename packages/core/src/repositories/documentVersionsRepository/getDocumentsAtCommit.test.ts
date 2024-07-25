import { HEAD_COMMIT } from '$core/constants'
import { Commit, DocumentVersion, Project } from '$core/schema'
import { mergeCommit, updateDocument } from '$core/services'
import * as factories from '$core/tests/factories'
import { beforeAll, describe, expect, it } from 'vitest'

import { CommitsRepository } from '../commitsRepository'
import { DocumentVersionsRepository } from './index'

let documentsByContent: Record<
  string,
  {
    project: Project
    commit: Commit
    document: DocumentVersion
    documentsScope: DocumentVersionsRepository
  }
> = {}

describe('getDocumentsAtCommit', () => {
  it('returns the document of the only commit', async (ctx) => {
    const {
      project,
      commit,
      documents: allDocs,
    } = await ctx.factories.createProject({
      documents: { doc1: 'Doc 1' },
    })

    const documentsScope = new DocumentVersionsRepository(project.workspaceId)
    const result = await documentsScope.getDocumentsAtCommit({ commit })
    const documents = result.unwrap()

    expect(documents.length).toBe(1)
    expect(documents[0]!.documentUuid).toBe(allDocs[0]!.documentUuid)
  })

  it('get docs from HEAD', async (ctx) => {
    const { project, documents } = await ctx.factories.createProject({
      documents: { doc1: 'Doc 1', doc2: 'Doc 2' },
    })
    const documentsScope = new DocumentVersionsRepository(project.workspaceId)
    const { commit: draft } = await factories.createDraft({ project })
    await factories.markAsSoftDelete(
      documents.find((d) => d.path === 'doc2')!.documentUuid,
    )
    const filteredDocs = await documentsScope
      .getDocumentsAtCommit({ commit: draft })
      .then((r) => r.unwrap())
    const contents = filteredDocs.map((d) => d.content)
    expect(contents).toEqual(['Doc 1'])
  })

  describe('documents for each commit', () => {
    beforeAll(async () => {
      const { project } = await factories.createProject()
      const documentsScope = new DocumentVersionsRepository(project.workspaceId)
      const { commit: commit1 } = await factories.createDraft({ project })
      const { commit: commit2 } = await factories.createDraft({ project })
      const { commit: commit3 } = await factories.createDraft({ project })

      // Initial document
      const { documentVersion: doc1 } = await factories.createDocumentVersion({
        commit: commit1,
        content: 'VERSION_1',
      })
      await mergeCommit(commit1).then((r) => r.unwrap())

      // Version 2 is merged
      const doc2 = await updateDocument({
        commit: commit2,
        document: doc1!,
        content: 'VERSION_2',
      }).then((r) => r.unwrap())
      await mergeCommit(commit2).then((r) => r.unwrap())

      // A new draft is created
      const doc3 = await updateDocument({
        commit: commit3,
        document: doc1!,
        content: 'VERSION_3_draft',
      }).then((r) => r.unwrap())

      documentsByContent = {
        VERSION_1: { project, document: doc1, commit: commit1, documentsScope },
        VERSION_2: { project, document: doc2, commit: commit2, documentsScope },
        VERSION_3_draft: {
          project,
          document: doc3,
          commit: commit3,
          documentsScope,
        },
      }
    })

    it('get docs from version 1', async () => {
      const { project, commit } = documentsByContent.VERSION_1!
      const documentsScope = new DocumentVersionsRepository(project.workspaceId)
      const documents = await documentsScope
        .getDocumentsAtCommit({ commit })
        .then((r) => r.unwrap())

      expect(documents.length).toBe(1)
      expect(documents[0]!.content).toBe('VERSION_1')
    })

    it('get docs from version 2', async () => {
      const { project, commit } = documentsByContent.VERSION_2!
      const documentsScope = new DocumentVersionsRepository(project.workspaceId)
      const documents = await documentsScope
        .getDocumentsAtCommit({ commit })
        .then((r) => r.unwrap())

      expect(documents.length).toBe(1)
      expect(documents[0]!.content).toBe('VERSION_2')
    })

    it('get docs from version 3', async () => {
      const { project, commit } = documentsByContent.VERSION_3_draft!
      const documentsScope = new DocumentVersionsRepository(project.workspaceId)
      const documents = await documentsScope
        .getDocumentsAtCommit({ commit })
        .then((r) => r.unwrap())

      expect(documents.length).toBe(1)
      expect(documents[0]!.content).toBe('VERSION_3_draft')
    })

    it('get docs from HEAD', async () => {
      const { project } = documentsByContent.VERSION_1!
      const commitsScope = new CommitsRepository(project.workspaceId)
      const documentsScope = new DocumentVersionsRepository(project.workspaceId)
      const commit = await commitsScope
        .getCommitByUuid({
          project,
          uuid: HEAD_COMMIT,
        })
        .then((r) => r.unwrap())
      const documents = await documentsScope
        .getDocumentsAtCommit({ commit })
        .then((r) => r.unwrap())

      expect(documents.length).toBe(1)
      expect(documents[0]!.content).toBe('VERSION_2')
    })
  })

  describe('documents from previous commits', () => {
    beforeAll(async () => {
      const { project } = await factories.createProject()
      const documentsScope = new DocumentVersionsRepository(project.workspaceId)

      // Doc 1
      const { commit: commit1 } = await factories.createDraft({ project })
      const { documentVersion: doc1 } = await factories.createDocumentVersion({
        commit: commit1,
        content: 'Doc_1_commit_1',
      })
      const mergedCommit1 = await mergeCommit(commit1).then((r) => r.unwrap())

      // Doc 2
      const { commit: commit2 } = await factories.createDraft({ project })
      const { documentVersion: doc2 } = await factories.createDocumentVersion({
        commit: commit2,
        content: 'Doc_2_commit_2',
      })
      const mergedCommit2 = await mergeCommit(commit2).then((r) => r.unwrap())

      // Doc 3
      const { commit: commit3 } = await factories.createDraft({ project })
      const doc3 = await updateDocument({
        commit: commit3,
        document: doc2,
        content: 'Doc_2_commit_3_draft',
      }).then((r) => r.unwrap())

      documentsByContent = {
        commit1: {
          project,
          document: doc1,
          commit: mergedCommit1,
          documentsScope,
        },
        commit2: {
          project,
          document: doc2,
          commit: mergedCommit2,
          documentsScope,
        },
        commit3: { project, document: doc3, commit: commit3, documentsScope },
      }
    })

    it('get docs from commit 1', async () => {
      const { commit, documentsScope } = documentsByContent.commit1!
      const documents = await documentsScope
        .getDocumentsAtCommit({ commit })
        .then((r) => r.unwrap())

      const contents = documents.map((d) => d.content)
      expect(contents).toEqual(['Doc_1_commit_1'])
    })

    it('get docs from commit 2', async () => {
      const { documentsScope, commit } = documentsByContent.commit2!
      const documents = await documentsScope
        .getDocumentsAtCommit({ commit })
        .then((r) => r.unwrap())

      const contents = documents.map((d) => d.content).sort()
      expect(contents).toEqual(['Doc_1_commit_1', 'Doc_2_commit_2'])
    })

    it('get docs from commit 3', async () => {
      const { documentsScope, commit } = documentsByContent.commit3!
      const documents = await documentsScope
        .getDocumentsAtCommit({ commit })
        .then((r) => r.unwrap())

      const contents = documents.map((d) => d.content).sort()
      expect(contents).toEqual(['Doc_1_commit_1', 'Doc_2_commit_3_draft'])
    })

    it('get docs from HEAD', async () => {
      const { project, documentsScope } = documentsByContent.commit1!
      const commitsScope = new CommitsRepository(project.workspaceId)
      const commit = await commitsScope
        .getCommitByUuid({
          project: project,
          uuid: HEAD_COMMIT,
        })
        .then((r) => r.unwrap())
      const documents = await documentsScope
        .getDocumentsAtCommit({ commit })
        .then((r) => r.unwrap())

      const contents = documents.map((d) => d.content).sort()
      expect(contents).toEqual(['Doc_1_commit_1', 'Doc_2_commit_2'])
    })
  })
})
