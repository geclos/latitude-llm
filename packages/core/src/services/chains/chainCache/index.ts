import { hash } from 'crypto'
import {
  Chain as PromptlChain,
  type SerializedChain,
  Message,
} from 'promptl-ai'

import { Workspace } from '../../../browser'
import { cache } from '../../../cache'
import { ToolCall } from '@latitude-data/compiler'

type CachedChain = {
  chain: PromptlChain<Message>
  messages: Message[]
}

function generateCacheKey({
  workspace,
  documentLogUuid,
}: {
  workspace: Workspace
  documentLogUuid: string
}): string {
  const k = hash('sha256', `${documentLogUuid}`)
  return `workspace:${workspace.id}:chain:${k}`
}

async function setToCache({
  key,
  chain,
  messages,
}: {
  key: string
  chain: SerializedChain
  messages: Message[]
}) {
  try {
    const c = await cache()
    await c.set(key, JSON.stringify({ chain, messages }))
  } catch (e) {
    // Silently fail cache writes
  }
}

async function getFromCache(key: string): Promise<CachedChain | undefined> {
  try {
    const c = await cache()
    const serialized = await c.get(key)
    if (!serialized) return undefined

    const data = JSON.parse(serialized, (k, v) => {
      if (k === 'chain') return PromptlChain.deserialize(v)
      return v
    }) as CachedChain

    return { chain: data.chain, messages: data.messages }
  } catch (e) {
    return undefined
  }
}

export async function getCachedChain({
  documentLogUuid,
  workspace,
}: {
  documentLogUuid: string
  workspace: Workspace
}) {
  const key = generateCacheKey({ documentLogUuid, workspace })
  return await getFromCache(key)
}

export async function cacheChain({
  workspace,
  documentLogUuid,
  chain,
  toolCalls,
}: {
  workspace: Workspace
  chain: PromptlChain<Message>
  toolCalls: ToolCall[]
  documentLogUuid: string
}) {
  const key = generateCacheKey({ documentLogUuid, workspace })
  const serialized = chain.serialize()

  // TODO: Generate the messages from response. DRY method from what Alex did
  await setToCache({ key, chain: serialized, messages: [] })
}
