<script setup lang="ts">
import { useData, withBase } from 'vitepress'
import {
  type PropType,
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue'

type TransportSchema = 'ws' | 'wss' | 'http' | 'https'
type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error'
type ThemePreference = 'light' | 'dark' | 'auto'

interface StoredConnection {
  id: string
  name: string
  schema: TransportSchema
  host: string
  url: string
  token: string
}

interface PlaygroundConnection extends StoredConnection {
  status: ConnectionStatus
  detail: string
}

interface PlaygroundClient {
  connect(): Promise<void>
  register(): void
  disconnect(): Promise<void>
  exposeTool(
    name: string,
    handler: (...args: unknown[]) => unknown,
    options?: unknown
  ): void
  exposeResource(
    uri: string,
    handler: (...args: unknown[]) => unknown,
    options: unknown
  ): void
}

interface MdpGlobal {
  createMdpClient(options: {
    serverUrl: string
    auth?: { token: string }
    client: {
      id: string
      name: string
      description: string
      platform: string
      metadata: Record<string, unknown>
    }
  }): PlaygroundClient
}

interface PlaygroundSession {
  client: PlaygroundClient
}

interface DocsPageEntry {
  title: string
  path: string
  section: string | null
}

declare global {
  interface Window {
    MDP?: MdpGlobal
  }
}

const STORAGE_KEY = 'mdp-docs-playground-connections-v1'
const DEFAULT_HOST = '127.0.0.1:7070'
const SCHEMAS: TransportSchema[] = ['ws', 'wss', 'http', 'https']
const APPEARANCE_KEY = 'vitepress-theme-appearance'
const EXTERNAL_URL_RE = /^(?:[a-z]+:|\/\/)/i
const THEME_PREFERENCES: ThemePreference[] = ['light', 'dark', 'auto']

const ICONS = {
  plus: 'add',
  connect: 'link',
  disconnect: 'link_off',
  refresh: 'refresh',
  reset: 'restart_alt',
  stack: 'stacks',
  activity: 'toggle_on',
  bolt: 'bolt',
  server: 'dns',
  sliders: 'tune',
  copy: 'content_copy',
  trash: 'delete',
  globe: 'language',
  shield: 'shield',
  fingerprint: 'fingerprint',
  chevron: 'expand_more',
  spark: 'auto_awesome'
} as const

type IconName = keyof typeof ICONS

const UiIcon = defineComponent({
  name: 'UiIcon',
  props: {
    name: {
      type: String as PropType<IconName>,
      required: true
    }
  },
  setup(props) {
    return () =>
      h(
        'span',
        {
          class: 'ui-icon material-symbols-rounded',
          'aria-hidden': 'true'
        },
        ICONS[props.name]
      )
  }
})

const translations = {
  'en-US': {
    badge: 'VitePress Layout',
    title: 'What is this',
    intro:
      'Run one or more browser-side MDP clients directly inside the docs site. Each card maps to a target server and keeps the common transport settings in view.',
    endpoint: 'Endpoint',
    addConnection: 'Add connection',
    connectAll: 'Connect all',
    disconnectAll: 'Disconnect all',
    reset: 'Reset',
    connections: 'Connections',
    total: 'Total',
    active: 'Active',
    ready: 'Bundle',
    readyValue: 'Ready',
    loadingValue: 'Loading',
    errorValue: 'Error',
    loadingBundle: 'Loading browser client runtime…',
    bundleLoaded:
      'Browser client runtime loaded. Connections can be opened now.',
    bundleError: 'Unable to load the browser client runtime.',
    retryBundle: 'Retry runtime',
    capabilitiesTitle: 'Available capabilities',
    capabilitiesIntro:
      'Each connected entry exposes docs-aware tools and resources for navigation, locale inspection, theme control, and page discovery.',
    capabilities: [
      {
        name: 'getPlaygroundInfo',
        description:
          'Return current route, locale, theme state, and resolved connection config.'
      },
      {
        name: 'echoConnectionConfig',
        description:
          'Echo arbitrary input together with the active connection settings.'
      },
      {
        name: 'navigateToPath',
        description:
          'Schedule navigation to a target docs path without interrupting the response.'
      },
      {
        name: 'getSupportedLanguages',
        description:
          'List locale labels, language codes, links, and which one is active.'
      },
      {
        name: 'setThemePreference',
        description:
          'Switch the docs site between light, dark, and auto appearance.'
      },
      {
        name: 'listPagesByPath',
        description:
          'Return matching docs pages for a path prefix from the current locale tree.'
      },
      {
        name: 'playground://connections/<id>',
        description: 'Expose the current connection snapshot as JSON.'
      },
      {
        name: 'playground://site/pages',
        description: 'Expose the current locale page index as JSON.'
      }
    ],
    cardResolvedUrl: 'Resolved server URL',
    cardClientId: 'Client ID',
    fieldName: 'Connection name',
    fieldSchema: 'Schema',
    fieldHost: 'Host',
    fieldUrl: 'URL override',
    fieldToken: 'Auth token',
    fieldUrlHint: 'If set, URL override takes precedence over schema + host.',
    fieldTokenHint:
      'Optional. Useful when the server expects a transport-carried token.',
    advanced: 'Advanced',
    advancedConfigured: 'Configured',
    namePlaceholder: 'Local dev server',
    hostPlaceholder: '127.0.0.1:7070',
    urlPlaceholder: 'ws://127.0.0.1:7070',
    tokenPlaceholder: 'browser-session-token',
    connect: 'Connect',
    disconnect: 'Disconnect',
    duplicate: 'Duplicate',
    remove: 'Remove',
    idle: 'Idle',
    connecting: 'Connecting',
    connected: 'Connected',
    disconnecting: 'Disconnecting',
    error: 'Error',
    idleDetail: 'Ready to open an MDP connection.',
    connectingDetail: 'Opening transport and registering the browser client…',
    disconnectingDetail:
      'Closing transport and unregistering the browser client…',
    disconnectedDetail: 'Connection closed.',
    connectedDetail: (url: string) => `Connected to ${url}.`,
    invalidUrl: 'The resolved URL must use ws, wss, http, or https.',
    defaultConnectionName: (index: number) => `Connection ${index}`,
    copySuffix: 'Copy',
    note:
      'Use the connection cards for quick local validation. Open Advanced only when you need URL override or auth.',
    emptyState: 'Add a connection to start configuring the playground.'
  },
  'zh-Hans': {
    badge: 'VitePress 布局页',
    title: '这是什么',
    intro:
      '直接在文档站里运行一个或多个浏览器侧 MDP client。每张连接卡对应一个目标 server，常用 transport 配置都会保留在主视图里。',
    endpoint: '连接地址',
    addConnection: '新增连接',
    connectAll: '全部连接',
    disconnectAll: '全部断开',
    reset: '重置',
    connections: '连接配置',
    total: '总数',
    active: '已连接',
    ready: '运行时',
    readyValue: '已就绪',
    loadingValue: '加载中',
    errorValue: '异常',
    loadingBundle: '正在加载浏览器 client 运行时…',
    bundleLoaded: '浏览器 client 运行时已加载，可以开始建立连接。',
    bundleError: '浏览器 client 运行时加载失败。',
    retryBundle: '重试运行时',
    capabilitiesTitle: '可用能力',
    capabilitiesIntro:
      '每个已连接项都会注册一组文档站感知能力，用来做导航、语言、主题和页面发现。',
    capabilities: [
      {
        name: 'getPlaygroundInfo',
        description: '返回当前路由、语言、主题状态和解析后的连接配置。'
      },
      {
        name: 'echoConnectionConfig',
        description: '回显任意输入，并附带当前连接配置。'
      },
      {
        name: 'navigateToPath',
        description: '跳转到指定文档路径，并在跳转前先返回调用结果。'
      },
      {
        name: 'getSupportedLanguages',
        description: '列出支持的语言标签、语言代码、入口链接以及当前激活项。'
      },
      {
        name: 'setThemePreference',
        description: '切换文档站的浅色、深色或跟随系统主题。'
      },
      {
        name: 'listPagesByPath',
        description: '根据路径前缀返回当前 locale 下匹配的文档页面。'
      },
      {
        name: 'playground://connections/<id>',
        description: '以 JSON resource 暴露当前连接快照。'
      },
      {
        name: 'playground://site/pages',
        description: '以 JSON resource 暴露当前 locale 的页面索引。'
      }
    ],
    cardResolvedUrl: '最终 server URL',
    cardClientId: 'Client ID',
    fieldName: '连接名称',
    fieldSchema: 'Schema',
    fieldHost: 'Host',
    fieldUrl: 'URL 覆盖',
    fieldToken: '鉴权 Token',
    fieldUrlHint: '如果填写 URL，会优先覆盖 schema + host 的组合结果。',
    fieldTokenHint: '可选；当 server 依赖 transport token 时比较有用。',
    advanced: '高级配置',
    advancedConfigured: '已配置',
    namePlaceholder: '本地开发环境',
    hostPlaceholder: '127.0.0.1:7070',
    urlPlaceholder: 'ws://127.0.0.1:7070',
    tokenPlaceholder: 'browser-session-token',
    connect: '连接',
    disconnect: '断开',
    duplicate: '复制',
    remove: '删除',
    idle: '空闲',
    connecting: '连接中',
    connected: '已连接',
    disconnecting: '断开中',
    error: '异常',
    idleDetail: '可以开始建立 MDP 连接。',
    connectingDetail: '正在打开 transport，并注册浏览器 client…',
    disconnectingDetail: '正在关闭 transport，并注销浏览器 client…',
    disconnectedDetail: '连接已关闭。',
    connectedDetail: (url: string) => `已连接到 ${url}。`,
    invalidUrl: '最终 URL 必须使用 ws、wss、http 或 https。',
    defaultConnectionName: (index: number) => `连接 ${index}`,
    copySuffix: '副本',
    note:
      '适合做本地联调和文档能力验证。只有在需要 URL 覆盖或鉴权时再打开高级配置。',
    emptyState: '新增一个连接后即可开始配置 playground。'
  }
} as const

const { isDark, lang, localeIndex, site, theme } = useData()

const copy = computed(
  () =>
    translations[
      (lang.value === 'zh-Hans' ? 'zh-Hans' : 'en-US') as 'en-US' | 'zh-Hans'
    ]
)
const currentLocalePrefix = computed(
  () => (localeIndex.value === 'root' ? '' : `/${localeIndex.value}`)
)
const docsPageEntries = computed(() => collectDocsPageEntries())

const bundleState = ref<'loading' | 'ready' | 'error'>('loading')
const bundleError = ref('')
const connections = ref<PlaygroundConnection[]>([createDefaultConnection(1)])
const sessions = new Map<string, PlaygroundSession>()
const expandedSchemaConnectionId = ref<string | null>(null)

let bundlePromise: Promise<void> | null = null

const totalConnections = computed(() => connections.value.length)
const activeConnections = computed(
  () =>
    connections.value.filter((connection) => connection.status === 'connected')
      .length
)

watch(
  connections,
  (value) => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(value.map((connection) => serializeConnection(connection)))
    )
  },
  { deep: true }
)

