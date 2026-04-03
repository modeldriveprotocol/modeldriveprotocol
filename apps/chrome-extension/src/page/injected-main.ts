import { type SerializedError, normalizeForMessaging, serializeError } from '#~/shared/utils.js'
import {
  type InjectedPathDescriptor,
  type MainWorldBridgeState,
  type MainWorldRequest,
  type MainWorldResponse,
  MAIN_WORLD_READY_EVENT,
  MAIN_WORLD_REQUEST_EVENT,
  MAIN_WORLD_RESPONSE_EVENT
} from './messages.js'

interface RegisteredPath {
  description?: string
  handler: (args: unknown) => unknown | Promise<unknown>
}

interface ExtensionBridgeApi {
  registerPath(
    path: string,
    handler: (args: unknown) => unknown | Promise<unknown>,
    options?: {
      description?: string
    }
  ): void
  unregisterPath(path: string): void
  listPaths(): InjectedPathDescriptor[]
  callPath(path: string, args?: unknown): Promise<unknown>
  getState(): MainWorldBridgeState
}

declare global {
  interface Window {
    __MDP_EXTENSION_BRIDGE__?: ExtensionBridgeApi
    __MDP_EXTENSION_BRIDGE_INSTALLED__?: boolean
    __MDP_EXTENSION_EXECUTED_SCRIPT_IDS__?: Record<string, true>
  }
}

export function installInjectedMainWorldBridge(): void {
  if (window.__MDP_EXTENSION_BRIDGE_INSTALLED__) {
    return
  }

  const registeredPaths = new Map<string, RegisteredPath>()
  const executedScriptIds = (window.__MDP_EXTENSION_EXECUTED_SCRIPT_IDS__ ??= {})

  window.__MDP_EXTENSION_BRIDGE_INSTALLED__ = true
  window.__MDP_EXTENSION_BRIDGE__ = {
    registerPath(path, handler, options) {
      const canonicalPath = normalizeInjectedPath(path)

      if (!canonicalPath) {
        throw new Error('Injected path must not be empty')
      }

      registeredPaths.set(canonicalPath, {
        handler,
        ...(options?.description ? { description: options.description } : {})
      })
    },

    unregisterPath(path) {
      const canonicalPath = normalizeInjectedPath(path)

      if (!canonicalPath) {
        return
      }

      registeredPaths.delete(canonicalPath)
    },

    listPaths() {
      return listRegisteredPaths(registeredPaths)
    },

    async callPath(path, args) {
      return callRegisteredPath(
        {
          path,
          ...(args !== undefined ? { pathArgs: args } : {})
        },
        registeredPaths
      )
    },

    getState() {
      return buildBridgeState(registeredPaths)
    }
  }

  window.addEventListener(MAIN_WORLD_REQUEST_EVENT, (event) => {
    const detail = (event as CustomEvent<MainWorldRequest>).detail

    if (!detail) {
      return
    }

    void handleMainWorldRequest(detail, registeredPaths)
  })

  window.dispatchEvent(new CustomEvent(MAIN_WORLD_READY_EVENT))
}

async function handleMainWorldRequest(
  request: MainWorldRequest,
  registeredPaths: Map<string, RegisteredPath>
): Promise<void> {
  try {
    let data: unknown

    switch (request.action) {
      case 'listPaths':
        data = listRegisteredPaths(registeredPaths)
        break
      case 'getState':
        data = buildBridgeState(registeredPaths)
        break
      case 'callPath':
        data = await callRegisteredPath(request.args, registeredPaths)
        break
      case 'runScript':
        data = await runInjectedScript(request.args)
        break
      default:
        throw new Error(`Unsupported main world action: ${String(request.action)}`)
    }

    dispatchResponse({
      requestId: request.requestId,
      ok: true,
      data: normalizeForMessaging(data)
    })
  } catch (error) {
    dispatchResponse({
      requestId: request.requestId,
      ok: false,
      error: serializeError(error)
    })
  }
}

async function callRegisteredPath(
  args: unknown,
  registeredPaths: Map<string, RegisteredPath>
): Promise<unknown> {
  if (!isPlainObject(args)) {
    throw new Error('Injected path invocation args must be an object')
  }

  const identifier =
    typeof args.path === 'string'
      ? args.path
      : ''

  if (!identifier.trim()) {
    throw new Error('Injected path is required')
  }

  const registeredPath = resolveRegisteredPath(identifier, registeredPaths)

  if (!registeredPath) {
    throw new Error(`Unknown injected path "${identifier}"`)
  }

  if (
    !Object.prototype.hasOwnProperty.call(args, 'pathArgs') &&
    Object.prototype.hasOwnProperty.call(args, 'toolArgs')
  ) {
    throw new Error('Injected path invocations must use "pathArgs"')
  }

  const pathArgs = args.pathArgs

  return registeredPath.handler(pathArgs)
}

async function runInjectedScript(args: unknown): Promise<unknown> {
  if (!isPlainObject(args)) {
    throw new Error('Injected script args must be an object')
  }

  const source = typeof args.source === 'string' ? args.source : ''
  const scriptId = typeof args.scriptId === 'string' ? args.scriptId : undefined
  const force = args.force === true

  if (!source.trim()) {
    throw new Error('Injected script source is required')
  }

  const executedScriptIds = (window.__MDP_EXTENSION_EXECUTED_SCRIPT_IDS__ ??= {})

  if (scriptId && !force && executedScriptIds[scriptId]) {
    return {
      skipped: true,
      scriptId
    }
  }

  const runner = new Function(
    'args',
    `
      return (async () => {
        ${source}
      })();
    `
  ) as (args: unknown) => Promise<unknown>

  const result = await runner(args.scriptArgs)

  if (scriptId) {
    executedScriptIds[scriptId] = true
  }

  return result
}

function listRegisteredPaths(
  registeredPaths: Map<string, RegisteredPath>
): InjectedPathDescriptor[] {
  return [...registeredPaths.entries()].map(([path, entry]) => ({
    path,
    ...(entry.description ? { description: entry.description } : {})
  }))
}

function buildBridgeState(
  registeredPaths: Map<string, RegisteredPath>
): MainWorldBridgeState {
  return {
    bridgeInstalled: true,
    paths: listRegisteredPaths(registeredPaths),
    executedScriptIds: Object.keys(window.__MDP_EXTENSION_EXECUTED_SCRIPT_IDS__ ?? {}).sort()
  }
}

function resolveRegisteredPath(
  identifier: string,
  registeredPaths: Map<string, RegisteredPath>
): RegisteredPath | undefined {
  const normalizedIdentifier = identifier.trim()

  if (!normalizedIdentifier) {
    return undefined
  }

  const canonicalPath = normalizeInjectedPath(normalizedIdentifier)

  if (canonicalPath) {
    const directMatch = registeredPaths.get(canonicalPath)
    if (directMatch) {
      return directMatch
    }
  }

  return undefined
}

function normalizeInjectedPath(path: string): string {
  const normalized = path
    .trim()
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/')

  return normalized ? `/${normalized}` : ''
}

function dispatchResponse(response: {
  requestId: string
  ok: boolean
  data?: unknown
  error?: SerializedError
}): void {
  const detail: MainWorldResponse = {
    requestId: response.requestId,
    ok: response.ok,
    ...(response.data !== undefined ? { data: response.data } : {}),
    ...(response.error ? { error: response.error } : {})
  }

  window.dispatchEvent(
    new CustomEvent(MAIN_WORLD_RESPONSE_EVENT, {
      detail
    })
  )
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
