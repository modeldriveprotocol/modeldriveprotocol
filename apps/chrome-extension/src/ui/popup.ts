interface PopupState {
  connectionState: string
  lastError?: string
  lastConnectedAt?: string
  config: {
    serverUrl: string
    matchPatterns: string[]
    autoConnect: boolean
    autoInjectBridge: boolean
  }
  grantedOrigins: string[]
  missingMatchPatterns: string[]
  activeTab?: {
    id?: number
    title?: string
    url?: string
    status?: string
    eligible: boolean
  }
  activeOriginPattern?: string
  bridgeState?: {
    bridgeInstalled: boolean
    tools: Array<{
      name: string
      description?: string
    }>
    executedScriptIds: string[]
  }
  injectedTools: Array<{
    name: string
    description?: string
  }>
}

interface RuntimeMessageResponse {
  ok: boolean
  data?: unknown
  error?: {
    message?: string
  }
}

const statusValue = document.querySelector<HTMLElement>('#connection-status')
const activeTabValue = document.querySelector<HTMLElement>('#active-tab')
const activeOriginValue = document.querySelector<HTMLElement>('#active-origin')
const configValue = document.querySelector<HTMLElement>('#config-summary')
const bridgeValue = document.querySelector<HTMLElement>('#bridge-state')
const toolsValue = document.querySelector<HTMLElement>('#tool-list')
const messageValue = document.querySelector<HTMLElement>('#message')
const refreshButton = document.querySelector<HTMLButtonElement>('#refresh')
const injectButton = document.querySelector<HTMLButtonElement>('#inject')
const grantActiveSiteButton = document.querySelector<HTMLButtonElement>('#grant-active-site')
const optionsButton = document.querySelector<HTMLButtonElement>('#open-options')

if (
  !statusValue ||
  !activeTabValue ||
  !activeOriginValue ||
  !configValue ||
  !bridgeValue ||
  !toolsValue ||
  !messageValue ||
  !refreshButton ||
  !injectButton ||
  !grantActiveSiteButton ||
  !optionsButton
) {
  throw new Error('Popup failed to initialize')
}

const connectionStatusElement = statusValue
const activeTabElement = activeTabValue
const activeOriginElement = activeOriginValue
const configSummaryElement = configValue
const bridgeStateElement = bridgeValue
const toolListElement = toolsValue
const messageElement = messageValue
const injectButtonElement = injectButton
const grantActiveSiteButtonElement = grantActiveSiteButton

refreshButton.addEventListener('click', () => {
  void renderPopup()
})

injectButton.addEventListener('click', () => {
  void sendRuntimeMessage({
    type: 'popup:injectActiveTab'
  })
    .then(() => {
      setMessage('Injected bridge scripts into the active tab.')
      return renderPopup()
    })
    .catch((error) => {
      setMessage(String(error), true)
    })
})

grantActiveSiteButton.addEventListener('click', () => {
  void sendRuntimeMessage({
    type: 'popup:grantActiveTabOrigin'
  })
    .then((data) => {
      const result = data as {
        pattern: string
      }
      setMessage(`Granted host access for ${result.pattern}.`)
      return renderPopup()
    })
    .catch((error) => {
      setMessage(String(error), true)
    })
})

optionsButton.addEventListener('click', () => {
  void sendRuntimeMessage({
    type: 'popup:openOptions'
  })
})

void renderPopup()

async function renderPopup(): Promise<void> {
  try {
    const state = (await sendRuntimeMessage({
      type: 'popup:getState'
    })) as PopupState

    connectionStatusElement.textContent = [
      state.connectionState,
      state.lastConnectedAt ? `last connected ${formatTime(state.lastConnectedAt)}` : undefined
    ]
      .filter(Boolean)
      .join(' • ')

    activeTabElement.textContent = state.activeTab
      ? [
        state.activeTab.title ?? 'Untitled tab',
        state.activeTab.eligible ? 'eligible' : 'not eligible',
        state.activeTab.url ?? 'no url'
      ].join(' • ')
      : 'No active tab'

    activeOriginElement.textContent = state.activeOriginPattern
      ? `active site pattern: ${state.activeOriginPattern}`
      : 'This page does not map to a requestable host pattern.'

    configSummaryElement.textContent = [
      state.config.serverUrl,
      `${state.config.matchPatterns.length} target pattern(s)`,
      `${state.grantedOrigins.length} granted origin(s)`,
      state.missingMatchPatterns.length > 0
        ? `${state.missingMatchPatterns.length} configured pattern(s) still need permission`
        : 'all target patterns granted'
    ].join('\n')

    bridgeStateElement.textContent = formatBridgeState(state)

    const tools = state.bridgeState?.tools ?? state.injectedTools
    toolListElement.innerHTML = tools.length === 0
      ? '<li class="muted">No injected page tools detected.</li>'
      : tools
        .map(
          (tool) =>
            `<li><strong>${escapeHtml(tool.name)}</strong>${
              tool.description ? ` — ${escapeHtml(tool.description)}` : ''
            }</li>`
        )
        .join('')

    grantActiveSiteButtonElement.disabled = !state.activeOriginPattern || Boolean(state.activeTab?.eligible)
    injectButtonElement.disabled = !Boolean(state.activeTab?.eligible)

    if (state.lastError) {
      setMessage(state.lastError, true)
    } else {
      setMessage('')
    }
  } catch (error) {
    setMessage(String(error), true)
  }
}

async function sendRuntimeMessage(message: { type: string }): Promise<unknown> {
  const response = (await chrome.runtime.sendMessage(message)) as RuntimeMessageResponse

  if (!response.ok) {
    throw new Error(response.error?.message ?? 'Runtime message failed')
  }

  return response.data
}

function setMessage(message: string, isError = false): void {
  messageElement.textContent = message
  messageElement.dataset.state = !message ? 'idle' : isError ? 'error' : 'success'
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString()
}

function formatBridgeState(state: PopupState): string {
  if (state.bridgeState) {
    const summary = [
      state.bridgeState.bridgeInstalled ? 'bridge ready' : 'bridge unavailable',
      `${state.bridgeState.tools.length} tool(s)`,
      `${state.bridgeState.executedScriptIds.length} script(s)`
    ]

    if (state.bridgeState.executedScriptIds.length === 0) {
      return [...summary, 'script ids: none'].join('\n')
    }

    const visibleScriptIds = state.bridgeState.executedScriptIds.slice(0, 4)
    const hiddenCount = state.bridgeState.executedScriptIds.length - visibleScriptIds.length

    return [
      summary.join(' • '),
      `script ids: ${visibleScriptIds.join(', ')}${hiddenCount > 0 ? ` +${hiddenCount} more` : ''}`
    ].join('\n')
  }

  if (!state.activeTab) {
    return 'No active tab.'
  }

  if (!state.activeTab.eligible) {
    return 'Bridge state is unavailable until the active page has configured host access.'
  }

  return 'Bridge state is not available yet.'
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
