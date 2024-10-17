import { Queues, QUEUES } from '@latitude-data/core/jobs/constants'
import * as jobs from '@latitude-data/core/jobs/definitions'
import { NotFoundError } from '@latitude-data/core/lib/errors'
import { captureException } from '$/utils/sentry'
import { Processor } from 'bullmq'

export const buildProcessor =
  (queues: Queues[]): Processor =>
  async (job) => {
    await Promise.all(
      queues.map(async (q) => {
        await Promise.all(
          QUEUES[q].jobs.map(async (j) => {
            if (j === job.name) {
              // TODO: cheating a bit here, we should have a better way to do this
              const jobFn = (jobs as unknown as Record<string, Function>)[j]
              if (jobFn) {
                try {
                  await jobFn(job)
                } catch (error) {
                  captureException(error as Error)

                  throw error
                }
              } else {
                throw new NotFoundError(`Job ${job.name} not found`)
              }
            }
          }),
        )
      }),
    )
  }