onMounted(async () => {
  connections.value = loadConnections()
  document.addEventListener('click', handleDocumentClick)
  await initializeBundle()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  for (const session of sessions.values()) {
    void session.client.disconnect().catch(() => undefined)
  }
  sessions.clear()
})

function handleDocumentClick(event: MouseEvent): void {
  const target = event.target

  if (!(target instanceof Element) || target.closest('.schema-selector')) {
    return
  }

  expandedSchemaConnectionId.value = null
}

async function initializeBundle(): Promise<void> {
  bundleState.value = 'loading'
  bundleError.value = ''

  try {
    await loadBundle()
    bundleState.value = 'ready'
  } catch (error) {
    bundleState.value = 'error'
    bundleError.value = normalizeError(error)
  }
}

function createDefaultConnection(index: number): PlaygroundConnection {
  return {
    id: createConnectionId(),
    name: copy.value.defaultConnectionName(index),
    schema: 'ws',
    host: DEFAULT_HOST,
    url: '',
    token: '',
    status: 'idle',
    detail: copy.value.idleDetail
  }
}

function loadConnections(): PlaygroundConnection[] {
  if (typeof window === 'undefined') {
    return [createDefaultConnection(1)]
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)

    if (!saved) {
      return [createDefaultConnection(1)]
    }

    const parsed = JSON.parse(saved) as unknown
    const items = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' &&
          Array.isArray((parsed as { connections?: unknown[] }).connections)
      ? (parsed as { connections: unknown[] }).connections
      : []

    if (items.length === 0) {
      return [createDefaultConnection(1)]
    }

    return items.map((item, index) => hydrateConnection(item, index))
  } catch {
    return [createDefaultConnection(1)]
  }
}

function hydrateConnection(
  value: unknown,
  index: number
): PlaygroundConnection {
  const record = value && typeof value === 'object'
    ? (value as Partial<StoredConnection>)
    : {}
  const schema = SCHEMAS.includes(record.schema as TransportSchema)
    ? record.schema
    : 'ws'

  return {
    id: typeof record.id === 'string' && record.id
      ? record.id
      : createConnectionId(),
    name: typeof record.name === 'string' && record.name
      ? record.name
      : copy.value.defaultConnectionName(index + 1),
    schema,
    host: typeof record.host === 'string' ? record.host : DEFAULT_HOST,
    url: typeof record.url === 'string' ? record.url : '',
    token: typeof record.token === 'string' ? record.token : '',
    status: 'idle',
    detail: copy.value.idleDetail
  }
}

