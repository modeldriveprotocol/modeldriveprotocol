import process from 'node:process'

import { MockLanguageModelV3 } from 'ai/test'

export function createMockModel({ userInput, runtimeClientId }) {
  let callCount = 0

  return new MockLanguageModelV3({
    doGenerate: async (options) => {
      callCount += 1

      if (callCount === 1) {
        if (isGetPackageVersionRequest(userInput)) {
          return createToolCallResult({
            toolCallId: 'call-get-package-version',
            toolName: 'callTools',
            input: {
              clientId: runtimeClientId,
              toolName: 'workspace.readPackageManifest',
              args: {
                packageDir: 'packages/server'
              }
            }
          })
        }

        return createTextResult(`未匹配到预设命令：${userInput}。目前只支持 get-package-version。`)
      }

      if (process.env.MDP_DEBUG === '1') {
        process.stderr.write(`${JSON.stringify(options, null, 2)}\n`)
      }

      const version = extractVersionFromUnknown(options)

      if (!version) {
        return createTextResult('版本信息缺失。')
      }

      return createTextResult(`版本是 ${version}。`)
    }
  })
}

function createToolCallResult({ toolCallId, toolName, input }) {
  return {
    content: [
      {
        type: 'tool-call',
        toolCallId,
        toolName,
        input: JSON.stringify(input)
      }
    ],
    finishReason: {
      unified: 'tool-calls',
      raw: 'tool-calls'
    },
    usage: createMockUsage(),
    warnings: []
  }
}

function createTextResult(text) {
  return {
    content: [
      {
        type: 'text',
        text
      }
    ],
    finishReason: {
      unified: 'stop',
      raw: 'stop'
    },
    usage: createMockUsage(),
    warnings: []
  }
}

function createMockUsage() {
  return {
    inputTokens: {
      total: 1,
      noCache: 1,
      cacheRead: undefined,
      cacheWrite: undefined
    },
    outputTokens: {
      total: 1,
      text: 1,
      reasoning: undefined
    }
  }
}

function isGetPackageVersionRequest(input) {
  const normalized = input.trim().toLowerCase()

  return normalized === 'get-package-version'
    || normalized === '调用get-package-version'
    || normalized === '调用 get-package-version'
}

function extractVersionFromUnknown(value) {
  const queue = [value]
  const visited = new Set()

  while (queue.length > 0) {
    const current = queue.shift()

    if (current == null) {
      continue
    }

    if (typeof current === 'string') {
      const match = current.match(/"version"\s*:\s*"([^"]+)"/)
      if (match?.[1]) {
        return match[1]
      }
      continue
    }

    if (typeof current !== 'object') {
      continue
    }

    if (visited.has(current)) {
      continue
    }

    visited.add(current)

    if (
      'manifest' in current
      && current.manifest
      && typeof current.manifest === 'object'
      && 'version' in current.manifest
      && typeof current.manifest.version === 'string'
    ) {
      return current.manifest.version
    }

    if (Array.isArray(current)) {
      queue.push(...current)
      continue
    }

    queue.push(...Object.values(current))
  }

  return undefined
}
