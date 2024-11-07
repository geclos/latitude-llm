import { Conversation, ConversationMetadata } from '$compiler/types'
import { z } from 'zod'

import { Chain } from './chain'
import {
  ReadMetadata,
  type Document,
  type ReferencePromptFn,
} from './readMetadata'

export async function render({
  prompt,
  parameters = {},
}: {
  prompt: string
  parameters?: Record<string, unknown>
}): Promise<Conversation> {
  const iterator = new Chain({ prompt, parameters })
  const { conversation, completed } = await iterator.step()
  if (!completed) {
    throw new Error('Use a Chain to render prompts with multiple steps')
  }
  return conversation
}

export function createChain({
  prompt,
  parameters,
}: {
  prompt: string
  parameters: Record<string, unknown>
}): Chain {
  return new Chain({ prompt, parameters })
}

export function readMetadata({
  prompt,
  fullPath,
  referenceFn,
  withParameters,
  configSchema,
}: {
  prompt: string
  fullPath?: string
  referenceFn?: ReferencePromptFn
  withParameters?: string[]
  configSchema?: z.ZodType
}): Promise<ConversationMetadata> {
  return new ReadMetadata({
    document: { path: fullPath ?? '', content: prompt },
    referenceFn,
    withParameters,
    configSchema,
  }).run()
}

export { Chain, type Document, type ReferencePromptFn }