function serializeConnection(
  connection: PlaygroundConnection
): StoredConnection {
  return {
    id: connection.id,
    name: connection.name,
    schema: connection.schema,
    host: connection.host,
    url: connection.url,
    token: connection.token
  }
}

function createConnectionId(): string {
  if (
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2, 10)
}

function loadBundle(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  if (window.MDP?.createMdpClient) {
    return Promise.resolve()
  }

  if (!bundlePromise) {
    bundlePromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-mdp-playground-runtime="true"]'
      )

      if (existing) {
        if (existing.dataset.loaded === 'true') {
          if (window.MDP?.createMdpClient) {
            resolve()
          } else {
            reject(new Error(copy.value.bundleError))
          }
          return
        }

        if (existing.dataset.failed === 'true') {
          reject(new Error(copy.value.bundleError))
          return
        }

        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener(
          'error',
          () => reject(new Error(copy.value.bundleError)),
          {
            once: true
          }
        )
        return
      }

      const script = document.createElement('script')
      script.src = withBase('/assets/modeldriveprotocol-client.global.js')
      script.async = true
      script.dataset.mdpPlaygroundRuntime = 'true'
      script.addEventListener(
        'load',
        () => {
          script.dataset.loaded = 'true'
          resolve()
        },
        { once: true }
      )
      script.addEventListener(
        'error',
        () => {
          script.dataset.failed = 'true'
          reject(new Error(copy.value.bundleError))
        },
        {
          once: true
        }
      )
      document.head.append(script)
    })
      .then(() => {
        if (!window.MDP?.createMdpClient) {
          throw new Error(copy.value.bundleError)
        }
      })
      .catch((error) => {
        bundlePromise = null
        throw error
      })
  }

  return bundlePromise
}

function statusLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'connecting':
      return copy.value.connecting
    case 'connected':
      return copy.value.connected
    case 'disconnecting':
      return copy.value.disconnecting
    case 'error':
      return copy.value.error
    default:
      return copy.value.idle
  }
}

function resolvedUrl(connection: PlaygroundConnection): string {
  const explicitUrl = connection.url.trim()

  if (explicitUrl) {
    return explicitUrl
  }

  return `${connection.schema}://${connection.host.trim() || DEFAULT_HOST}`
}

function clientId(connection: PlaygroundConnection): string {
  return `mdp-playground-${connection.id}`
}

function statusIcon(status: ConnectionStatus): IconName {
  switch (status) {
    case 'connecting':
      return 'connect'
    case 'connected':
      return 'activity'
    case 'disconnecting':
      return 'disconnect'
    case 'error':
      return 'shield'
    default:
      return 'server'
  }
}

function canEdit(connection: PlaygroundConnection): boolean {
  return connection.status === 'idle' || connection.status === 'error'
}

function canConnect(connection: PlaygroundConnection): boolean {
  return (
    bundleState.value === 'ready' &&
    connection.status !== 'connected' &&
    connection.status !== 'connecting' &&
    connection.status !== 'disconnecting'
  )
}

function canToggleConnection(connection: PlaygroundConnection): boolean {
  return (
    connection.status !== 'connecting' &&
    connection.status !== 'disconnecting' &&
    (bundleState.value === 'ready' || connection.status === 'connected')
  )
}

function hasAdvancedConfig(connection: PlaygroundConnection): boolean {
  return Boolean(connection.url.trim() || connection.token.trim())
}

function schemaIcon(schema: TransportSchema): IconName {
  switch (schema) {
    case 'http':
      return 'globe'
    case 'https':
      return 'shield'
    case 'wss':
      return 'shield'
    default:
      return 'connect'
  }
}

function toggleSchemaMenu(connectionId: string): void {
  expandedSchemaConnectionId.value =
    expandedSchemaConnectionId.value === connectionId ? null : connectionId
}

function setSchema(connectionId: string, schema: TransportSchema): void {
  updateConnection(connectionId, { schema })
  expandedSchemaConnectionId.value = null
}

function toggleConnection(connectionId: string, enabled: boolean): void {
  if (enabled) {
    void connectConnection(connectionId)
    return
  }

  void disconnectConnection(connectionId)
}

function updateConnection(
  connectionId: string,
  patch: Partial<StoredConnection>
): void {
  const connection = findConnection(connectionId)

  if (!connection || !canEdit(connection)) {
    return
  }

  Object.assign(connection, patch)

  if (connection.status === 'error') {
    connection.status = 'idle'
    connection.detail = copy.value.idleDetail
  }
}

function addConnection(): void {
  connections.value.push(createDefaultConnection(connections.value.length + 1))
}

function removeConnection(connectionId: string): void {
  if (connections.value.length === 1) {
    return
  }

  const connection = findConnection(connectionId)

  if (!connection || !canEdit(connection)) {
    return
  }

  connections.value = connections.value.filter((item) =>
    item.id !== connectionId
  )
}

async function resetConnections(): Promise<void> {
  await disconnectAll(true)
  connections.value = [createDefaultConnection(1)]
}

async function disconnectAll(silent = false): Promise<void> {
  for (const connection of connections.value) {
    if (sessions.has(connection.id) || connection.status === 'connected') {
      await disconnectConnection(connection.id, silent)
    }
  }
}

async function connectConnection(connectionId: string): Promise<void> {
  const connection = findConnection(connectionId)

  if (!connection || !canConnect(connection)) {
    return
  }

  const targetUrl = resolvedUrl(connection)

  try {
    assertSupportedUrl(targetUrl)
  } catch (error) {
    connection.status = 'error'
    connection.detail = normalizeError(error)
    return
  }

  if (!window.MDP?.createMdpClient) {
    connection.status = 'error'
    connection.detail = copy.value.bundleError
    return
  }

  connection.status = 'connecting'
  connection.detail = copy.value.connectingDetail

  const client = window.MDP.createMdpClient({
    serverUrl: targetUrl,
    ...(connection.token.trim()
      ? { auth: { token: connection.token.trim() } }
      : {}),
    client: {
      id: clientId(connection),
      name: connection.name.trim() || copy.value.defaultConnectionName(1),
      description: 'MDP docs playground browser client',
      platform: 'web',
      metadata: {
        source: 'vitepress-playground',
        route: window.location.pathname
      }
    }
  })

  registerDemoCapabilities(client, connection)

  try {
    await client.connect()
    client.register()
    sessions.set(connectionId, { client })
    connection.status = 'connected'
    connection.detail = copy.value.connectedDetail(targetUrl)
  } catch (error) {
    try {
      await client.disconnect()
    } catch {
      // Best effort cleanup only.
    }
    connection.status = 'error'
    connection.detail = normalizeError(error)
  }
}

