type RpcArguments = Record<string, unknown> | undefined

interface SimpleClientDescriptor {
  id: string
  name: string
  description?: string
  platform?: string
  paths?: Array<{
    type: string
    path: string
    method?: string
  }>
}

interface SimplePathRequest {
  params: Record<string, unknown>
  queries: Record<string, unknown>
  headers: Record<string, string>
  body?: unknown
}

interface SimpleClient {
  expose(
    path: string,
    definition: string | {
      method?: string
      description?: string
      inputSchema?: Record<string, unknown>
      contentType?: string
    },
    handler?: (request: SimplePathRequest) => unknown | Promise<unknown>
  ): SimpleClient
  connect(): Promise<void>
  register(): void
  describe(): SimpleClientDescriptor
}

interface MdpGlobal {
  createClientFromScriptTag(script?: HTMLScriptElement): SimpleClient
}

interface BrowserSimpleEnvironment {
  window: Window
  document: Document
}

export interface BootBrowserSimpleClientOptions {
  script?: HTMLScriptElement
  environment?: BrowserSimpleEnvironment
}

export async function bootBrowserSimpleMdpClient(
  options: BootBrowserSimpleClientOptions = {}
): Promise<SimpleClient> {
  const environment = resolveEnvironment(options.environment)
  const script = options.script ?? resolveCurrentScript(environment.document)
  const client = resolveMdpGlobal(environment.window).createClientFromScriptTag(script)

  registerBrowserSimpleCapabilities(client, environment)
  await client.connect()
  client.register()
  dispatchStatusEvent(environment.window, 'ready', {
    client: client.describe()
  })

  return client
}

export function registerBrowserSimpleCapabilities(
  client: SimpleClient,
  environment: BrowserSimpleEnvironment = resolveEnvironment()
): SimpleClient {
  client.expose(
    '/browser/page-basics',
    {
      method: 'GET',
      description: 'Read the current page title, URL, path, hash, and query parameters.'
    },
    async () => readPageBasics(environment.window, environment.document),
  )

  client.expose(
    '/browser/click-element',
    {
      method: 'POST',
      description: 'Click one element on the current page by CSS selector.',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        required: ['selector'],
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector for the target element.'
          }
        }
      }
    },
    async (request) => clickElement(environment, readRequestArgs(request))
  )

  client.expose(
    '/browser/alert-message',
    {
      method: 'POST',
      description: 'Show one alert message on the current page.',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        required: ['message'],
        properties: {
          message: {
            type: 'string',
            description: 'Message content shown through window.alert.'
          }
        }
      }
    },
    async (request) => alertMessage(environment.window, readRequestArgs(request))
  )

  client.expose(
    '/browser-simple/overview/skill.md',
    {
      description: 'Overview of the simple browser client capability surface.',
      contentType: 'text/markdown'
    },
    async () => [
      '# Browser Simple Client',
      '',
      'This client exposes a minimal browser capability set as canonical MDP paths.',
      '',
      'Available endpoints:',
      '',
      '- `GET /browser/page-basics` returns title, URL, pathname, hash, and query params.',
      '- `POST /browser/click-element` clicks one DOM element by CSS selector.',
      '- `POST /browser/alert-message` shows one alert dialog on the current page.',
      '',
      'Read `/browser-simple/tools/skill.md` for usage details and `/browser-simple/examples/skill.md` for example prompts.'
    ].join('\n')
  )

  client.expose(
    '/browser-simple/tools/skill.md',
    {
      description: 'Tool-by-tool usage details for the simple browser client.',
      contentType: 'text/markdown'
    },
    async () => [
      '# Browser Simple Tools',
      '',
      '## `GET /browser/page-basics`',
      '',
      'Call with no arguments.',
      '',
      'Returns:',
      '',
      '- `title`',
      '- `url`',
      '- `origin`',
      '- `pathname`',
      '- `hash`',
      '- `query`',
      '',
      '## `POST /browser/click-element`',
      '',
      'Input:',
      '',
      '```json',
      '{ "selector": "button.primary" }',
      '```',
      '',
      '## `POST /browser/alert-message`',
      '',
      'Input:',
      '',
      '```json',
      '{ "message": "MDP says hello from this page." }',
      '```'
    ].join('\n')
  )

  client.expose(
    '/browser-simple/examples/skill.md',
    {
      description: 'Prompt and workflow examples for the simple browser client.',
      contentType: 'text/markdown'
    },
    async () => [
      '# Browser Simple Examples',
      '',
      'Example prompts:',
      '',
      '- "Call `GET /browser/page-basics` and tell me the current page title and query params."',
      '- "Call `POST /browser/click-element` with selector `button[type=submit]`."',
      '- "Call `POST /browser/alert-message` with a short confirmation message."',
      '',
      'Use `/browser-simple/overview/skill.md` first, then drill down into `/browser-simple/tools/skill.md` when the agent needs exact argument shapes.'
    ].join('\n')
  )

  return client
}

