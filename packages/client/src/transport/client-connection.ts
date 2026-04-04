import { HttpLoopClientTransport } from './http-loop-client.js'
import type {
  BrowserScriptClientAttributes,
  ClientTransport,
  DefaultClientTransportOptions
} from '../types.js'
import { getUrlProtocol } from '../runtime/url-utils.js'
import { WebSocketClientTransport } from './ws-client.js'

export function createDefaultTransport(
  serverUrl: string,
  options: DefaultClientTransportOptions = {}
): ClientTransport {
  const protocol = getUrlProtocol(serverUrl)

  switch (protocol) {
    case 'ws:':
    case 'wss:':
      return new WebSocketClientTransport(serverUrl, options.webSocket ?? {})
    case 'http:':
    case 'https:':
      return new HttpLoopClientTransport(serverUrl, options.fetch ?? {})
    default:
      throw new Error(`Unsupported MDP transport protocol: ${protocol}`)
  }
}

export function resolveServerUrl(attributes: BrowserScriptClientAttributes): string {
  if (attributes.serverUrl) {
    return attributes.serverUrl
  }

  const protocol = attributes.serverProtocol ?? 'ws'
  const host = attributes.serverHost ?? '127.0.0.1'
  const port = attributes.serverPort ?? 47372

  return `${protocol}://${host}:${port}`
}