async function disconnectConnection(
  connectionId: string,
  silent = false
): Promise<void> {
  const connection = findConnection(connectionId)
  const session = sessions.get(connectionId)

  if (!connection) {
    return
  }

  if (!session) {
    connection.status = 'idle'
    connection.detail = silent
      ? copy.value.idleDetail
      : copy.value.disconnectedDetail
    return
  }

  connection.status = 'disconnecting'
  connection.detail = copy.value.disconnectingDetail

  try {
    await session.client.disconnect()
    connection.status = 'idle'
    connection.detail = silent
      ? copy.value.idleDetail
      : copy.value.disconnectedDetail
  } catch (error) {
    connection.status = 'error'
    connection.detail = normalizeError(error)
  } finally {
    sessions.delete(connectionId)
  }
}

function collectDocsPageEntries(): DocsPageEntry[] {
  const entries: DocsPageEntry[] = []
  const seen = new Set<string>()

  const addEntry = (
    title: string,
    path: string,
    section: string | null
  ): void => {
    const normalizedPath = normalizeDocsPath(path)

    if (!normalizedPath || seen.has(normalizedPath)) {
      return
    }

    seen.add(normalizedPath)
    entries.push({
      title,
      path: normalizedPath,
      section
    })
  }

  const walk = (value: unknown, section: string | null = null): void => {
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, section))
      return
    }

    if (!value || typeof value !== 'object') {
      return
    }

    const record = value as {
      text?: string
      link?: string
      items?: unknown[]
    }

    if (typeof record.link === 'string' && !EXTERNAL_URL_RE.test(record.link)) {
      addEntry(record.text || record.link, record.link, section)
    }

    const nextSection = typeof record.text === 'string' && !record.link
      ? record.text
      : section

    if (Array.isArray(record.items)) {
      walk(record.items, nextSection)
    }
  }

  walk(theme.value.nav)

  const sidebar = theme.value.sidebar
  if (sidebar && typeof sidebar === 'object') {
    Object.values(sidebar as Record<string, unknown>).forEach((group) =>
      walk(group)
    )
  }

  return entries
}

function normalizeDocsPath(value: string): string {
  const trimmed = value.trim()

  if (!trimmed || EXTERNAL_URL_RE.test(trimmed)) {
    return trimmed
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  const withoutHash = withLeadingSlash.replace(/[?#].*$/, '')
  const normalized = withoutHash
    .replace(/\/index(?:\.html)?$/i, '/')
    .replace(/\.html$/i, '')
    .replace(/\/{2,}/g, '/')

  if (normalized === '/') {
    return normalized
  }

  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}

function resolveDocsPath(input: string): string {
  const normalized = normalizeDocsPath(input)

  if (!normalized) {
    throw new Error('Path is required.')
  }

  if (EXTERNAL_URL_RE.test(normalized)) {
    return normalized
  }

  const localeCandidate = currentLocalePrefix.value &&
      !normalized.startsWith(`${currentLocalePrefix.value}/`) &&
      normalized !== currentLocalePrefix.value
    ? `${currentLocalePrefix.value}${normalized === '/' ? '' : normalized}`
    : normalized

  const knownPaths = docsPageEntries.value.map((entry) => entry.path)
  const targetPath =
    typeof localeCandidate === 'string' && knownPaths.includes(localeCandidate)
      ? localeCandidate
      : normalized

  return withBase(targetPath === '/' ? '/' : targetPath)
}

function resolveDocsPrefix(input?: string): string {
  const normalized = normalizeDocsPath(
    input || currentLocalePrefix.value || '/'
  )

  if (
    !currentLocalePrefix.value ||
    normalized === currentLocalePrefix.value ||
    normalized.startsWith(`${currentLocalePrefix.value}/`)
  ) {
    return normalized
  }

  const localeCandidate = `${currentLocalePrefix.value}${
    normalized === '/' ? '' : normalized
  }`
  const hasLocaleMatches = docsPageEntries.value.some(
    (entry) =>
      entry.path === localeCandidate ||
      entry.path.startsWith(`${localeCandidate}/`)
  )

  return hasLocaleMatches ? localeCandidate : normalized
}

function getSupportedLanguages(): Array<Record<string, unknown>> {
  return Object.entries(site.value.locales || {}).map(([key, locale]) => {
    const config = locale && typeof locale === 'object'
      ? (locale as Record<string, unknown>)
      : {}
    const link = typeof config.link === 'string'
      ? config.link
      : key === 'root'
      ? '/'
      : `/${key}/`

    return {
      key,
      label: typeof config.label === 'string' ? config.label : key,
      lang: typeof config.lang === 'string' ? config.lang : site.value.lang,
      path: withBase(link),
      active: key === localeIndex.value
    }
  })
}

function getThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'auto'
  }

  const stored = window.localStorage.getItem(APPEARANCE_KEY)
  return isThemePreference(stored) ? stored : 'auto'
}

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' &&
    THEME_PREFERENCES.includes(value as ThemePreference)
}

