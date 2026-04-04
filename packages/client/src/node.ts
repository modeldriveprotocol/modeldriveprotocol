import NodeWebSocket from 'ws'

import {
  HttpLoopClientTransport as BaseHttpLoopClientTransport,
  type HttpLoopClientTransportOptions
} from './transport/http-loop-client.js'
import { MdpClient as BaseMdpClient, resolveServerUrl } from './mdp-client.js'
import {
  mergeHttpLoopTransportOptions,
  mergeWebSocketTransportOptions,
  withDefaultTransportOptions
} from './runtime/default-transport-binding.js'
import {
  globalAbortControllerFactory,
  globalBinaryMessageDecoder,
  globalFetch
} from './runtime/transport-defaults.js'
import type { MdpClientOptions } from './types.js'
import {
  WebSocketClientTransport as BaseWebSocketClientTransport,
  type WebSocketClassLike,
  type WebSocketClientTransportOptions
} from './transport/ws-client.js'

const nodeWebSocketClass = NodeWebSocket as unknown as WebSocketClassLike

const nodeDefaultTransportOptions = {
  webSocket: {
    webSocketClass: nodeWebSocketClass,
    binaryMessageDecoder: globalBinaryMessageDecoder
  },
  fetch: {
    fetch: globalFetch,
    abortControllerFactory: globalAbortControllerFactory
  }
} satisfies NonNullable<MdpClientOptions['defaultTransport']>

export class MdpClient extends BaseMdpClient {
  constructor(options: MdpClientOptions) {
    super(withDefaultTransportOptions(options, nodeDefaultTransportOptions))
  }
}

export function createMdpClient(options: MdpClientOptions): MdpClient {
  return new MdpClient(options)
}

export { resolveServerUrl }
export class WebSocketClientTransport extends BaseWebSocketClientTransport {
  constructor(serverUrl: string, options: WebSocketClientTransportOptions = {}) {
    super(serverUrl, mergeWebSocketTransportOptions(
      {
        webSocketClass: nodeWebSocketClass,
        binaryMessageDecoder: globalBinaryMessageDecoder
      },
      options
    ))
  }
}

export class HttpLoopClientTransport extends BaseHttpLoopClientTransport {
  constructor(serverUrl: string, options: HttpLoopClientTransportOptions = {}) {
    super(serverUrl, mergeHttpLoopTransportOptions(
      {
        fetch: globalFetch,
        abortControllerFactory: globalAbortControllerFactory
      },
      options
    ))
  }
}

export * from './procedure-registry.js'
export * from './types.js'
export type { HttpLoopClientTransportOptions } from './http-loop-client.js'
export type {
  BinaryMessageDecoder,
  WebSocketClassLike,
  WebSocketClientTransportOptions,
  WebSocketCloseEventLike,
  WebSocketEventLike,
  WebSocketFactory,
  WebSocketLike,
  WebSocketMessageEventLike
} from './ws-client.js'
