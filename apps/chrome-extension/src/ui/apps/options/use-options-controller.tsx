import { useEffect, useRef, useState } from 'react'

import {
  buildRepositoryWorkspaceBundleUrl,
  createMarketSourceConfig,
  createRepositoryMarketSourceConfig,
  createRouteClientConfig,
  getOriginMatchPattern,
  isValidMarketSourceUrl,
  isValidMatchPattern,
  isValidServerUrl,
  normalizeConfig,
  type ExtensionConfig
} from '#~/shared/config.js'
import {
  createPresetRouteClient,
  getRuntimeStatus,
  loadWorkspaceConfig,
  refreshRuntime,
  saveWorkspaceConfig
} from '../../platform/extension-api.js'
import { formatWorkspaceBundleError, fetchWorkspaceBundleFromUrl, parseWorkspaceBundleText, serializeWorkspaceBundle } from '../../workspace-bundle/bundle.js'
import { countInstalledMarketClients, createInstalledMarketClient } from '../../market/catalog.js'
import { useOptionsRouting } from './use-options-routing.js'

export function useOptionsController(t: (key: string, values?: Record<string, string | number>) => string) {
  const routing = useOptionsRouting()
  const [draft, setDraft] = useState<ExtensionConfig>()
  const [runtimeState, setRuntimeState] = useState<any>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [status, setStatus] = useState<string>()
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'error'>('info')
  const [statusOpen, setStatusOpen] = useState(false)
  const [routeSearch, setRouteSearch] = useState('')
  const [transferMode, setTransferMode] = useState<'import' | 'export'>('export')
  const [transferDraft, setTransferDraft] = useState('')
  const [transferUrl, setTransferUrl] = useState('')
  const [transferSourceMode, setTransferSourceMode] = useState<'direct' | 'repository'>('direct')
  const [transferProvider, setTransferProvider] = useState<'github' | 'gitlab'>('github')
  const [transferRepository, setTransferRepository] = useState('')
  const [transferRefType, setTransferRefType] = useState<'branch' | 'tag' | 'commit'>('branch')
  const [transferRef, setTransferRef] = useState('main')
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)

  const dirty = draft ? JSON.stringify(normalizeConfig(draft)) !== lastSavedSnapshot : false

  function notify(message: string, tone: 'info' | 'success' | 'error') {
    setStatus(message)
    setStatusTone(tone)
    setStatusOpen(true)
  }

  useEffect(() => {
    void bootstrap()
  }, [])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  async function bootstrap() {
    try {
      setLoading(true)
      const [nextDraft, nextRuntime] = await Promise.all([loadWorkspaceConfig(), getRuntimeStatus()])
      setDraft(nextDraft)
      setRuntimeState(nextRuntime)
      setTransferDraft(serializeWorkspaceBundle(nextDraft))
      setLastSavedSnapshot(JSON.stringify(normalizeConfig(nextDraft)))
    } catch (nextError) {
      setError(String(nextError))
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!draft) return
    try {
      if (!isValidServerUrl(draft.serverUrl)) {
        throw new Error(t('options.error.invalidServerUrl'))
      }
      for (const routeClient of draft.routeClients) {
        for (const pattern of routeClient.matchPatterns) {
          if (!isValidMatchPattern(pattern)) {
            throw new Error(t('options.error.invalidMatchPattern', { clientName: routeClient.clientName, pattern }))
          }
        }
      }
      const requestedOrigins = [...new Set([...draft.routeClients.flatMap((client) => client.matchPatterns), ...draft.marketSources.map((source) => getOriginMatchPattern(source.url)).filter(Boolean) as string[]])]
      if (requestedOrigins.length > 0) {
        const granted = await chrome.permissions.request({ origins: requestedOrigins })
        if (!granted) {
          throw new Error(t('options.error.hostAccessDenied'))
        }
      }
      const saved = await saveWorkspaceConfig(draft)
      await refreshRuntime()
      setDraft(saved)
      setRuntimeState(await getRuntimeStatus())
      setLastSavedSnapshot(JSON.stringify(normalizeConfig(saved)))
      setTransferDraft(serializeWorkspaceBundle(saved))
      notify(t('options.status.saved'), 'success')
    } catch (nextError) {
      notify(String(nextError), 'error')
    }
  }

  function handleDiscardChanges() {
    if (!lastSavedSnapshot) return
    const restored = normalizeConfig(JSON.parse(lastSavedSnapshot))
    setDraft(restored)
    setTransferDraft(serializeWorkspaceBundle(restored))
    notify(t('options.status.discarded'), 'info')
  }

  async function addMarketSource(input: any) {
    if (!draft) return
    const source = input.mode === 'direct'
      ? createMarketSourceConfig(input.url.trim())
      : createRepositoryMarketSourceConfig({ provider: input.provider, repository: input.repository, refType: input.refType, ref: input.ref })
    if (draft.marketSources.some((item) => item.url === source.url && item.id !== input.sourceId)) {
      throw new Error(t('options.error.marketSourceExists'))
    }
    const originPattern = getOriginMatchPattern(source.url)
    if (!originPattern) {
      throw new Error(t('options.error.invalidMarketSourceUrl'))
    }
    const granted = await chrome.permissions.request({ origins: [originPattern] })
    if (!granted) {
      throw new Error(t('options.error.marketSourceAccessDenied'))
    }
    setDraft((current) => current ? normalizeConfig({ ...current, marketSources: input.sourceId ? current.marketSources.map((item) => item.id === input.sourceId ? { ...source, id: input.sourceId } : item) : [...current.marketSources, source] }) : current)
    notify(t(input.sourceId ? 'options.status.marketSourceUpdated' : 'options.status.marketSourceAdded'), 'success')
  }

  function removeMarketSource(sourceId: string) {
    setDraft((current) => current ? { ...current, marketSources: current.marketSources.filter((source) => source.id !== sourceId) } : current)
    notify(t('options.status.marketSourceRemoved'), 'info')
  }

  function installMarketClient(catalog: any, entry: any) {
    if (!draft) return
    const existingCount = countInstalledMarketClients(draft.routeClients, catalog.source.url, entry.id)
    const nextClient = createInstalledMarketClient({ catalog, entry, existingCount })
    setDraft((current) => current ? { ...current, routeClients: [nextClient, ...current.routeClients] } : current)
    routing.setSelectedClientId(nextClient.id)
    routing.setSectionAndHash('clients', { clientId: nextClient.id, clientDetailOpen: true })
    notify(t('options.status.marketClientInstalled', { name: nextClient.clientName }), 'success')
  }

  function exportWorkspace() {
    if (!draft) return
    setTransferDraft(serializeWorkspaceBundle(draft))
    setTransferMode('export')
    notify(t('options.status.exportPrepared'), 'success')
  }

  async function copyTransferDraft() {
    await navigator.clipboard.writeText(transferDraft)
    notify(t(transferMode === 'export' ? 'options.status.transferCopied.export' : 'options.status.transferCopied.import'), 'success')
  }

  function downloadWorkspace() {
    const blob = new Blob([transferDraft], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'mdp-chrome-workspace.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function applyImport() {
    try {
      const next = parseWorkspaceBundleText(transferDraft)
      setDraft(next)
      routing.setSelectedClientId(next.routeClients[0]?.id)
      setTransferMode('import')
      notify(t('options.status.importApplied'), 'success')
    } catch (nextError) {
      notify(formatWorkspaceBundleError(nextError), 'error')
    }
  }

  async function readImportFile(file: File | undefined) {
    if (!file) return
    const text = await file.text()
    setTransferDraft(text)
    setTransferMode('import')
    notify(t('options.status.importLoaded', { name: file.name }), 'success')
  }

  async function fetchImportFromSource(input: any) {
    const resolvedUrl = input.mode === 'direct' ? input.url.trim() : buildRepositoryWorkspaceBundleUrl(input.provider, input.repository, input.ref)
    if (!isValidMarketSourceUrl(resolvedUrl)) {
      throw new Error(t('options.error.invalidImportUrl'))
    }
    const originPattern = getOriginMatchPattern(resolvedUrl)
    if (!originPattern) throw new Error(t('options.error.invalidImportUrl'))
    const granted = await chrome.permissions.request({ origins: [originPattern] })
    if (!granted) throw new Error(t('options.error.importUrlAccessDenied'))
    const text = await fetchWorkspaceBundleFromUrl(resolvedUrl)
    setTransferDraft(text)
    if (input.mode === 'direct') setTransferUrl(resolvedUrl)
    setTransferMode('import')
    notify(t(input.mode === 'direct' ? 'options.status.importUrlLoaded' : 'options.status.importRepositoryLoaded'), 'success')
  }

  return {
    ...routing,
    draft,
    setDraft,
    runtimeState,
    loading,
    error,
    status,
    statusTone,
    statusOpen,
    setStatusOpen,
    routeSearch,
    setRouteSearch,
    transferMode,
    setTransferMode,
    transferDraft,
    setTransferDraft,
    transferUrl,
    setTransferUrl,
    transferSourceMode,
    setTransferSourceMode,
    transferProvider,
    setTransferProvider,
    transferRepository,
    setTransferRepository,
    transferRefType,
    setTransferRefType,
    transferRef,
    setTransferRef,
    importInputRef,
    dirty,
    notify,
    handleSave,
    handleDiscardChanges,
    addMarketSource,
    removeMarketSource,
    installMarketClient,
    exportWorkspace,
    copyTransferDraft,
    downloadWorkspace,
    applyImport,
    readImportFile,
    fetchImportFromSource
  }
}

export type OptionsController = ReturnType<typeof useOptionsController>
