import type {
  MdpClientOptions,
  DefaultClientTransportOptions
} from '../types.js'
import type { HttpLoopClientTransportOptions } from '../transport/http-loop-client.js'
import type { WebSocketClientTransportOptions } from '../transport/ws-client.js'

export function withDefaultTransportOptions(
  options: MdpClientOptions,
  defaults: DefaultClientTransportOptions
): MdpClientOptions {
  return {
    ...options,
    defaultTransport: mergeDefaultTransportOptions(defaults, options.defaultTransport)
  }
}

export function withWebSocketBinding(
  options: MdpClientOptions,
  binding: WebSocketClientTransportOptions
): MdpClientOptions {
  return withDefaultTransportOptions(options, {
    webSocket: binding
  })
}

export function mergeWebSocketTransportOptions(
  defaults: WebSocketClientTransportOptions,
  overrides: WebSocketClientTransportOptions | undefined
): WebSocketClientTransportOptions {
  const merged: WebSocketClientTransportOptions = {
    ...defaults,
    ...(overrides ?? {})
  }

  if (overrides?.webSocketFactory) {
    delete merged.webSocketClass
  } else if (overrides?.webSocketClass) {
    delete merged.webSocketFactory
  }

  return merged
}

export function mergeHttpLoopTransportOptions(
  defaults: HttpLoopClientTransportOptions,
  overrides: HttpLoopClientTransportOptions | undefined
): HttpLoopClientTransportOptions {
  return {
    ...defaults,
    ...(overrides ?? {})
  }
}

function mergeDefaultTransportOptions(
  defaults: DefaultClientTransportOptions,
  overrides: DefaultClientTransportOptions | undefined
): DefaultClientTransportOptions {
  const webSocket = mergeWebSocketOptions(defaults.webSocket, overrides?.webSocket)
  const fetch = mergeFetchOptions(defaults.fetch, overrides?.fetch)

  return {
    ...defaults,
    ...(overrides ?? {}),
    ...(webSocket ? { webSocket } : {}),
    ...(fetch ? { fetch } : {})
  }
}

function mergeWebSocketOptions(
  defaults: WebSocketClientTransportOptions | undefined,
  overrides: WebSocketClientTransportOptions | undefined
): WebSocketClientTransportOptions | undefined {
  if (!defaults && !overrides) {
    return undefined
  }

  return mergeWebSocketTransportOptions(defaults ?? {}, overrides)
}

function mergeFetchOptions(
  defaults: Pick<HttpLoopClientTransportOptions, 'fetch' | 'abortControllerFactory'> | undefined,
  overrides: Pick<HttpLoopClientTransportOptions, 'fetch' | 'abortControllerFactory'> | undefined
): Pick<HttpLoopClientTransportOptions, 'fetch' | 'abortControllerFactory'> | undefined {
  if (!defaults && !overrides) {
    return undefined
  }

  return mergeHttpLoopTransportOptions(defaults ?? {}, overrides)
}
