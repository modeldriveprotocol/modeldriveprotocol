import type { MdpClient } from '@modeldriveprotocol/client'

import type { PageSnapshot } from '#~/page/messages.js'
import type { RouteClientConfig } from '#~/shared/config.js'
import { asRecord, assertUrlMatchCondition, readBoolean, readNumber, readString } from '#~/shared/utils.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import { isScrollLogicalPosition, requireStringArg, tabTargetSchema } from '#~/background/shared.js'

export function registerPageInteractionTools(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi,
  routeClient: RouteClientConfig
): void {
  client.exposeTool(
    'page.getSnapshot',
    async (args) => {
      const maxTextLength = readNumber(asRecord(args), 'maxTextLength')
      return runtime.runPageCommandForRouteClient<PageSnapshot>(routeClient.id, args, {
        type: 'getSnapshot',
        ...(maxTextLength !== undefined ? { maxTextLength } : {})
      })
    },
    {
      description: 'Collect a lightweight snapshot of the target page for this route client.',
      inputSchema: {
        type: 'object',
        properties: {
          tabId: { type: 'number' },
          maxTextLength: { type: 'number' }
        }
      }
    }
  )

  for (const [toolName, commandType, description, required] of [
    ['page.queryElements', 'queryElements', 'Query DOM elements from the target page.', ['selector']],
    ['page.click', 'click', 'Click a DOM element on the target page.', ['selector']],
    ['page.fill', 'fill', 'Fill an input, textarea, select, or contenteditable element.', ['selector', 'value']],
    ['page.focus', 'focus', 'Move focus to a matching element on the target page.', ['selector']]
  ] as const) {
    client.exposeTool(
      toolName,
      async (args) => {
        const selector = requireStringArg(args, 'selector')
        const record = asRecord(args)
        const index = readNumber(record, 'index')

        if (commandType === 'queryElements') {
          const maxResults = readNumber(record, 'maxResults')
          return runtime.runPageCommandForRouteClient(routeClient.id, args, {
            type: 'queryElements',
            selector,
            ...(index !== undefined ? { index } : {}),
            ...(maxResults !== undefined ? { maxResults } : {})
          })
        }

        if (commandType === 'fill') {
          return runtime.runPageCommandForRouteClient(routeClient.id, args, {
            type: 'fill',
            selector,
            ...(index !== undefined ? { index } : {}),
            value: requireStringArg(args, 'value')
          })
        }

        return runtime.runPageCommandForRouteClient(routeClient.id, args, {
          type: commandType,
          selector,
          ...(index !== undefined ? { index } : {})
        } as never)
      },
      {
        description,
        inputSchema: {
          type: 'object',
          required: [...required],
          properties: {
            tabId: { type: 'number' },
            selector: { type: 'string' },
            value: { type: 'string' },
            index: { type: 'number' },
            maxResults: { type: 'number' }
          }
        }
      }
    )
  }

  client.exposeTool(
    'page.pressKey',
    async (args) => {
      const record = asRecord(args)
      const key = requireStringArg(args, 'key')
      const selector = readString(record, 'selector')
      const code = readString(record, 'code')
      const altKey = readBoolean(record, 'altKey')
      const ctrlKey = readBoolean(record, 'ctrlKey')
      const metaKey = readBoolean(record, 'metaKey')
      const shiftKey = readBoolean(record, 'shiftKey')

      return runtime.runPageCommandForRouteClient(routeClient.id, args, {
        type: 'pressKey',
        key,
        ...(selector ? { selector } : {}),
        ...(code ? { code } : {}),
        ...(altKey !== undefined ? { altKey } : {}),
        ...(ctrlKey !== undefined ? { ctrlKey } : {}),
        ...(metaKey !== undefined ? { metaKey } : {}),
        ...(shiftKey !== undefined ? { shiftKey } : {})
      })
    },
    {
      description: 'Dispatch a keyboard event to the active element or a selected element.',
      inputSchema: {
        type: 'object',
        required: ['key'],
        properties: {
          tabId: { type: 'number' },
          key: { type: 'string' },
          code: { type: 'string' },
          selector: { type: 'string' },
          altKey: { type: 'boolean' },
          ctrlKey: { type: 'boolean' },
          metaKey: { type: 'boolean' },
          shiftKey: { type: 'boolean' }
        }
      }
    }
  )

  client.exposeTool(
    'page.scrollIntoView',
    async (args) => {
      const record = asRecord(args)
      const selector = requireStringArg(args, 'selector')
      const index = readNumber(record, 'index')
      const behavior = readString(record, 'behavior')
      const block = readString(record, 'block')
      const inline = readString(record, 'inline')

      return runtime.runPageCommandForRouteClient(routeClient.id, args, {
        type: 'scrollIntoView',
        selector,
        ...(index !== undefined ? { index } : {}),
        ...(behavior === 'smooth' || behavior === 'auto' ? { behavior } : {}),
        ...(isScrollLogicalPosition(block) ? { block } : {}),
        ...(isScrollLogicalPosition(inline) ? { inline } : {})
      })
    },
    {
      description: 'Scroll a matching element into the viewport.',
      inputSchema: {
        type: 'object',
        required: ['selector'],
        properties: {
          tabId: { type: 'number' },
          selector: { type: 'string' },
          index: { type: 'number' },
          behavior: { type: 'string', enum: ['auto', 'smooth'] },
          block: { type: 'string', enum: ['start', 'center', 'end', 'nearest'] },
          inline: { type: 'string', enum: ['start', 'center', 'end', 'nearest'] }
        }
      }
    }
  )

  client.exposeTool(
    'page.scrollTo',
    async (args) => {
      const record = asRecord(args)
      const top = readNumber(record, 'top')
      const left = readNumber(record, 'left')
      const behavior = readString(record, 'behavior')

      return runtime.runPageCommandForRouteClient(routeClient.id, args, {
        type: 'scrollTo',
        ...(top !== undefined ? { top } : {}),
        ...(left !== undefined ? { left } : {}),
        ...(behavior === 'smooth' || behavior === 'auto' ? { behavior } : {})
      })
    },
    {
      description: 'Scroll the page viewport to a specific position.',
      inputSchema: {
        type: 'object',
        properties: {
          tabId: { type: 'number' },
          top: { type: 'number' },
          left: { type: 'number' },
          behavior: { type: 'string', enum: ['auto', 'smooth'] }
        }
      }
    }
  )

  client.exposeTool(
    'page.waitForUrl',
    async (args) => {
      const record = asRecord(args)
      const url = readString(record, 'url')
      const includes = readString(record, 'includes')
      const matches = readString(record, 'matches')

      return runtime.runPageCommandForRouteClient(routeClient.id, args, {
        type: 'waitForUrl',
        ...assertUrlMatchCondition({
          ...(url ? { url } : {}),
          ...(includes ? { includes } : {}),
          ...(matches ? { matches } : {})
        }),
        ...(readNumber(record, 'timeoutMs') !== undefined ? { timeoutMs: readNumber(record, 'timeoutMs') } : {})
      })
    },
    {
      description: 'Wait for the target page URL to match a condition.',
      inputSchema: {
        type: 'object',
        properties: {
          tabId: { type: 'number' },
          url: { type: 'string' },
          includes: { type: 'string' },
          matches: { type: 'string' },
          timeoutMs: { type: 'number' }
        }
      }
    }
  )
}
