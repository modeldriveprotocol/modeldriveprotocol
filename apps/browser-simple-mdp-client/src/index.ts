type RpcArguments = Record<string, unknown> | undefined

interface SimpleClientDescriptor {
  id: string
  name: string
  description?: string
  platform?: string
}

interface SimpleClient {
  exposeTool(
    name: string,
    handler: (args: RpcArguments) => unknown | Promise<unknown>,
    options?: {
      description?: string
      inputSchema?: Record<string, unknown>
    }
  ): SimpleClient
  exposeSkill(
    name: string,
    content: string,
    options?: {
      description?: string
      contentType?: string
    }
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
  client.exposeTool(
    'browser.getPageBasics',
    async () => readPageBasics(environment.window, environment.document),
    {
      description: 'Read the current page title, URL, path, hash, and query parameters.'
    }
  )

  client.exposeTool(
    'browser.clickElement',
    async (args) => clickElement(environment, args),
    {
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
    }
  )

  client.exposeTool(
    'browser.alertMessage',
    async (args) => alertMessage(environment.window, args),
    {
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
    }
  )

  client.exposeSkill(
    'browser-simple/overview',
    [
      '# Browser Simple Client',
      '',
      'This client exposes a minimal browser capability set for MDP.',
      '',
      'Available tools:',
      '',
      '- `browser.getPageBasics` returns title, URL, pathname, hash, and query params.',
      '- `browser.clickElement` clicks one DOM element by CSS selector.',
      '- `browser.alertMessage` shows one alert dialog on the current page.',
      '',
      'Read `browser-simple/tools` for usage details and `browser-simple/examples` for example prompts.'
    ].join('\n'),
    {
      description: 'Overview of the simple browser client capability surface.',
      contentType: 'text/markdown'
    }
  )

  client.exposeSkill(
    'browser-simple/tools',
    [
      '# Browser Simple Tools',
      '',
      '## `browser.getPageBasics`',
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
      '## `browser.clickElement`',
      '',
      'Input:',
      '',
      '```json',
      '{ "selector": "button.primary" }',
      '```',
      '',
      '## `browser.alertMessage`',
      '',
      'Input:',
      '',
      '```json',
      '{ "message": "MDP says hello from this page." }',
      '```'
    ].join('\n'),
    {
      description: 'Tool-by-tool usage details for the simple browser client.',
      contentType: 'text/markdown'
    }
  )

  client.exposeSkill(
    'browser-simple/examples',
    [
      '# Browser Simple Examples',
      '',
      'Example prompts:',
      '',
      '- "Call `browser.getPageBasics` and tell me the current page title and query params."',
      '- "Call `browser.clickElement` with selector `button[type=submit]`."',
      '- "Call `browser.alertMessage` with a short confirmation message."',
      '',
      'Use `browser-simple/overview` first, then drill down into `browser-simple/tools` when the agent needs exact argument shapes.'
    ].join('\n'),
    {
      description: 'Prompt and workflow examples for the simple browser client.',
      contentType: 'text/markdown'
    }
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
