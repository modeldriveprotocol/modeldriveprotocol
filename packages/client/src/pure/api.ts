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
  createUnboundAbortControllerFactory,
  createUnboundBinaryMessageDecoder,
  createUnboundFetch,
  createUnboundWebSocketFactory
} from '../runtime/transport-defaults.js'
import type { MdpClientOptions } from '../types.js'
import {
  WebSocketClientTransport as BaseWebSocketClientTransport,
  type WebSocketClientTransportOptions
} from '../transport/ws-client.js'

const PURE_ENTRY_POINT = '@modeldriveprotocol/client/pure'

const pureFetch = createUnboundFetch(PURE_ENTRY_POINT)
const pureAbortControllerFactory = createUnboundAbortControllerFactory(PURE_ENTRY_POINT)
const pureBinaryMessageDecoder = createUnboundBinaryMessageDecoder(PURE_ENTRY_POINT)
const pureWebSocketFactory = createUnboundWebSocketFactory(PURE_ENTRY_POINT)

const pureDefaultTransportOptions = {
  webSocket: {
    webSocketFactory: pureWebSocketFactory,
    binaryMessageDecoder: pureBinaryMessageDecoder
  },
  fetch: {
    fetch: pureFetch,
    abortControllerFactory: pureAbortControllerFactory
  }
} satisfies NonNullable<MdpClientOptions['defaultTransport']>

export class MdpClient extends BaseMdpClient {
  constructor(options: MdpClientOptions) {
    super(withDefaultTransportOptions(options, pureDefaultTransportOptions))
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
        webSocketFactory: pureWebSocketFactory,
        binaryMessageDecoder: pureBinaryMessageDecoder
      },
      options
    ))
  }
}

export class HttpLoopClientTransport extends BaseHttpLoopClientTransport {
  constructor(serverUrl: string, options: HttpLoopClientTransportOptions = {}) {
    super(serverUrl, mergeHttpLoopTransportOptions(
      {
        fetch: pureFetch,
        abortControllerFactory: pureAbortControllerFactory
      },
      options
    ))
  }
}
