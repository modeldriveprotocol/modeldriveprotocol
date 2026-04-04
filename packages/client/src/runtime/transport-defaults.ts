import type {
  AbortControllerFactory,
  FetchLike,
  FetchResponseLike
} from '../types.js'
import type {
  BinaryMessageDecoder,
  WebSocketFactory,
  WebSocketLike
} from '../transport/ws-client.js'

export const globalFetch: FetchLike = (url, init) => {
  const fetchImpl = globalThis.fetch

  if (!fetchImpl) {
    throw new Error('No fetch implementation is available in this runtime')
  }

  return fetchImpl(url, init as never) as Promise<FetchResponseLike>
}

export const globalAbortControllerFactory: AbortControllerFactory = () => {
  const AbortControllerConstructor = globalThis.AbortController

  if (!AbortControllerConstructor) {
    throw new Error('No AbortController implementation is available in this runtime')
  }

  return new AbortControllerConstructor()
}

export const globalWebSocketFactory: WebSocketFactory = (url) => {
  const WebSocketConstructor = globalThis.WebSocket

  if (!WebSocketConstructor) {
    throw new Error('No WebSocket implementation is available in this runtime')
  }

  return new WebSocketConstructor(url) as WebSocketLike
}

export const globalBinaryMessageDecoder: BinaryMessageDecoder = (data) => {
  const TextDecoderConstructor = globalThis.TextDecoder

  if (!TextDecoderConstructor) {
    throw new Error('No TextDecoder implementation is available in this runtime')
  }

  return new TextDecoderConstructor().decode(data)
}

export function createUnboundFetch(entryPoint: string): FetchLike {
  return () => {
    throw new Error(
      `No fetch implementation is bound for ${entryPoint}. `
      + 'Provide defaultTransport.fetch.fetch or HttpLoopClientTransport options.fetch.'
    )
  }
}

export function createUnboundAbortControllerFactory(
  entryPoint: string
): AbortControllerFactory {
  return () => {
    throw new Error(
      `No AbortController implementation is bound for ${entryPoint}. `
      + 'Provide defaultTransport.fetch.abortControllerFactory or '
      + 'HttpLoopClientTransport options.abortControllerFactory.'
    )
  }
}

export function createUnboundWebSocketFactory(entryPoint: string): WebSocketFactory {
  return () => {
    throw new Error(
      `No WebSocket implementation is bound for ${entryPoint}. `
      + 'Provide defaultTransport.webSocket or WebSocketClientTransport options.'
    )
  }
}

export function createUnboundBinaryMessageDecoder(
  entryPoint: string
): BinaryMessageDecoder {
  return () => {
    throw new Error(
      `No binary websocket message decoder is bound for ${entryPoint}. `
      + 'Provide defaultTransport.webSocket.binaryMessageDecoder or '
      + 'WebSocketClientTransport options.binaryMessageDecoder.'
    )
  }
}