function resolveEnvironment(
  environment?: BrowserSimpleEnvironment
): BrowserSimpleEnvironment {
  if (environment) {
    return environment
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Browser simple MDP client requires a browser environment')
  }

  return {
    window,
    document
  }
}

function resolveCurrentScript(documentRef: Document): HTMLScriptElement {
  const script = documentRef.currentScript

  if (!(script instanceof HTMLScriptElement)) {
    throw new Error('Unable to resolve the current browser simple client <script> tag')
  }

  return script
}

function resolveMdpGlobal(windowRef: Window): MdpGlobal {
  const globalScope = windowRef as Window & { MDP?: MdpGlobal }

  if (!globalScope.MDP) {
    throw new Error(
      'MDP global API not found. Load @modeldriveprotocol/client.global.js before browser-simple-mdp-client.'
    )
  }

  return globalScope.MDP
}

function readPageBasics(windowRef: Window, documentRef: Document) {
  const location = new URL(windowRef.location.href)

  return {
    title: documentRef.title,
    url: location.href,
    origin: location.origin,
    pathname: location.pathname,
    hash: location.hash,
    query: Object.fromEntries(location.searchParams.entries())
  }
}

function clickElement(
  environment: BrowserSimpleEnvironment,
  args: RpcArguments
) {
  const selector = readRequiredString(args, 'selector')
  const element = environment.document.querySelector(selector)

  if (!element) {
    throw new Error(`No element matched selector: ${selector}`)
  }

  if (element instanceof HTMLElement) {
    if (typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ block: 'center', inline: 'center' })
    }
    element.click()
  } else {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  }

  return {
    selector,
    tagName: element.tagName.toLowerCase(),
    text: element.textContent?.trim() ?? ''
  }
}

function alertMessage(windowRef: Window, args: RpcArguments) {
  const message = readRequiredString(args, 'message')

  windowRef.alert(message)

  return {
    delivered: true,
    message
  }
}

function readRequiredString(args: RpcArguments, field: string): string {
  if (!args || typeof args[field] !== 'string' || args[field]?.trim() === '') {
    throw new Error(`Expected a non-empty string field: ${field}`)
  }

  return args[field] as string
}

function readRequestArgs(request: {
  params: Record<string, unknown>
  queries: Record<string, unknown>
  body?: unknown
}): RpcArguments {
  const args = {
    ...request.params,
    ...request.queries,
    ...(isRecord(request.body) ? request.body : {})
  }

  return Object.keys(args).length > 0 ? args : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function dispatchStatusEvent(
  windowRef: Window,
  type: 'ready' | 'error',
  detail: Record<string, unknown>
): void {
  windowRef.dispatchEvent(
    new CustomEvent(`mdp:simple-browser-client:${type}`, { detail })
  )
}

async function autoBoot(): Promise<void> {
  if (typeof document === 'undefined' || !(document.currentScript instanceof HTMLScriptElement)) {
    return
  }

  try {
    await bootBrowserSimpleMdpClient({ script: document.currentScript })
  } catch (error) {
    const environment = resolveEnvironment()
    dispatchStatusEvent(environment.window, 'error', {
      message: error instanceof Error ? error.message : String(error)
    })
    console.error(error)
  }
}

void autoBoot()
