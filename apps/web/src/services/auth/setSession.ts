import { type TokenType } from '@latitude-data/core/websockets/constants'
import { generateWebsocketToken } from '@latitude-data/core/websockets/utils'
import { cookies } from 'next/headers'

import { lucia } from '.'
import { SessionData } from './getCurrentUser'

type PartialSession = Omit<SessionData, 'session'>
export async function setWebsocketSessionCookie({
  name,
  sessionData,
}: {
  name: TokenType
  sessionData: PartialSession
}) {
  const { token, cookiesOptions } = await generateWebsocketToken({
    name,
    payload: {
      userId: sessionData.user.id,
      workspaceId: sessionData.workspace.id,
    },
  })
  cookies().set(name, token, {
    ...cookiesOptions,
    httpOnly: true,
    sameSite: 'lax',
  })
}

export async function setSession({
  sessionData: { workspace, user },
}: {
  sessionData: PartialSession
}) {
  const session = await lucia.createSession(user.id, {
    currentWorkspaceId: workspace.id,
  })
  const sessionCookie = lucia.createSessionCookie(session.id)

  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes,
  )

  setWebsocketSessionCookie({
    name: 'websocket',
    sessionData: { user, workspace },
  })
  setWebsocketSessionCookie({
    name: 'websocketRefresh',
    sessionData: { user, workspace },
  })
}
