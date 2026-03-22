import type { BrowserScriptClientAttributes } from '../types.js'

import { createMdpClient, resolveServerUrl } from '../mdp-client.js'
import type { MdpClient } from '../mdp-client.js'

const SCRIPT_ATTRIBUTE_PREFIX = 'attr-mdp-'

export function createClientFromScriptTag(
  script: HTMLScriptElement = getCurrentScript()
): MdpClient {
  const attributes = readScriptAttributes(script)

  return createMdpClient({
    serverUrl: resolveServerUrl(attributes),
    client: {
      id: attributes.clientId ?? `mdp-client-${Math.random().toString(36).slice(2, 10)}`,
      name: attributes.clientName ?? 'MDP Browser Client',
      ...(attributes.clientDescription
        ? { description: attributes.clientDescription }
        : {}),
      platform: 'web'
    }
  })
}

function getCurrentScript(): HTMLScriptElement {
  const script = document.currentScript

  if (!(script instanceof HTMLScriptElement)) {
    throw new Error('Unable to resolve the current <script> element')
  }

  return script
}

function readScriptAttributes(script: HTMLScriptElement): BrowserScriptClientAttributes {
  const serverPortValue = script.getAttribute(`${SCRIPT_ATTRIBUTE_PREFIX}server-port`)

  return {
    ...(script.getAttribute(`${SCRIPT_ATTRIBUTE_PREFIX}server-url`)
      ? {
        serverUrl: script.getAttribute(`${SCRIPT_ATTRIBUTE_PREFIX}server-url`) as string
      }
      : {}),
    ...(script.getAttribute(`${SCRIPT_ATTRIBUTE_PREFIX}server-host`)
      ? {
        serverHost: script.getAttribute(`${SCRIPT_ATTRIBUTE_PREFIX}server-host`) as string
      }
      : {}),
    ...(serverPortValue ? { serverPort: Number(serverPortValue) } : {}),
    ...(script.getAttribute(`${SCRIPT_ATTRIBUTE_PREFIX}server-protocol`)
      ? {
        serverProtocol: script.getAttribute(
          `${SCRIPT_ATTRIBUTE_PREFIX}server-protocol`
        ) as 'ws' | 'wss' | 'http' | 'https'
      }
      : {}),
    ...(script.getAttribute(`${SCRIPT_ATTRIBUTE_PREFIX}client-id`)
      ? {
        clientId: script.getAttribute(`${SCRIPT_ATTRIBUTE_PREFIX}client-id`) as string
      }
      : {}),
    ...(script.getAttribute(`${SCRIPT_ATTRIBUTE_PREFIX}client-name`)
      ? {
        clientName: script.getAttribute(
          `${SCRIPT_ATTRIBUTE_PREFIX}client-name`
        ) as string
      }
      : {}),
    ...(script.getAttribute(`${SCRIPT_ATTRIBUTE_PREFIX}client-description`)
      ? {
        clientDescription: script.getAttribute(
          `${SCRIPT_ATTRIBUTE_PREFIX}client-description`
        ) as string
      }
      : {})
  }
}
