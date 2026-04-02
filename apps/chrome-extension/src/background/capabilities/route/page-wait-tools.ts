import type { MdpClient } from '@modeldriveprotocol/client'

import type { RouteClientConfig } from '#~/shared/config.js'
import { asRecord, readNumber } from '#~/shared/utils.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { readRequestRecord, requireStringArg } from '#~/background/shared.js'

export function registerPageWaitTools(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  routeClient: RouteClientConfig
): void {
  for (const [path, commandType, description] of [
    ['/page/wait-for-text', 'waitForText', 'Wait until visible page text contains the requested string.'],
    ['/page/wait-for-selector', 'waitForSelector', 'Wait until the target page contains a matching DOM element.'],
    ['/page/wait-for-visible', 'waitForVisible', 'Wait until a matching DOM element becomes visible.'],
    ['/page/wait-for-hidden', 'waitForHidden', 'Wait until a matching DOM element is no longer visible.']
  ] as const) {
    client.expose(
      path,
      {
        method: 'POST',
        description,
        inputSchema: {
          type: 'object',
          required: [commandType === 'waitForText' ? 'text' : 'selector'],
          properties: {
            tabId: { type: 'number' },
            selector: { type: 'string' },
            text: { type: 'string' },
            index: { type: 'number' },
            timeoutMs: { type: 'number' }
          }
        }
      },
      async (request) => {
        const args = readRequestRecord(request)
        const record = asRecord(args)
        const selector = commandType === 'waitForText' ? undefined : requireStringArg(args, 'selector')
        const text = commandType === 'waitForText' ? requireStringArg(args, 'text') : undefined
        const index = commandType === 'waitForVisible' ? readNumber(record, 'index') : undefined
        const timeoutMs = readNumber(record, 'timeoutMs')

        return runtime.runPageCommandForRouteClient(routeClient.id, args, {
          type: commandType,
          ...(selector ? { selector } : {}),
          ...(text ? { text } : {}),
          ...(index !== undefined ? { index } : {}),
          ...(timeoutMs !== undefined ? { timeoutMs } : {})
        } as never)
      }
    )
  }
}