function resolveDarkMode(preference: ThemePreference): boolean {
  if (preference === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  return preference === 'dark'
}

function applyThemePreference(
  preference: ThemePreference
): Record<string, unknown> {
  window.localStorage.setItem(APPEARANCE_KEY, preference)
  const dark = resolveDarkMode(preference)
  document.documentElement.classList.toggle('dark', dark)

  return {
    preference,
    appliedTheme: dark ? 'dark' : 'light'
  }
}

function getPageContext(): Record<string, unknown> {
  return {
    title: document.title,
    url: window.location.href,
    path: window.location.pathname,
    lang: document.documentElement.lang || lang.value,
    locale: localeIndex.value,
    themePreference: getThemePreference(),
    activeTheme: isDark.value ? 'dark' : 'light'
  }
}

function registerDemoCapabilities(
  client: PlaygroundClient,
  connection: PlaygroundConnection
): void {
  client.exposeTool(
    'getPlaygroundInfo',
    async (_args, context) => ({
      page: getPageContext(),
      connection: describeConnection(connection),
      authToken: context && typeof context === 'object' && 'auth' in context
        ? (context as { auth?: { token?: string } }).auth?.token ?? null
        : null
    }),
    {
      description:
        'Return docs page metadata and the active playground connection config.'
    }
  )

  client.exposeTool(
    'echoConnectionConfig',
    async (args, context) => ({
      args: args ?? null,
      connection: describeConnection(connection),
      authToken: context && typeof context === 'object' && 'auth' in context
        ? (context as { auth?: { token?: string } }).auth?.token ?? null
        : null
    }),
    {
      description:
        'Echo arbitrary input together with the active playground connection config.',
      inputSchema: {
        type: 'object',
        additionalProperties: true
      }
    }
  )

  client.exposeTool(
    'navigateToPath',
    async (args) => {
      const requestedPath = args && typeof args === 'object' && 'path' in args
        ? (args as { path?: unknown }).path
        : null

      if (typeof requestedPath !== 'string' || !requestedPath.trim()) {
        throw new Error('path must be a non-empty string')
      }

      const target = resolveDocsPath(requestedPath)
      window.setTimeout(() => {
        window.location.assign(target)
      }, 80)

      return {
        scheduled: true,
        target
      }
    },
    {
      description: 'Navigate the docs site to a target path.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Docs path to open, for example /playground or /zh-Hans/guide/introduction'
          }
        },
        required: ['path'],
        additionalProperties: false
      }
    }
  )

  client.exposeTool(
    'getSupportedLanguages',
    async () => ({
      current: localeIndex.value,
      items: getSupportedLanguages()
    }),
    {
      description: 'Return the language entries configured in the docs site.'
    }
  )

  client.exposeTool(
    'setThemePreference',
    async (args) => {
      const requestedTheme = args && typeof args === 'object' && 'theme' in args
        ? (args as { theme?: unknown }).theme
        : null

      if (!isThemePreference(requestedTheme)) {
        throw new Error('theme must be one of: light, dark, auto')
      }

      return applyThemePreference(requestedTheme)
    },
    {
      description: 'Switch the docs appearance preference.',
      inputSchema: {
        type: 'object',
        properties: {
          theme: {
            type: 'string',
            enum: THEME_PREFERENCES
          }
        },
        required: ['theme'],
        additionalProperties: false
      }
    }
  )

  client.exposeTool(
    'listPagesByPath',
    async (args) => {
      const requestedPrefix =
        args && typeof args === 'object' && 'prefix' in args
          ? (args as { prefix?: unknown }).prefix
          : undefined
      const prefix =
        typeof requestedPrefix === 'string' && requestedPrefix.trim()
          ? resolveDocsPrefix(requestedPrefix)
          : resolveDocsPrefix()

      const items = docsPageEntries.value.filter((entry) => {
        if (prefix === '/') {
          return true
        }

        return entry.path === prefix || entry.path.startsWith(`${prefix}/`)
      })

      return {
        prefix,
        count: items.length,
        items
      }
    },
    {
      description:
        'List docs pages by path prefix from the current locale navigation tree.',
      inputSchema: {
        type: 'object',
        properties: {
          prefix: {
            type: 'string',
            description:
              'Optional docs path prefix, for example /guide or /zh-Hans/reference'
          }
        },
        additionalProperties: false
      }
    }
  )

  client.exposeResource(
    `playground://connections/${connection.id}`,
    async () => ({
      mimeType: 'application/json',
      text: JSON.stringify(
        {
          page: getPageContext(),
          connection: describeConnection(connection)
        },
        null,
        2
      )
    }),
    {
      name: `Playground Connection ${connection.name.trim() || connection.id}`,
      description: 'Serialized playground connection snapshot.',
      mimeType: 'application/json'
    }
  )

  client.exposeResource(
    'playground://site/pages',
    async () => ({
      mimeType: 'application/json',
      text: JSON.stringify(
        {
          locale: localeIndex.value,
          items: docsPageEntries.value
        },
        null,
        2
      )
    }),
    {
      name: 'Playground Site Pages',
      description: 'Serialized docs page index for the current locale.',
      mimeType: 'application/json'
    }
  )
}

function describeConnection(
  connection: PlaygroundConnection
): Record<string, unknown> {
  return {
    id: connection.id,
    name: connection.name.trim() || copy.value.defaultConnectionName(1),
    schema: connection.schema,
    host: connection.host.trim(),
    url: connection.url.trim() || null,
    resolvedUrl: resolvedUrl(connection),
    tokenConfigured: Boolean(connection.token.trim())
  }
}

function assertSupportedUrl(value: string): void {
  const parsed = new URL(value)
  const protocol = parsed.protocol.replace(':', '')

  if (!SCHEMAS.includes(protocol as TransportSchema)) {
    throw new Error(copy.value.invalidUrl)
  }
}

function findConnection(
  connectionId: string
): PlaygroundConnection | undefined {
  return connections.value.find((connection) => connection.id === connectionId)
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}
</script>

