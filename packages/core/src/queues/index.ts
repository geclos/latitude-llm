import { env } from '@latitude-data/env'
import Redis from 'ioredis'

import { buildRedisConnection } from '../redis'

let connection: Redis

export const queues = () => {
  if (connection) return connection

  connection = buildRedisConnection({
    host: env.QUEUE_HOST,
    port: env.QUEUE_PORT,
    password: env.QUEUE_PASSWORD,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null,
  })

  return connection
}