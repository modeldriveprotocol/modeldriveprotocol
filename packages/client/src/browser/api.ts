import {
  HttpLoopClientTransport as BaseHttpLoopClientTransport,
  type HttpLoopClientTransportOptions
} from '../transport/http-loop-client.js'
import { MdpClient as BaseMdpClient, resolveServerUrl } from '../mdp-client.js'
import {
  mergeHttpLoopTransportOptions,
  mergeWebSocketTransportOptions,
  withDefaultTransportOptions
} from '../runtime/default-transport-binding.js'
import {
  globalAbortControllerFactory,
  globalBinaryMessageDecoder,
  globalFetch,
  globalWebSocketFactory
} from '../runtime/transport-defaults.js'
import type { MdpClientOptions } from '../types.js'
import {
  WebSocketClientTransport as BaseWebSocketClientTransport,
  type WebSocketClientTransportOptions
} from '../transport/ws-client.js'

const browserDefaultTransportOptions = {
  webSocket: {
    webSocketFactory: globalWebSocketFactory,
    binaryMessageDecoder: globalBinaryMessageDecoder
  },
  fetch: {
    fetch: globalFetch,
    abortControllerFactory: globalAbortControllerFactory
  }
} satisfies NonNullable<MdpClientOptions['defaultTransport']>

export class MdpClient extends BaseMdpClient {
  constructor(options: MdpClientOptions) {
    super(withDefaultTransportOptions(options, browserDefaultTransportOptions))
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
        webSocketFactory: globalWebSocketFactory,
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