<template>
  <section class="playground-shell">
    <div class="playground-frame">
      <section class="summary-strip">
        <section class="summary-grid">
          <article class="summary-card">
            <UiIcon name="stack" />
            <div class="summary-copy">
              <span class="summary-label">{{ copy.total }}</span>
              <strong class="summary-value">{{ totalConnections }}</strong>
            </div>
          </article>
          <article class="summary-card">
            <UiIcon name="activity" />
            <div class="summary-copy">
              <span class="summary-label">{{ copy.active }}</span>
              <strong class="summary-value">{{ activeConnections }}</strong>
            </div>
          </article>
          <article class="summary-card">
            <UiIcon name="bolt" />
            <div class="summary-copy">
              <span class="summary-label">{{ copy.ready }}</span>
              <strong class="summary-value">
                {{
                  bundleState === 'ready'
                  ? copy.readyValue
                  : bundleState === 'error'
                  ? copy.errorValue
                  : copy.loadingValue
                }}
              </strong>
            </div>
          </article>
        </section>
      </section>

      <div class="playground-main">
        <section class="connections panel">
          <div class="section-heading">
            <div class="section-heading-copy">
              <div class="section-heading-icon">
                <UiIcon name="server" />
              </div>
              <h2>{{ copy.connections }}</h2>
            </div>
            <div class="section-actions">
              <button
                type="button"
                class="icon-button"
                :title="copy.addConnection"
                :aria-label="copy.addConnection"
                @click="addConnection"
              >
                <UiIcon name="plus" />
              </button>
              <button
                type="button"
                class="icon-button"
                :title="copy.reset"
                :aria-label="copy.reset"
                @click="resetConnections"
              >
                <UiIcon name="reset" />
              </button>
            </div>
          </div>

          <div v-if="connections.length === 0" class="empty-state">
            {{ copy.emptyState }}
          </div>

          <div class="connection-grid">
            <article
              v-for="connection in connections"
              :key="connection.id"
              class="connection-card"
              :class="`connection-card--${connection.status}`"
            >
              <div class="card-top">
                <div class="card-identity">
                  <span class="status-pill">
                    <UiIcon :name="statusIcon(connection.status)" />
                    {{ statusLabel(connection.status) }}
                  </span>
                  <p class="card-title" :title="clientId(connection)">
                    {{ clientId(connection) }}
                  </p>
                </div>
                <div class="card-top-actions">
                  <button
                    type="button"
                    class="icon-button"
                    :title="copy.remove"
                    :aria-label="copy.remove"
                    :disabled="connections.length === 1 ||
                    !canEdit(connection)"
                    @click="removeConnection(connection.id)"
                  >
                    <UiIcon name="trash" />
                  </button>
                  <label
                    class="switch"
                    :title="connection.status === 'connected'
                    ? copy.disconnect
                    : copy.connect"
                  >
                    <input
                      type="checkbox"
                      :checked="connection.status === 'connected'"
                      :disabled="!canToggleConnection(connection)"
                      @change="toggleConnection(
                        connection.id,
                        ($event
                          .target as HTMLInputElement)
                          .checked
                      )"
                    >
                    <span class="switch-track">
                      <span class="switch-thumb" />
                    </span>
                  </label>
                </div>
              </div>

              <div class="endpoint-block">
                <span class="field-label">
                  <UiIcon name="globe" />
                  {{ copy.endpoint }}
                </span>
                <div class="endpoint-control">
                  <div class="schema-selector">
                    <button
                      type="button"
                      class="schema-trigger"
                      :class="{
                        'schema-trigger--open':
                          expandedSchemaConnectionId ===
                            connection.id
                      }"
                      :title="`${copy.fieldSchema}: ${connection.schema.toUpperCase()}`"
                      :aria-label="`${copy.fieldSchema}: ${connection.schema.toUpperCase()}`"
                      :aria-expanded="expandedSchemaConnectionId ===
                      connection.id"
                      :disabled="!canEdit(connection)"
                      @click="toggleSchemaMenu(connection.id)"
                    >
                      <UiIcon :name="schemaIcon(connection.schema)" />
                    </button>
                    <div
                      class="schema-options"
                      :class="{
                        'schema-options--open':
                          expandedSchemaConnectionId ===
                            connection.id
                      }"
                      :aria-label="copy.fieldSchema"
                      :aria-hidden="expandedSchemaConnectionId !==
                      connection.id"
                    >
                      <button
                        v-for="schema in SCHEMAS"
                        :key="schema"
                        type="button"
                        class="schema-option"
                        :class="{
                          'schema-option--active':
                            connection.schema === schema
                        }"
                        :title="schema.toUpperCase()"
                        :aria-label="schema.toUpperCase()"
                        :disabled="!canEdit(connection)"
                        @click="setSchema(
                          connection.id,
                          schema
                        )"
                      >
                        <UiIcon :name="schemaIcon(schema)" />
                      </button>
                    </div>
                  </div>
                  <label class="host-shell">
                    <span class="host-prefix">{{ connection.schema }}://</span>
                    <input
                      :value="connection.host"
                      :title="copy.fieldHost"
                      :placeholder="copy.hostPlaceholder"
                      :disabled="!canEdit(connection)"
                      @input="updateConnection(connection.id, {
                        host: ($event
                          .target as HTMLInputElement)
                          .value
                      })"
                    >
                  </label>
                </div>
              </div>

              <details class="advanced-panel">
                <summary>
                  <span class="advanced-summary">
                    <span class="advanced-title">
                      <UiIcon name="sliders" />
                      {{ copy.advanced }}
                    </span>
                    <span
                      v-if="hasAdvancedConfig(connection)"
                      class="advanced-badge"
                    >
                      {{ copy.advancedConfigured }}
                    </span>
                    <UiIcon name="chevron" />
                  </span>
                </summary>

                <div class="field-grid field-grid--advanced">
                  <label class="field field--wide">
                    <span>{{ copy.fieldUrl }}</span>
                    <input
                      :value="connection.url"
                      :placeholder="copy.urlPlaceholder"
                      :disabled="!canEdit(connection)"
                      @input="updateConnection(connection.id, {
                        url: ($event
                          .target as HTMLInputElement)
                          .value
                      })"
                    >
                    <small>{{ copy.fieldUrlHint }}</small>
                  </label>

                  <label class="field">
                    <span>{{ copy.fieldToken }}</span>
                    <input
                      :value="connection.token"
                      :placeholder="copy.tokenPlaceholder"
                      :disabled="!canEdit(connection)"
                      @input="updateConnection(connection.id, {
                        token: ($event
                          .target as HTMLInputElement)
                          .value
                      })"
                    >
                    <small>{{ copy.fieldTokenHint }}</small>
                  </label>
                </div>
              </details>
            </article>
          </div>
        </section>

        <aside class="playground-sidebar">
          <section class="intro-panel panel">
            <p class="section-label">
              <UiIcon name="spark" />
              {{ copy.title }}
            </p>
            <p class="section-copy">
              {{ copy.intro }}
            </p>
            <p class="sidebar-note">
              {{ copy.note }}
            </p>
          </section>

          <section class="capabilities panel">
            <div class="capabilities-heading">
              <p class="section-label">
                <UiIcon name="spark" />
                {{ copy.capabilitiesTitle }}
              </p>
              <span class="capability-count">{{
                copy.capabilities.length
              }}</span>
            </div>
            <div>
              <p class="section-copy">
                {{ copy.capabilitiesIntro }}
              </p>
              <ul class="capability-list">
                <li
                  v-for="capability in copy.capabilities"
                  :key="capability.name"
                >
                  <strong class="capability-name">{{ capability.name }}</strong>
                  <span class="capability-description">{{
                    capability.description
                  }}</span>
                </li>
              </ul>
            </div>
            <div v-if="bundleState === 'error'" class="capability-warning">
              {{ bundleError || copy.bundleError }}
            </div>
            <div
              v-else-if="bundleState === 'loading'"
              class="capability-status"
            >
              <UiIcon name="bolt" />
              {{ copy.loadingBundle }}
            </div>
            <div v-else class="capability-status">
              <UiIcon name="bolt" />
              {{ copy.bundleLoaded }}
            </div>
          </section>
        </aside>
      </div>
    </div>
  </section>
</template>

<style scoped>
.playground-shell {
  --playground-paper: rgba(255, 255, 255, .78);
  --playground-line: rgba(24, 36, 43, .12);
  --playground-ink: #16252d;
  --playground-muted: #59707a;
  --playground-accent: #0f766e;
  --playground-accent-strong: #115e59;
  --playground-warning: #b45309;
  --playground-danger: #b42318;
  --playground-control-height: 36px;
  --playground-bg:
    radial-gradient(
    circle at top left,
    rgba(15, 118, 110, .18),
    transparent 32%
  ),
    radial-gradient(
    circle at top right,
    rgba(180, 83, 9, .16),
    transparent 28%
  ),
    linear-gradient(180deg, #f6f2e7 0%, #eef5f4 100%);
  --playground-panel-shadow: 0 6px 18px rgba(22, 37, 45, .04);
  --playground-card-shadow: 0 2px 8px rgba(22, 37, 45, .03);
  --playground-button-border: rgba(22, 37, 45, .14);
  --playground-button-bg: rgba(255, 255, 255, .82);
  --playground-button-hover-border: rgba(15, 118, 110, .28);
  --playground-section-icon-bg: rgba(15, 118, 110, .1);
  --playground-runtime-ready-border: rgba(15, 118, 110, .22);
  --playground-runtime-error-border: rgba(180, 35, 24, .24);
  --playground-empty-bg: rgba(255, 255, 255, .56);
  --playground-card-border: rgba(22, 37, 45, .1);
  --playground-card-bg: rgba(255, 255, 255, .74);
  --playground-card-connected-border: rgba(15, 118, 110, .22);
  --playground-card-error-border: rgba(180, 35, 24, .24);
  --playground-status-bg: rgba(15, 118, 110, .1);
  --playground-switch-border: rgba(22, 37, 45, .16);
  --playground-switch-bg: rgba(255, 255, 255, .8);
  --playground-switch-thumb-bg: #ffffff;
  --playground-switch-thumb-shadow: 0 2px 6px rgba(22, 37, 45, .14);
  --playground-switch-checked-bg: rgba(15, 118, 110, .18);
  --playground-switch-checked-border: rgba(15, 118, 110, .28);
  --playground-schema-active-border: rgba(15, 118, 110, .26);
  --playground-schema-active-bg: rgba(15, 118, 110, .14);
  --playground-input-border: rgba(22, 37, 45, .14);
  --playground-input-bg: rgba(255, 255, 255, .82);
  --playground-input-focus-border: rgba(15, 118, 110, .5);
  --playground-input-focus-ring: 0 0 0 4px rgba(15, 118, 110, .12);
  --playground-divider: rgba(22, 37, 45, .12);
  --playground-disabled-bg: rgba(235, 240, 240, .72);
  --playground-disabled-ink: rgba(22, 37, 45, .62);
  height: calc(100vh - var(--vp-nav-height));
  margin-top: var(--vp-nav-height);
  padding: 12px 18px 18px;
  overflow: hidden;
  background: var(--playground-bg);
  color: var(--playground-ink);
}

.playground-frame {
  width: min(1240px, 100%);
  height: 100%;
  margin: 0 auto;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
}

.ui-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex: none;
  font-size: 18px;
  line-height: 1;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;
}

