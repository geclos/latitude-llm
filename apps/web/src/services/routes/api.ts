export const _API_ROUTES = {
  workspaces: {
    usage: '/api/workspaces/usage',
  },
  apiKeys: {
    root: '/api/apiKeys',
  },
  providerApiKeys: {
    root: '/api/providerApiKeys',
  },
  claimedRewards: {
    root: '/api/claimedRewards',
  },
  providerLogs: {
    root: '/api/providerLogs',
  },
  users: {
    root: '/api/users',
  },
  projects: {
    root: '/api/projects',
    detail: (id: number) => ({
      forImport: {
        root: `/api/projects/${id}/documents-for-import`,
      },
      commits: {
        root: `/api/projects/${id}/commits`,
        detail: (commitUuid: string) => ({
          root: `/api/projects/${id}/commits/${commitUuid}`,
          documents: {
            root: `/api/projects/${id}/commits/${commitUuid}/documents`,
            detail: (documentUuid: string) => {
              const documentRoot = `/api/projects/${id}/commits/${commitUuid}/documents/${documentUuid}`
              return {
                root: documentRoot,
                documentLogs: {
                  root: `${documentRoot}/documentLogs`,
                },
                evaluations: {
                  root: `${documentRoot}/evaluations`,
                  detail: ({ evaluationId }: { evaluationId: number }) => ({
                    root: `${documentRoot}/evaluations/${evaluationId}`,
                    evaluationResults: {
                      root: `${documentRoot}/evaluations/${evaluationId}/evaluation-results`,
                      pagination: `${documentRoot}/evaluations/${evaluationId}/evaluation-results/pagination`,
                      counters: `${documentRoot}/evaluations/${evaluationId}/evaluation-results/counters`,
                      mean: `${documentRoot}/evaluations/${evaluationId}/evaluation-results/mean`,
                      modal: `${documentRoot}/evaluations/${evaluationId}/evaluation-results/modal`,
                      average: `${documentRoot}/evaluations/${evaluationId}/evaluation-results/average`,
                      averageAndCost: `${documentRoot}/evaluations/${evaluationId}/evaluation-results/average-and-cost`,
                    },
                  }),
                },
                evaluationResultsByDocumentContent: {
                  detail: ({ evaluationId }: { evaluationId: number }) => ({
                    root: `${documentRoot}/evaluation-results-by-document-content/${evaluationId}`,
                  }),
                },
              }
            },
          },
        }),
      },
    }),
  },
  datasets: {
    root: '/api/datasets',
    detail: (id: number) => ({
      preview: {
        root: `/api/datasets/${id}/preview`,
      },
    }),
  },
  evaluationTemplates: {
    root: '/api/evaluationTemplates',
  },
  documentLogs: {
    detail: ({ id }: { id: number }) => ({
      root: `/api/documentLogs/${id}`,
    }),
    uuids: {
      detail: ({ uuid }: { uuid: string }) => ({
        root: `/api/documentLogs/uuids/${uuid}`,
      }),
    },
  },
  evaluations: {
    root: '/api/evaluations',
    detail: (id: number) => ({
      root: `/api/evaluations/${id}`,
      connectedDocuments: {
        root: `/api/evaluations/${id}/connected-documents`,
      },
    }),
  },
}
