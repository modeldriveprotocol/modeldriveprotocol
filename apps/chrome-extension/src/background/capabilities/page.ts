import type { MdpClient } from '@modeldriveprotocol/client'

import type { PageSnapshot } from '../../page/messages.js'
import { asRecord, assertUrlMatchCondition, readBoolean, readNumber, readString } from '../../shared/utils.js'
import type { ChromeExtensionRuntimeApi } from '../runtime-api.js'
import { isScrollLogicalPosition, requireStringArg, tabTargetSchema } from '../shared.js'

export function registerPageCapabilities(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi
): void {
  client.exposeTool(
    'page.getSnapshot',
    async (args) => {
      const maxTextLength = readNumber(asRecord(args), 'maxTextLength')
      return runtime.runPageCommand<PageSnapshot>(args, {
        type: 'getSnapshot',
        ...(maxTextLength !== undefined ? { maxTextLength } : {})
      })
    },
    {
      description: 'Collect a lightweight snapshot of the target page.',
      inputSchema: {
        type: 'object',
        properties: {
          tabId: { type: 'number' },
          maxTextLength: { type: 'number' }
        }
      }
    }
  )

  client.exposeTool(
    'page.queryElements',
    async (args) => {
      const selector = requireStringArg(args, 'selector')
      const maxResults = readNumber(asRecord(args), 'maxResults')
      return runtime.runPageCommand(args, {
        type: 'queryElements',
        selector,
        ...(maxResults !== undefined ? { maxResults } : {})
      })
    },
    {
      description: 'Query DOM elements from the target page.',
      inputSchema: {
        type: 'object',
        required: ['selector'],
        properties: {
          tabId: { type: 'number' },
          selector: { type: 'string' },
          maxResults: { type: 'number' }
        }
      }
    }
  )

  client.exposeTool(
    'page.click',
    async (args) => {
      const selector = requireStringArg(args, 'selector')
      const index = readNumber(asRecord(args), 'index')
      return runtime.runPageCommand(args, {
        type: 'click',
        selector,
        ...(index !== undefined ? { index } : {})
      })
    },
    {
      description: 'Click a DOM element on the target page.',
      inputSchema: {
        type: 'object',
        required: ['selector'],
        properties: {
          tabId: { type: 'number' },
          selector: { type: 'string' },
          index: { type: 'number' }
        }
      }
    }
  )

  client.exposeTool(
    'page.fill',
    async (args) => {
      const selector = requireStringArg(args, 'selector')
      const value = requireStringArg(args, 'value')
      const index = readNumber(asRecord(args), 'index')
      return runtime.runPageCommand(args, {
        type: 'fill',
        selector,
        value,
        ...(index !== undefined ? { index } : {})
      })
    },
    {
      description: 'Fill an input, textarea, select, or contenteditable element.',
      inputSchema: {
        type: 'object',
        required: ['selector', 'value'],
        properties: {
          tabId: { type: 'number' },
          selector: { type: 'string' },
          value: { type: 'string' },
          index: { type: 'number' }
        }
      }
    }
  )

  client.exposeTool(
    'page.focus',
    async (args) => {
      const selector = requireStringArg(args, 'selector')
      const index = readNumber(asRecord(args), 'index')
      return runtime.runPageCommand(args, {
        type: 'focus',
        selector,
        ...(index !== undefined ? { index } : {})
      })
    },
    {
      description: 'Move focus to a matching element on the target page.',
      inputSchema: {
        type: 'object',
        required: ['selector'],
        properties: {
          tabId: { type: 'number' },
          selector: { type: 'string' },
          index: { type: 'number' }
        }
      }
    }
  )

  client.exposeTool(
    'page.runMainWorldScript',
    async (args) => {
      const record = asRecord(args)
      const source = requireStringArg(args, 'source')
      const scriptArgs = record.scriptArgs
      const scriptId = readString(record, 'scriptId')
      const force = readBoolean(record, 'force')
      return runtime.runPageCommand(args, {
        type: 'runMainWorld',
        action: 'runScript',
        args: {
          source,
          ...(scriptArgs !== undefined ? { scriptArgs } : {}),
          ...(scriptId ? { scriptId } : {}),
          ...(force !== undefined ? { force } : {})
        }
      })
    },
    {
      description: 'Execute custom JavaScript in the page main world. The script body can return a value.',
      inputSchema: {
        type: 'object',
        required: ['source'],
        properties: {
          tabId: { type: 'number' },
          source: { type: 'string' },
          scriptArgs: { type: 'object' },
          scriptId: { type: 'string' },
          force: { type: 'boolean' }
        }
      }
    }
  )

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

      return runtime.runPageCommand(args, {
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

      return runtime.runPageCommand(args, {
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

      return runtime.runPageCommand(args, {
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
    'page.waitForText',
    async (args) => {
      const record = asRecord(args)
      const text = requireStringArg(args, 'text')
      const timeoutMs = readNumber(record, 'timeoutMs')

      return runtime.runPageCommand(args, {
        type: 'waitForText',
        text,
        ...(timeoutMs !== undefined ? { timeoutMs } : {})
      })
    },
    {
      description: 'Wait until visible page text contains the requested string.',
      inputSchema: {
        type: 'object',
        required: ['text'],
        properties: {
          tabId: { type: 'number' },
          text: { type: 'string' },
          timeoutMs: { type: 'number' }
        }
      }
    }
  )

  client.exposeTool(
    'page.waitForSelector',
    async (args) => {
      const record = asRecord(args)
      const selector = requireStringArg(args, 'selector')
      const timeoutMs = readNumber(record, 'timeoutMs')

      return runtime.runPageCommand(args, {
        type: 'waitForSelector',
        selector,
        ...(timeoutMs !== undefined ? { timeoutMs } : {})
      })
    },
    {
      description: 'Wait until the target page contains a matching DOM element.',
      inputSchema: {
        type: 'object',
        required: ['selector'],
        properties: {
          tabId: { type: 'number' },
          selector: { type: 'string' },
          timeoutMs: { type: 'number' }
        }
      }
    }
  )

  client.exposeTool(
    'page.waitForVisible',
    async (args) => {
      const record = asRecord(args)
      const selector = requireStringArg(args, 'selector')
      const index = readNumber(record, 'index')
      const timeoutMs = readNumber(record, 'timeoutMs')

      return runtime.runPageCommand(args, {
        type: 'waitForVisible',
        selector,
        ...(index !== undefined ? { index } : {}),
        ...(timeoutMs !== undefined ? { timeoutMs } : {})
      })
    },
    {
      description: 'Wait until a matching DOM element becomes visible.',
      inputSchema: {
        type: 'object',
        required: ['selector'],
        properties: {
          tabId: { type: 'number' },
          selector: { type: 'string' },
          index: { type: 'number' },
          timeoutMs: { type: 'number' }
        }
      }
    }
  )

  client.exposeTool(
    'page.waitForHidden',
    async (args) => {
      const record = asRecord(args)
      const selector = requireStringArg(args, 'selector')
      const timeoutMs = readNumber(record, 'timeoutMs')

      return runtime.runPageCommand(args, {
        type: 'waitForHidden',
        selector,
        ...(timeoutMs !== undefined ? { timeoutMs } : {})
      })
    },
    {
      description: 'Wait until no matching DOM elements remain visible.',
      inputSchema: {
        type: 'object',
        required: ['selector'],
        properties: {
          tabId: { type: 'number' },
          selector: { type: 'string' },
          timeoutMs: { type: 'number' }
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
      const condition = assertUrlMatchCondition({
        ...(url !== undefined ? { url } : {}),
        ...(includes !== undefined ? { includes } : {}),
        ...(matches !== undefined ? { matches } : {})
      })
      const timeoutMs = readNumber(record, 'timeoutMs')

      return runtime.runPageCommand(args, {
        type: 'waitForUrl',
        ...condition,
        ...(timeoutMs !== undefined ? { timeoutMs } : {})
      })
    },
    {
      description:
        'Wait until the target page URL matches the requested exact value, substring, or regular expression.',
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

  client.exposeTool(
    'page.injectToolScript',
    async (args) => {
      const record = asRecord(args)
      const tabId = readNumber(record, 'tabId')
      const scriptId = readString(record, 'scriptId')
      const force = readBoolean(record, 'force')

      return runtime.injectToolScript({
        source: requireStringArg(args, 'source'),
        ...(tabId !== undefined ? { tabId } : {}),
        ...(record.scriptArgs !== undefined ? { scriptArgs: record.scriptArgs } : {}),
        ...(scriptId ? { scriptId } : {}),
        ...(force !== undefined ? { force } : {})
      })
    },
    {
      description:
        'Inject a main-world script into the page. The script can register reusable tools through window.__MDP_EXTENSION_BRIDGE__.',
      inputSchema: {
        type: 'object',
        required: ['source'],
        properties: {
          tabId: { type: 'number' },
          source: { type: 'string' },
          scriptArgs: { type: 'object' },
          scriptId: { type: 'string' },
          force: { type: 'boolean' }
        }
      }
    }
  )

  client.exposeTool(
    'page.getInjectedState',
    async (args) => runtime.getInjectedState(args),
    {
      description: 'Read the active main-world bridge state, including registered tools and executed script ids.',
      inputSchema: tabTargetSchema()
    }
  )

  client.exposeTool(
    'page.listInjectedTools',
    async (args) => runtime.listInjectedToolsForArgs(args),
    {
      description: 'List page-side tools registered by injected main-world scripts.',
      inputSchema: tabTargetSchema()
    }
  )

  client.exposeTool(
    'page.callInjectedTool',
    async (args) => {
      const record = asRecord(args)
      const tabId = readNumber(record, 'tabId')

      return runtime.callInjectedTool({
        name: requireStringArg(args, 'name'),
        ...(tabId !== undefined ? { tabId } : {}),
        ...(record.toolArgs !== undefined ? { toolArgs: record.toolArgs } : {})
      })
    },
    {
      description: 'Invoke a previously registered injected page tool.',
      inputSchema: {
        type: 'object',
        required: ['name'],
        properties: {
          tabId: { type: 'number' },
          name: { type: 'string' },
          toolArgs: { type: 'object' }
        }
      }
    }
  )
}
