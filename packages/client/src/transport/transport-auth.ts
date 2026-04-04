import type { AuthContext } from '@modeldriveprotocol/protocol'

import type { ClientTransportAuthOptions, FetchLike, FetchResponseLike } from '../types.js'
import { globalFetch } from '../runtime/transport-defaults.js'
import {
  replaceUrlProtocol,
  resolveUrl
} from '../runtime/url-utils.js'

const DEFAULT_COOKIE_AUTH_ENDPOINT = '/mdp/auth'

export async function authenticateTransport(options: {
  serverUrl: string
  serverProtocol: string
  usesDefaultTransport: boolean
  transportAuth: ClientTransportAuthOptions | undefined
  auth: AuthContext | undefined
  defaultFetch?: FetchLike
}): Promise<void> {
  const effectiveTransportAuth = options.transportAuth ??
    (options.usesDefaultTransport &&
        options.auth &&
        isWebSocketProtocol(options.serverProtocol)
      ? ({
        mode: 'cookie'
      } satisfies ClientTransportAuthOptions)
      : undefined)

  if (!effectiveTransportAuth) {
    return
  }

  switch (effectiveTransportAuth.mode) {
    case 'cookie':
      await bootstrapCookieTransportAuth(
        options.serverUrl,
        effectiveTransportAuth,
        effectiveTransportAuth.auth ?? options.auth,
        options.defaultFetch
      )
      return
  }
}

async function bootstrapCookieTransportAuth(
  serverUrl: string,
  options: Extract<ClientTransportAuthOptions, { mode: 'cookie' }>,
  auth: AuthContext | undefined,
  defaultFetch: FetchLike | undefined
): Promise<void> {
  if (!auth) {
    throw new Error('Cookie transport auth requires an auth context')
  }

  const fetchImpl = options.fetch ?? defaultFetch ?? globalFetch

  const response = await fetchImpl(
    resolveTransportAuthEndpoint(serverUrl, options.endpoint),
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify({
        auth
      }),
      credentials: options.credentials ?? 'include'
    }
  ) as FetchResponseLike

  if (!response.ok) {
    throw new Error(`Unable to bootstrap websocket auth for ${serverUrl}`)
  }
}

function resolveTransportAuthEndpoint(serverUrl: string, endpoint?: string): string {
  const baseUrl = serverUrl.startsWith('ws://')
    ? replaceUrlProtocol(serverUrl, 'http:')
    : serverUrl.startsWith('wss://')
      ? replaceUrlProtocol(serverUrl, 'https:')
      : serverUrl

  return resolveUrl(baseUrl, endpoint ?? DEFAULT_COOKIE_AUTH_ENDPOINT)
}

function isWebSocketProtocol(protocol: string): boolean {
  return protocol === 'ws:' || protocol === 'wss:'
}