.summary-strip {
  display: grid;
}

.summary-grid {
  display: grid;
  gap: 10px;
}

.summary-card,
.panel {
  border: 1px solid var(--playground-line);
  background: var(--playground-paper);
  backdrop-filter: blur(16px);
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 18px;
  box-shadow: var(--playground-panel-shadow);
}

.summary-card .ui-icon {
  color: var(--playground-accent-strong);
}

.summary-copy {
  display: grid;
}

.summary-label,
.section-label,
.field-label,
.advanced-title {
  font-family: 'IBM Plex Mono', 'SFMono-Regular', ui-monospace, monospace;
  text-transform: uppercase;
  letter-spacing: .12em;
  font-size: .72rem;
}

.summary-label,
.section-label {
  color: var(--playground-accent-strong);
  margin: 0;
}

.summary-value {
  display: block;
  margin-top: 4px;
  font-size: 1.3rem;
  letter-spacing: -.04em;
}

.playground-main {
  min-height: 0;
  display: grid;
  gap: 12px;
}

.panel {
  border-radius: 18px;
  box-shadow: var(--playground-panel-shadow);
}

.connections {
  min-height: 0;
  padding: 14px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-heading-copy {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.section-heading h2 {
  margin: 0;
  font-size: 1.2rem;
  letter-spacing: -.03em;
}

.section-heading-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 12px;
  background: var(--playground-section-icon-bg);
  color: var(--playground-accent-strong);
}

.section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-button,
.schema-trigger,
.schema-option {
  appearance: none;
  width: var(--playground-control-height);
  height: var(--playground-control-height);
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--playground-button-border);
  border-radius: 10px;
  background: var(--playground-button-bg);
  color: var(--playground-ink);
  cursor: pointer;
  transition:
    transform .16s ease,
    border-color .16s ease,
    background-color .16s ease,
    color .16s ease;
}

.icon-button .ui-icon,
.schema-trigger .ui-icon,
.schema-option .ui-icon {
  color: inherit;
}

.icon-button:hover:not(:disabled),
.schema-trigger:hover:not(:disabled),
.schema-option:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: var(--playground-button-hover-border);
}

.icon-button:disabled,
.schema-trigger:disabled,
.schema-option:disabled {
  opacity: .45;
  cursor: not-allowed;
  transform: none;
}

.playground-sidebar {
  min-height: 0;
  display: grid;
  gap: 12px;
  align-content: start;
}

.intro-panel,
.capabilities {
  padding: 14px 16px;
}

.section-copy,
.sidebar-note,
.field small,
.capability-description,
.capability-warning,
.capability-status {
  color: var(--playground-muted);
}

.section-copy,
.sidebar-note {
  margin: 8px 0 0;
  line-height: 1.5;
}

.sidebar-note {
  font-size: .88rem;
}

.capabilities-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.capability-count {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--playground-status-bg);
  color: var(--playground-accent-strong);
  font-family: 'IBM Plex Mono', 'SFMono-Regular', ui-monospace, monospace;
  font-size: .72rem;
  letter-spacing: .08em;
}

.capability-list {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.capability-list li {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--playground-line);
  border-radius: 12px;
  background: rgba(255, 255, 255, .42);
}

.capability-name {
  font-family: 'IBM Plex Mono', 'SFMono-Regular', ui-monospace, monospace;
  font-size: .76rem;
  line-height: 1.35;
  color: var(--playground-accent-strong);
}

.capability-description {
  line-height: 1.45;
  font-size: .86rem;
}

.capability-warning,
.capability-status {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--playground-line);
  background: rgba(255, 255, 255, .42);
}

.capability-warning {
  border-color: var(--playground-runtime-error-border);
}

.capability-status {
  display: flex;
  align-items: center;
  gap: 8px;
  border-color: var(--playground-runtime-ready-border);
}

.empty-state {
  padding: 18px;
  border: 1px dashed var(--playground-line);
  border-radius: 16px;
  background: var(--playground-empty-bg);
  color: var(--playground-muted);
}

