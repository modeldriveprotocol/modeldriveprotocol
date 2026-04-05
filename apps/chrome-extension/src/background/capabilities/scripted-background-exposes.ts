import type { MdpClient } from '@modeldriveprotocol/client'

import {
  getBackgroundExposeDefinition,
  getConfiguredBackgroundExpose,
  type BackgroundClientConfig,
  type BackgroundExposeId
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
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  contentType?: string
  inputSchema?: Record<string, unknown>
}

const BACKGROUND_EXPOSE_HELPERS = {
  asRecord,
  jsonResource,
  readBoolean,
  readNumber,
  readString,
  readStringArray,
  requireNumberArg,
  requireStringArg
}

type BackgroundExposeHelpers = typeof BACKGROUND_EXPOSE_HELPERS
type BackgroundExposeHandler = (
  runtime: ChromeExtensionRuntimeApi,
  args: unknown,
  helpers: BackgroundExposeHelpers
) => Promise<unknown>

const BACKGROUND_EXPOSE_HANDLERS: Record<BackgroundExposeId, BackgroundExposeHandler> = {
  'extension.status': async (runtime) => runtime.getStatus(),
  'extension.config': async (runtime) => runtime.getConfig(),
  'extension.granted-origins': async (runtime) => runtime.listGrantedOrigins(),
  'extension.tabs': async (runtime, args) => runtime.listTabs(asRecord(args) as any),
  'extension.activate-tab': async (runtime, args, helpers) =>
    runtime.activateTab(helpers.requireNumberArg(args, 'tabId')),
  'extension.reload-tab': async (runtime, args) => runtime.reloadTab(args),
  'extension.create-tab': async (runtime, args, helpers) => {
    const record = helpers.asRecord(args)
    const active = helpers.readBoolean(record, 'active')

    return runtime.createTab({
      url: helpers.requireStringArg(record, 'url'),
      ...(active !== undefined ? { active } : {})
    })
  },
  'extension.close-tab': async (runtime, args) => runtime.closeTab(args),
  'extension.show-notification': async (runtime, args, helpers) => {
    const record = helpers.asRecord(args)
    const message = helpers.readString(record, 'message')
    const title = helpers.readString(record, 'title')

    if (!message) {
      throw new Error('message is required')
    }

    return runtime.showNotification({
      message,
      ...(title ? { title } : {})
    })
  },
  'extension.open-options-page': async (runtime) => runtime.openOptionsPage(),
  'extension.resources.status': async (runtime, _args, helpers) =>
    helpers.jsonResource(await runtime.getStatus()),
  'extension.resources.config': async (runtime, _args, helpers) =>
    helpers.jsonResource(await runtime.getConfig()),
  'extension.resources.tabs': async (runtime, _args, helpers) =>
    helpers.jsonResource({
      tabs: await runtime.listTabs({})
    }),
  'extension.clients.list': async (runtime) => runtime.listWorkspaceClients(),
  'extension.clients.create': async (runtime, args) =>
    runtime.createWorkspaceClient(args as any),
  'extension.clients.update': async (runtime, args) =>
    runtime.updateWorkspaceClient(args as any),
  'extension.clients.delete': async (runtime, args) =>
    runtime.deleteWorkspaceClient(args as any),
  'extension.clients.add-expose-rule': async (runtime, args) =>
    runtime.addExposeRuleToClient(args as any),
  'extension.skills.root': async () => {
    throw new Error('Skill exposes should be handled as markdown sources')
  },
  'extension.skills.resources': async () => {
    throw new Error('Skill exposes should be handled as markdown sources')
  },
  'extension.skills.manage-clients': async () => {
    throw new Error('Skill exposes should be handled as markdown sources')
  },
  'extension.skills.manage-client-expose-rules': async () => {
    throw new Error('Skill exposes should be handled as markdown sources')
  }
}

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

  if (definition && source === definition.defaultSource) {
    return BACKGROUND_EXPOSE_HANDLERS[id](runtime, args, BACKGROUND_EXPOSE_HELPERS)
  }

  throw new Error(
    `Background expose "${id}" has custom JavaScript source, but Chrome Manifest V3 blocks dynamic code execution in the extension runtime. Restore the default source or move custom runtime logic to a route/page client.`
  )
}
