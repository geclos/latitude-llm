import { ToolCall } from '@latitude-data/compiler'
import { CompletionTokenUsage } from 'ai'

import {
  LogSources,
  MagicLinkToken,
  Membership,
  Message,
  Providers,
  User,
} from '../../browser'
import { PartialConfig } from '../../services/ai'
import { createProviderLogJob } from './createProviderLogJob'
import { sendInvitationToUserJob } from './sendInvitationToUser'
import { sendMagicLinkJob } from './sendMagicLinkHandler'

type LatitudeEventGeneric<
  U extends keyof typeof EventHandlers,
  T extends Record<string, unknown>,
> = {
  type: U
  data: T
}

export type EventHandler<E extends LatitudeEvent> = ({
  data,
}: {
  data: E
}) => void

export type AIProviderCallCompleted = LatitudeEventGeneric<
  'aiProviderCallCompleted',
  {
    uuid: string
    source: LogSources
    generatedAt: Date
    documentLogUuid?: string
    providerId: number
    providerType: Providers
    model: string
    config: PartialConfig
    messages: Message[]
    responseText: string
    toolCalls?: ToolCall[]
    usage: CompletionTokenUsage
    duration: number
  }
>
export type MagicLinkTokenCreated = LatitudeEventGeneric<
  'magicLinkTokenCreated',
  MagicLinkToken
>
export type UserCreatedEvent = LatitudeEventGeneric<'userCreated', User>
export type MembershipCreatedEvent = LatitudeEventGeneric<
  'membershipCreated',
  Membership & { authorId?: string }
>

export type LatitudeEvent =
  | MembershipCreatedEvent
  | UserCreatedEvent
  | MagicLinkTokenCreated
  | AIProviderCallCompleted

export interface IEventsHandlers {
  aiProviderCallCompleted: EventHandler<AIProviderCallCompleted>[]
  magicLinkTokenCreated: EventHandler<MagicLinkTokenCreated>[]
  membershipCreated: EventHandler<MembershipCreatedEvent>[]
  userCreated: EventHandler<UserCreatedEvent>[]
}

export const EventHandlers: IEventsHandlers = {
  magicLinkTokenCreated: [sendMagicLinkJob],
  membershipCreated: [sendInvitationToUserJob],
  userCreated: [],
  aiProviderCallCompleted: [createProviderLogJob],
} as const