.connection-grid {
  display: grid;
  gap: 10px;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.connection-card {
  border: 1px solid var(--playground-card-border);
  border-radius: 16px;
  background: var(--playground-card-bg);
  padding: 12px 14px;
  box-shadow: var(--playground-card-shadow);
}

.connection-card--connected {
  border-color: var(--playground-card-connected-border);
}

.connection-card--error {
  border-color: var(--playground-card-error-border);
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.card-identity {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  padding: 4px 9px;
  border-radius: 999px;
  background: var(--playground-status-bg);
  color: var(--playground-accent-strong);
  font-size: .74rem;
  font-weight: 600;
}

.card-title {
  margin: 0;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', ui-monospace, monospace;
  font-size: .84rem;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-track {
  width: 40px;
  height: 24px;
  padding: 2px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid var(--playground-switch-border);
  background: var(--playground-switch-bg);
  transition: background-color .18s ease, border-color .18s ease;
}

.switch-thumb {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--playground-switch-thumb-bg);
  box-shadow: var(--playground-switch-thumb-shadow);
  transition: transform .18s ease;
}

.switch input:checked + .switch-track {
  background: var(--playground-switch-checked-bg);
  border-color: var(--playground-switch-checked-border);
}

.switch input:checked + .switch-track .switch-thumb {
  transform: translateX(16px);
}

.switch input:disabled + .switch-track {
  opacity: .45;
}

.endpoint-block {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.field-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: .8rem;
  font-weight: 600;
}

.endpoint-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.schema-selector {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.schema-trigger {
  flex: none;
  color: var(--playground-accent-strong);
}

.schema-trigger--open,
.schema-option--active {
  border-color: var(--playground-schema-active-border);
  background: var(--playground-schema-active-bg);
  color: var(--playground-accent-strong);
}

.schema-options {
  max-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  transform: translateX(-6px);
  transform-origin: left center;
  transition: max-width .2s ease, opacity .16s ease, transform .16s ease;
}

.schema-options--open {
  max-width: 168px;
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.schema-option {
  flex: none;
  color: var(--playground-muted);
}

.host-shell {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  min-height: var(--playground-control-height);
  border: 1px solid var(--playground-input-border);
  border-radius: 12px;
  background: var(--playground-input-bg);
}

.host-shell:focus-within {
  border-color: var(--playground-input-focus-border);
  box-shadow: var(--playground-input-focus-ring);
}

.host-prefix {
  height: 100%;
  padding: 0 0 0 10px;
  display: inline-flex;
  align-items: center;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', ui-monospace, monospace;
  font-size: .8rem;
  color: var(--playground-muted);
  white-space: nowrap;
}

.host-shell input,
.field input {
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--playground-ink);
  font-size: .92rem;
}

.host-shell input {
  height: calc(var(--playground-control-height) - 2px);
  padding: 0 10px 0 8px;
  line-height: calc(var(--playground-control-height) - 2px);
}

.advanced-panel {
  margin-top: 10px;
  border-top: 1px dashed var(--playground-divider);
  padding-top: 10px;
}

.advanced-panel summary {
  list-style: none;
  cursor: pointer;
}

.advanced-panel summary::-webkit-details-marker {
  display: none;
}

.advanced-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: .82rem;
  font-weight: 600;
  color: var(--playground-muted);
}

.advanced-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--playground-ink);
}

.advanced-badge {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--playground-status-bg);
  color: var(--playground-accent-strong);
  font-size: .7rem;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.advanced-summary > .ui-icon:last-child {
  transition: transform .18s ease;
}

.advanced-panel[open] .advanced-summary > .ui-icon:last-child {
  transform: rotate(180deg);
}

.field-grid {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: .82rem;
  font-weight: 600;
}

.field input {
  border: 1px solid var(--playground-input-border);
  border-radius: 12px;
  background: var(--playground-input-bg);
  min-height: var(--playground-control-height);
  padding: 0 11px;
  line-height: calc(var(--playground-control-height) - 2px);
  transition: border-color .2s ease, box-shadow .2s ease;
}

.field input:focus {
  border-color: var(--playground-input-focus-border);
  box-shadow: var(--playground-input-focus-ring);
}

.field input:disabled {
  background: var(--playground-disabled-bg);
  color: var(--playground-disabled-ink);
  cursor: not-allowed;
}

.field small {
  line-height: 1.35;
  font-size: .76rem;
}

@media (min-width: 720px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .field-grid--advanced {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  }

  .field-grid--advanced .field--wide {
    grid-column: auto;
  }
}

@media (min-width: 960px) {
  .playground-shell {
    padding: 14px 22px 22px;
  }

  .playground-main {
    grid-template-columns: minmax(0, 1.45fr) 360px;
  }

  .playground-sidebar {
    grid-template-rows: auto minmax(0, 1fr);
  }

  .capabilities {
    min-height: 0;
    overflow: auto;
  }
}

@media (max-width: 959px) {
  .playground-shell {
    height: auto;
    min-height: calc(100vh - var(--vp-nav-height));
    overflow: visible;
  }

  .playground-frame,
  .playground-main,
  .connections,
  .connection-grid,
  .playground-sidebar {
    min-height: unset;
  }

  .playground-frame {
    height: auto;
  }
}

@media (max-width: 640px) {
  .endpoint-control {
    align-items: stretch;
    flex-direction: column;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .schema-selector {
    width: 100%;
  }

  .schema-options--open {
    max-width: 100%;
  }
}
</style>

<style>
html.dark .playground-shell {
  --playground-paper: rgba(15, 23, 28, .82);
  --playground-line: rgba(148, 163, 184, .18);
  --playground-ink: #e5eef0;
  --playground-muted: #9bb0b8;
  --playground-accent: #2dd4bf;
  --playground-accent-strong: #5eead4;
  --playground-warning: #f59e0b;
  --playground-danger: #f87171;
  --playground-bg:
    radial-gradient(
    circle at top left,
    rgba(45, 212, 191, .16),
    transparent 32%
  ),
    radial-gradient(
    circle at top right,
    rgba(245, 158, 11, .12),
    transparent 28%
  ),
    linear-gradient(180deg, #071217 0%, #0b1a20 100%);
  --playground-panel-shadow: 0 10px 28px rgba(0, 0, 0, .28);
  --playground-card-shadow: 0 6px 18px rgba(0, 0, 0, .18);
  --playground-button-border: rgba(148, 163, 184, .22);
  --playground-button-bg: rgba(15, 23, 28, .88);
  --playground-button-hover-border: rgba(45, 212, 191, .44);
  --playground-section-icon-bg: rgba(45, 212, 191, .14);
  --playground-runtime-ready-border: rgba(45, 212, 191, .32);
  --playground-runtime-error-border: rgba(248, 113, 113, .32);
  --playground-empty-bg: rgba(10, 19, 24, .72);
  --playground-card-border: rgba(148, 163, 184, .16);
  --playground-card-bg: rgba(11, 26, 32, .78);
  --playground-card-connected-border: rgba(45, 212, 191, .28);
  --playground-card-error-border: rgba(248, 113, 113, .3);
  --playground-status-bg: rgba(45, 212, 191, .14);
  --playground-switch-border: rgba(148, 163, 184, .22);
  --playground-switch-bg: rgba(17, 32, 38, .94);
  --playground-switch-thumb-bg: #dceef0;
  --playground-switch-thumb-shadow: 0 2px 8px rgba(0, 0, 0, .32);
  --playground-switch-checked-bg: rgba(45, 212, 191, .22);
  --playground-switch-checked-border: rgba(45, 212, 191, .42);
  --playground-schema-active-border: rgba(45, 212, 191, .38);
  --playground-schema-active-bg: rgba(45, 212, 191, .18);
  --playground-input-border: rgba(148, 163, 184, .22);
  --playground-input-bg: rgba(15, 23, 28, .88);
  --playground-input-focus-border: rgba(45, 212, 191, .56);
  --playground-input-focus-ring: 0 0 0 4px rgba(45, 212, 191, .16);
  --playground-divider: rgba(148, 163, 184, .16);
  --playground-disabled-bg: rgba(29, 46, 52, .72);
  --playground-disabled-ink: rgba(229, 238, 240, .5);
}

html.dark .playground-shell .capability-list li,
html.dark .playground-shell .capability-warning,
html.dark .playground-shell .capability-status {
  background: rgba(15, 23, 28, .46);
}
</style>
