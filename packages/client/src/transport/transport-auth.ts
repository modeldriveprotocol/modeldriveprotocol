import type { AuthContext } from '@modeldriveprotocol/protocol'

import type { ClientTransportAuthOptions } from '../types.js'

const DEFAULT_COOKIE_AUTH_ENDPOINT = '/mdp/auth'

export async function authenticateTransport(options: {
  serverUrl: string
  serverProtocol: string
  usesDefaultTransport: boolean
  transportAuth: ClientTransportAuthOptions | undefined
  auth: AuthContext | undefined
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
        effectiveTransportAuth.auth ?? options.auth
      )
      return
  }
}

async function bootstrapCookieTransportAuth(
  serverUrl: string,
  options: Extract<ClientTransportAuthOptions, { mode: 'cookie' }>,
  auth: AuthContext | undefined
): Promise<void> {
  if (!auth) {
    throw new Error('Cookie transport auth requires an auth context')
  }

  const fetchImpl = options.fetch ?? globalThis.fetch

  if (!fetchImpl) {
    throw new Error('No fetch implementation is available in this runtime')
  }

  const response = await fetchImpl(resolveTransportAuthEndpoint(serverUrl, options.endpoint), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify({
      auth
    }),
    credentials: options.credentials ?? 'include'
  })

  if (!response.ok) {
    throw new Error(`Unable to bootstrap websocket auth for ${serverUrl}`)
  }
}

function resolveTransportAuthEndpoint(serverUrl: string, endpoint?: string): string {
  const baseUrl = new URL(serverUrl)

  if (baseUrl.protocol === 'ws:') {
    baseUrl.protocol = 'http:'
  } else if (baseUrl.protocol === 'wss:') {
    baseUrl.protocol = 'https:'
  }

  return new URL(endpoint ?? DEFAULT_COOKIE_AUTH_ENDPOINT, baseUrl).toString()
}

function isWebSocketProtocol(protocol: string): boolean {
  return protocol === 'ws:' || protocol === 'wss:'
}
