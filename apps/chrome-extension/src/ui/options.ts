import {
  type ExtensionConfig,
  isValidMatchPattern,
  isValidServerUrl,
  parseMatchPatterns,
  stringifyMatchPatterns
} from '../shared/config.js'
import { loadConfig, saveConfig } from '../shared/storage.js'

interface RuntimeMessageResponse {
  ok: boolean
  data?: unknown
  error?: {
    message?: string
  }
}

const form = document.querySelector<HTMLFormElement>('#settings-form')
const status = document.querySelector<HTMLElement>('#status')
const grantedOriginsList = document.querySelector<HTMLElement>('#granted-origins')
const missingOriginsList = document.querySelector<HTMLElement>('#missing-origins')

if (!form || !status || !grantedOriginsList || !missingOriginsList) {
  throw new Error('Options page failed to initialize')
}

const settingsForm = form
const statusMessage = status
const grantedOrigins = grantedOriginsList
const missingOrigins = missingOriginsList

void bootstrapOptionsPage()

async function bootstrapOptionsPage(): Promise<void> {
  const config = await loadConfig()
  populateForm(config)
  await renderPermissionState(config)

  settingsForm.addEventListener('submit', (event) => {
    event.preventDefault()
    void saveSettings()
  })

  const refreshButton = document.querySelector<HTMLButtonElement>('#refresh-runtime')

  refreshButton?.addEventListener('click', () => {
    void sendRuntimeMessage({
      type: 'runtime:refresh'
    }).then(() => {
      setStatus('Runtime refresh requested.')
    })
  })
}

async function saveSettings(): Promise<void> {
  const next = readForm()

  if (!isValidServerUrl(next.serverUrl)) {
    setStatus('Server URL must use ws, wss, http, or https.', true)
    return
  }

  for (const pattern of next.matchPatterns) {
    if (!isValidMatchPattern(pattern)) {
      setStatus(`Invalid host match pattern: ${pattern}`, true)
      return
    }
  }

  if (next.matchPatterns.length > 0) {
    const granted = (await chrome.permissions.request({
      origins: next.matchPatterns
    })) as boolean

    if (!granted) {
      setStatus('Host access request was denied. Settings were not saved.', true)
      return
    }
  }

  await saveConfig(next)
  await sendRuntimeMessage({
    type: 'runtime:refresh'
  })
  await renderPermissionState(next)
  setStatus('Settings saved and runtime refreshed.')
}

function populateForm(config: ExtensionConfig): void {
  setInputValue('serverUrl', config.serverUrl)
  setInputValue('clientId', config.clientId)
  setInputValue('clientName', config.clientName)
  setInputValue('clientDescription', config.clientDescription)
  setInputValue('notificationTitle', config.notificationTitle)
  setTextAreaValue('matchPatterns', stringifyMatchPatterns(config.matchPatterns))
  setTextAreaValue('toolScriptSource', config.toolScriptSource)
  setCheckboxValue('autoConnect', config.autoConnect)
  setCheckboxValue('autoInjectBridge', config.autoInjectBridge)
}

function readForm(): ExtensionConfig {
  return {
    serverUrl: getInputValue('serverUrl'),
    clientId: getInputValue('clientId'),
    clientName: getInputValue('clientName'),
    clientDescription: getInputValue('clientDescription'),
    notificationTitle: getInputValue('notificationTitle'),
    autoConnect: getCheckboxValue('autoConnect'),
    autoInjectBridge: getCheckboxValue('autoInjectBridge'),
    matchPatterns: parseMatchPatterns(getTextAreaValue('matchPatterns')),
    toolScriptSource: getTextAreaValue('toolScriptSource')
  }
}

async function renderPermissionState(config: ExtensionConfig): Promise<void> {
  const permissions = (await chrome.permissions.getAll()) as {
    origins?: string[]
  }

  const origins = permissions.origins ?? []
  const missingPatterns: string[] = []

  for (const pattern of config.matchPatterns) {
    const granted = (await chrome.permissions.contains({
      origins: [pattern]
    })) as boolean

    if (!granted) {
      missingPatterns.push(pattern)
    }
  }

  grantedOrigins.innerHTML = origins.length === 0
    ? '<li class="muted">No host permissions granted yet.</li>'
    : origins.map((origin) => `<li>${escapeHtml(origin)}</li>`).join('')

  missingOrigins.innerHTML = missingPatterns.length === 0
    ? '<li class="muted">All configured patterns currently have access.</li>'
    : missingPatterns.map((pattern) => `<li>${escapeHtml(pattern)}</li>`).join('')
}

async function sendRuntimeMessage(message: { type: string }): Promise<unknown> {
  const response = (await chrome.runtime.sendMessage(message)) as RuntimeMessageResponse

  if (!response.ok) {
    throw new Error(response.error?.message ?? 'Runtime message failed')
  }

  return response.data
}

function setStatus(message: string, isError = false): void {
  statusMessage.textContent = message
  statusMessage.dataset.state = isError ? 'error' : 'success'
}

function setInputValue(id: string, value: string): void {
  const input = document.getElementById(id) as HTMLInputElement | null

  if (input) {
    input.value = value
  }
}

function setTextAreaValue(id: string, value: string): void {
  const input = document.getElementById(id) as HTMLTextAreaElement | null

  if (input) {
    input.value = value
  }
}

function setCheckboxValue(id: string, value: boolean): void {
  const input = document.getElementById(id) as HTMLInputElement | null

  if (input) {
    input.checked = value
  }
}

function getInputValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement).value.trim()
}

function getTextAreaValue(id: string): string {
  return (document.getElementById(id) as HTMLTextAreaElement).value
}

function getCheckboxValue(id: string): boolean {
  return (document.getElementById(id) as HTMLInputElement).checked
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
