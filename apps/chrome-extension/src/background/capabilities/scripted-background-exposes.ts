import type { MdpClient } from '@modeldriveprotocol/client'

import {
  getBackgroundExposeDefinition,
  getConfiguredBackgroundExpose,
  type BackgroundClientConfig
} from '#~/shared/config.js'
import {
  asRecord,
  readBoolean,
  readNumber,
  readString,
  readStringArray
} from '#~/shared/utils.js'
import type { ChromeExtensionRuntimeApi } from '#~/background/runtime-api.js'
import {
  jsonResource,
  readRequestRecord,
  requireNumberArg,
  requireStringArg
} from '#~/background/shared.js'

type ScriptedBackgroundExposeOptions = {
  method?: 'GET' | 'POST'
  contentType?: string
  inputSchema?: Record<string, unknown>
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  api: string,
  request: string,
  args: string,
  helpers: string,
  source: string
) => (
  api: ChromeExtensionRuntimeApi,
  request: unknown,
  args: unknown,
  helpers: Record<string, unknown>
) => Promise<unknown>

export function registerScriptedBackgroundExpose(
  client: MdpClient,
  runtime: ChromeExtensionRuntimeApi | null,
  config: BackgroundClientConfig,
  id: Parameters<typeof getConfiguredBackgroundExpose>[1],
  options: ScriptedBackgroundExposeOptions
): void {
  const expose = getConfiguredBackgroundExpose(config, id)

  if (!expose?.enabled) {
    return
  }

  client.expose(
    expose.path,
    {
      ...(options.method ? { method: options.method } : {}),
      description: expose.description,
      ...(options.contentType ? { contentType: options.contentType } : {}),
      ...(options.inputSchema ? { inputSchema: options.inputSchema } : {})
    },
    async (request) =>
      executeBackgroundExposeSource(runtime, expose.id, expose.source, request)
  )
}

async function executeBackgroundExposeSource(
  runtime: ChromeExtensionRuntimeApi | null,
  id: Parameters<typeof getConfiguredBackgroundExpose>[1],
  source: string,
  request: unknown
): Promise<unknown> {
  const definition = getBackgroundExposeDefinition(id)

  if (definition?.sourceKind === 'markdown') {
    return source
  }

  if (!runtime) {
    throw new Error(`Background expose "${id}" requires runtime access`)
  }

  const requestRecord = asRecord(request)
  const args = readRequestRecord({
    params: asRecord(requestRecord.params),
    queries: asRecord(requestRecord.queries),
    body: requestRecord.body
  })
  const runner = new AsyncFunction('api', 'request', 'args', 'helpers', source)

  return runner(runtime, request, args, {
    asRecord,
    jsonResource,
    readBoolean,
    readNumber,
    readString,
    readStringArray,
    requireNumberArg,
    requireStringArg
  })
}
