// @vitest-environment jsdom

import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_BACKGROUND_CLIENT,
  DEFAULT_EXTENSION_CONFIG
} from '../src/shared/config.js'
import { I18nProvider } from '../src/ui/i18n/provider.js'
import { BackgroundClientEditor } from '../src/ui/apps/options/sections/background-client-editor.js'
import {
  commitBackgroundRename,
  getSharedBackgroundDisplayPrefix
} from '../src/ui/apps/options/sections/background-client-editor/tree-helpers.js'
import { useBackgroundClientEditorActions } from '../src/ui/apps/options/sections/background-client-editor/use-background-client-editor-actions.js'

vi.mock('../src/ui/foundation/monaco-editor.js', () => ({
  MonacoCodeEditor: ({
    ariaLabel,
    value
  }: {
    ariaLabel: string
    value: string
  }) => <div aria-label={ariaLabel}>{value}</div>
}))

describe('background client editor', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)

    vi.stubGlobal('chrome', {
      i18n: {
        getUILanguage: () => 'en'
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined)
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn()
        }
      }
    })
    vi.stubGlobal('navigator', {
      ...window.navigator,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    })
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        disconnect() {}
        unobserve() {}
      }
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    container.remove()
  })

  function findTreeItemBySuffix(suffix: string) {
    return Array.from(container.querySelectorAll('[role="treeitem"]')).find(
      (item) => item.id.endsWith(suffix)
    ) as HTMLElement | undefined
  }

  function clickTreeItem(treeItem: HTMLElement | undefined) {
    const content = treeItem?.querySelector('.MuiTreeItem-content') as
      | HTMLElement
      | null

    content?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    )
  }

  function triggerEnabledButton(treeItem: HTMLElement | undefined) {
    const button = treeItem?.querySelector(
      '[role="button"][aria-label]'
    ) as
      | HTMLElement
      | null

    button?.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 })
    )
  }

  function expandTreeItem(treeItem: HTMLElement | undefined) {
    const iconContainer = treeItem?.querySelector('.MuiTreeItem-iconContainer') as
      | HTMLElement
      | null

    iconContainer?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    )
  }

  it('renders a javascript background asset path without crashing', async () => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <I18nProvider>
          <BackgroundClientEditor
            client={DEFAULT_EXTENSION_CONFIG.backgroundClients[0] ?? DEFAULT_BACKGROUND_CLIENT}
            draft={DEFAULT_EXTENSION_CONFIG}
            initialAssetPath="/status"
            initialTab="assets"
            invocationStats={undefined}
            onAssetPathChange={() => {}}
            onClearHistory={() => {}}
            onTabChange={() => {}}
            onChange={() => {}}
            runtimeState="connected"
          />
        </I18nProvider>
      )
    })

    expect(container.textContent).toContain(
      'Read the extension workspace status, multi-client connection state, and active tab summary.'
    )
    expect(container.textContent).toContain('return await api.getStatus();')
  })

  it('renders the root background SKILL markdown without crashing', async () => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <I18nProvider>
          <BackgroundClientEditor
            client={DEFAULT_EXTENSION_CONFIG.backgroundClients[0] ?? DEFAULT_BACKGROUND_CLIENT}
            draft={DEFAULT_EXTENSION_CONFIG}
            initialAssetPath="/SKILL.md"
            initialTab="assets"
            invocationStats={undefined}
            onAssetPathChange={() => {}}
            onClearHistory={() => {}}
            onTabChange={() => {}}
            onChange={() => {}}
            runtimeState="connected"
          />
        </I18nProvider>
      )
    })

    expect(container.textContent).toContain(
      'Overview for the root directory and the built-in Chrome extension capabilities exposed from it.'
    )
    expect(container.textContent).toContain('# /')
  })

  it('toggles every asset under a folder from the tree control', async () => {
    const root = createRoot(container)
    const onChange = vi.fn()
    const client =
      DEFAULT_EXTENSION_CONFIG.backgroundClients[0] ?? DEFAULT_BACKGROUND_CLIENT

    await act(async () => {
      root.render(
        <I18nProvider>
          <BackgroundClientEditor
            client={client}
            draft={DEFAULT_EXTENSION_CONFIG}
            initialAssetPath="/SKILL.md"
            initialTab="assets"
            invocationStats={undefined}
            onAssetPathChange={() => {}}
            onClearHistory={() => {}}
            onTabChange={() => {}}
            onChange={onChange}
            runtimeState="connected"
          />
        </I18nProvider>
      )
    })

    const resourcesFolderNode = findTreeItemBySuffix('asset-folder:resources')
    expect(resourcesFolderNode).toBeDefined()

    await act(async () => {
      triggerEnabledButton(resourcesFolderNode)
    })

    expect(onChange).toHaveBeenCalledTimes(1)

    const nextConfig = onChange.mock.calls[0]?.[0]
    const nextClient = nextConfig.backgroundClients.find(
      (item: { id: string }) => item.id === client.id
    )
    const resourceAssets = nextClient.exposes.filter((asset: { path: string }) =>
      asset.path.startsWith('/resources/')
    )

    expect(resourceAssets.length).toBeGreaterThan(0)
    expect(
      resourceAssets.every((asset: { enabled: boolean }) => !asset.enabled)
    ).toBe(true)
  })

  it('switches backend assets without entering an update loop when the parent rehydrates the client', async () => {
    const root = createRoot(container)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    function Harness() {
      const [assetPath, setAssetPath] = useState<string | undefined>(
        '/SKILL.md'
      )
      const [detailTab, setDetailTab] = useState<'assets' | 'basics' | 'activity'>(
        'assets'
      )
      const [draft, setDraft] = useState(DEFAULT_EXTENSION_CONFIG)
      const client = JSON.parse(
        JSON.stringify(
          draft.backgroundClients[0] ?? DEFAULT_BACKGROUND_CLIENT
        )
      ) as typeof DEFAULT_BACKGROUND_CLIENT

      return (
        <I18nProvider>
          <BackgroundClientEditor
            client={client}
            draft={draft}
            initialAssetPath={assetPath}
            initialTab={detailTab}
            invocationStats={undefined}
            onAssetPathChange={(nextPath, nextTab) => {
              setAssetPath(nextPath)
              setDetailTab(nextTab)
            }}
            onClearHistory={() => {}}
            onTabChange={setDetailTab}
            onChange={setDraft}
            runtimeState="connected"
          />
        </I18nProvider>
      )
    }

    await act(async () => {
      root.render(<Harness />)
    })

    expect(container.textContent).toContain('# /')

    const statusNode = findTreeItemBySuffix('asset:extension.status')
    expect(statusNode).toBeDefined()

    await act(async () => {
      clickTreeItem(statusNode)
    })

    expect(container.textContent).toContain('return await api.getStatus();')
    expect(
      errorSpy.mock.calls.some((call) =>
        String(call[0]).includes('Maximum update depth exceeded')
      )
    ).toBe(false)

    errorSpy.mockRestore()
    logSpy.mockRestore()
  })

  it('moves selection back to the collapsed background folder when the current file becomes hidden', async () => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <I18nProvider>
          <BackgroundClientEditor
            client={DEFAULT_EXTENSION_CONFIG.backgroundClients[0] ?? DEFAULT_BACKGROUND_CLIENT}
            draft={DEFAULT_EXTENSION_CONFIG}
            initialAssetPath="/resources/SKILL.md"
            initialTab="assets"
            invocationStats={undefined}
            onAssetPathChange={() => {}}
            onClearHistory={() => {}}
            onTabChange={() => {}}
            onChange={() => {}}
            runtimeState="connected"
          />
        </I18nProvider>
      )
    })

    const resourcesFolderNode = findTreeItemBySuffix('asset-folder:resources')
    expect(resourcesFolderNode).toBeDefined()

    await act(async () => {
      expandTreeItem(resourcesFolderNode)
    })

    const folderContent = resourcesFolderNode?.querySelector(
      '.MuiTreeItem-content'
    ) as HTMLElement | null
    expect(folderContent?.classList.contains('Mui-selected')).toBe(true)
  })

  it('keeps ctrl+a scoped to visible background items after expanding a collapsed folder', async () => {
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <I18nProvider>
          <BackgroundClientEditor
            client={DEFAULT_EXTENSION_CONFIG.backgroundClients[0] ?? DEFAULT_BACKGROUND_CLIENT}
            draft={DEFAULT_EXTENSION_CONFIG}
            initialAssetPath="/SKILL.md"
            initialTab="assets"
            invocationStats={undefined}
            onAssetPathChange={() => {}}
            onClearHistory={() => {}}
            onTabChange={() => {}}
            onChange={() => {}}
            runtimeState="connected"
          />
        </I18nProvider>
      )
    })

    const tree = container.querySelector('[role="tree"]') as HTMLElement | null
    const resourcesFolderNode = findTreeItemBySuffix('asset-folder:resources')

    expect(tree).toBeTruthy()
    expect(resourcesFolderNode).toBeDefined()
    expect(findTreeItemBySuffix('asset:extension.skills.resources')).toBeUndefined()

    await act(async () => {
      tree?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'a',
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        })
      )
    })

    await act(async () => {
      expandTreeItem(resourcesFolderNode)
    })

    const resourcesSkillNode = findTreeItemBySuffix('asset:extension.skills.resources')

    expect(resourcesSkillNode).toBeDefined()
    expect(
      resourcesSkillNode
        ?.querySelector('.MuiTreeItem-content')
        ?.classList.contains('Mui-selected')
    ).toBe(false)
  })

  it('renames background folders against the real stored paths when a shared display prefix is hidden', () => {
    const client =
      DEFAULT_EXTENSION_CONFIG.backgroundClients[0] ?? DEFAULT_BACKGROUND_CLIENT
    const renameTarget = {
      kind: 'folder' as const,
      path: 'clients',
      value: 'workspace-clients'
    }
    let nextClient = client
    let selectedItemId = ''

    commitBackgroundRename(
      client,
      renameTarget,
      false,
      getSharedBackgroundDisplayPrefix(client.exposes),
      () => {},
      (nextItemId) => {
        selectedItemId = nextItemId
      },
      (updatedClient) => {
        nextClient = updatedClient
      }
    )

    const renamedPaths = nextClient.exposes
      .filter((asset) => asset.path.startsWith('/workspace-clients/'))
      .map((asset) => asset.path)

    expect(renamedPaths.length).toBeGreaterThan(0)
    expect(selectedItemId).toBe('asset-folder:workspace-clients')
  })

  it('moves a background asset into another folder when dropped', async () => {
    const root = createRoot(container)
    const onChange = vi.fn()
    const client =
      DEFAULT_EXTENSION_CONFIG.backgroundClients[0] ?? DEFAULT_BACKGROUND_CLIENT
    let handleDrop:
      | ((folderPath: string, dragState: { kind: 'asset'; assetId: string; path: string }) => void)
      | undefined

    function Harness() {
      const [selectedItemId, setSelectedItemId] = useState('asset:extension.status')
      const [selectedItemIds, setSelectedItemIds] = useState<string[]>([
        'asset:extension.status'
      ])
      const [displayedAssetId, setDisplayedAssetId] = useState<
        string | undefined
      >('extension.status')
      const [expandedFolders, setExpandedFolders] = useState<string[]>([])
      const [dragState, setDragState] = useState<any>()
      const [dropTargetItemId, setDropTargetItemId] = useState<string | undefined>()
      const [contextMenu, setContextMenu] = useState<any>()
      const [renameTarget, setRenameTarget] = useState<any>()

      const actions = useBackgroundClientEditorActions({
        assetEnabled: new Map(client.exposes.map((asset) => [asset.id, asset.enabled])),
        client,
        draft: DEFAULT_EXTENSION_CONFIG,
        onChange,
        renameError: false,
        renameTarget,
        selectedItemId,
        selectedItemIds,
        setContextMenu,
        setDisplayedAssetId,
        setDragState,
        setDropTargetItemId,
        setExpandedFolders,
        setRenameTarget,
        setSelectedItemIds,
        setSelectedItemId,
        sharedDisplayPrefix: getSharedBackgroundDisplayPrefix(client.exposes)
      })

      handleDrop = (folderPath, nextDragState) =>
        actions.handleDrop(folderPath, nextDragState)

      return (
        <div>
          {selectedItemId}
          {displayedAssetId}
          {expandedFolders.join(',')}
          {dragState?.kind}
          {dropTargetItemId}
          {contextMenu?.kind}
        </div>
      )
    }

    await act(async () => {
      root.render(<Harness />)
    })

    await act(async () => {
      handleDrop?.('clients', {
        kind: 'asset',
        assetId: 'extension.status',
        path: '/status'
      })
    })

    expect(onChange).toHaveBeenCalledTimes(1)

    const nextConfig = onChange.mock.calls[0]?.[0]
    const nextClient = nextConfig.backgroundClients.find(
      (item: { id: string }) => item.id === client.id
    )
    const movedAsset = nextClient.exposes.find(
      (asset: { id: string }) => asset.id === 'extension.status'
    )

    expect(movedAsset?.path).toBe('/clients/status')
  })
})
