// @vitest-environment jsdom

import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_EXTENSION_CONFIG,
  createRouteClientConfig,
  type ExtensionConfig,
  type RouteClientConfig
} from '../src/shared/config.js'
import { ClientAssetsPanel } from '../src/ui/apps/options/sections/client-assets-panel.js'
import { useClientAssetsPanelTreeActions } from '../src/ui/apps/options/sections/client-assets-panel/use-client-assets-panel-tree-actions.js'
import { I18nProvider } from '../src/ui/i18n/provider.js'

vi.mock('../src/ui/foundation/monaco-editor.js', () => ({
  MonacoCodeEditor: ({
    ariaLabel,
    value
  }: {
    ariaLabel: string
    value: string
  }) => <div aria-label={ariaLabel}>{value}</div>
}))

describe('client assets panel', () => {
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

  function expandTreeItem(treeItem: HTMLElement | undefined) {
    const iconContainer = treeItem?.querySelector('.MuiTreeItem-iconContainer') as
      | HTMLElement
      | null

    iconContainer?.dispatchEvent(
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

  it('switches assets without entering an update loop when the parent rehydrates the client', async () => {
    const root = createRoot(container)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const baseClient = createRouteClientConfig({
      id: 'route-client-ui-verify',
      clientId: 'route-client-ui-verify',
      clientName: 'UI Verify Client',
      exposes: [
        {
          kind: 'skill',
          id: 'route-skill-root',
          enabled: true,
          path: 'SKILL.md',
          metadata: {
            title: 'Root skill',
            summary: 'Root summary',
            queryParameters: [],
            headerParameters: []
          },
          content: '# Root skill'
        },
        {
          kind: 'folder',
          id: 'route-folder-guides',
          path: 'guides'
        },
        {
          kind: 'skill',
          id: 'route-skill-guides',
          enabled: true,
          path: 'guides/SKILL.md',
          metadata: {
            title: 'Guide skill',
            summary: 'Guide summary',
            queryParameters: [],
            headerParameters: []
          },
          content: '# Guide skill'
        }
      ]
    })
    const initialDraft: ExtensionConfig = {
      ...DEFAULT_EXTENSION_CONFIG,
      backgroundClients: [],
      routeClients: [baseClient]
    }
    let switchToGuide: (() => void) | undefined
    let switchToRoot: (() => void) | undefined

    function Harness() {
      const [draft, setDraft] = useState(initialDraft)
      const [selectedPath, setSelectedPath] = useState<string | undefined>('SKILL.md')
      const client = createRouteClientConfig(
        JSON.parse(JSON.stringify(draft.routeClients[0] as RouteClientConfig))
      )

      switchToGuide = () => setSelectedPath('guides/SKILL.md')
      switchToRoot = () => setSelectedPath('SKILL.md')

      return (
        <I18nProvider>
          <ClientAssetsPanel
            client={client}
            draft={draft}
            initialPath={selectedPath}
            initialTab="assets"
            onSelectedPathChange={setSelectedPath}
            onChange={setDraft}
          />
        </I18nProvider>
      )
    }

    await act(async () => {
      root.render(<Harness />)
    })

    expect(container.textContent).toContain('Root summary')
    expect(container.textContent).toContain('# Root skill')

    await act(async () => {
      switchToGuide?.()
    })

    expect(container.textContent).toContain('Guide summary')
    expect(container.textContent).toContain('# Guide skill')

    await act(async () => {
      switchToRoot?.()
    })

    expect(container.textContent).toContain('Root summary')
    expect(container.textContent).toContain('# Root skill')
    expect(
      errorSpy.mock.calls.some((call) =>
        String(call[0]).includes('Maximum update depth exceeded')
      )
    ).toBe(false)

    errorSpy.mockRestore()
  })

  it('keeps the moved asset selected after dropping it onto the root scope', async () => {
    const root = createRoot(container)
    const client = createRouteClientConfig({
      id: 'route-client-ui-verify',
      clientId: 'route-client-ui-verify',
      clientName: 'UI Verify Client',
      exposes: [
        {
          kind: 'skill',
          id: 'route-skill-root',
          enabled: true,
          path: 'SKILL.md',
          metadata: {
            title: 'Root skill',
            summary: 'Root summary',
            queryParameters: [],
            headerParameters: []
          },
          content: '# Root skill'
        },
        {
          kind: 'folder',
          id: 'route-folder-guides',
          path: 'guides'
        },
        {
          kind: 'skill',
          id: 'route-skill-guides',
          enabled: true,
          path: 'guides/SKILL.md',
          metadata: {
            title: 'Guide skill',
            summary: 'Guide summary',
            queryParameters: [],
            headerParameters: []
          },
          content: '# Guide skill'
        }
      ]
    })
    let handleDrop: ((folderPath: string, itemId: string, dragState: any) => void) | undefined
    let getSelectedItemId: (() => string) | undefined

    function Harness() {
      const [selectedItemId, setSelectedItemId] = useState('route-asset:route-skill-guides')
      const [displayedFileId, setDisplayedFileId] = useState<string | undefined>(
        'route-skill-guides'
      )
      const [expandedFolders, setExpandedFolders] = useState<string[]>([])
      const [dropTargetItemId, setDropTargetItemId] = useState<string | undefined>()
      const [dragState, setDragState] = useState<any>()
      const [contextMenu, setContextMenu] = useState<any>()
      const [renameTarget, setRenameTarget] = useState<any>()

      const actions = useClientAssetsPanelTreeActions({
        client,
        commitExposes: () => {},
        routeTree: [],
        setContextMenu,
        setDisplayedFileId,
        setDragState,
        setDropTargetItemId,
        setExpandedFolders,
        setRenameTarget,
        setSelectedItemId
      })

      handleDrop = actions.handleDrop
      getSelectedItemId = () => selectedItemId

      return <div>{displayedFileId}</div>
    }

    await act(async () => {
      root.render(<Harness />)
    })

    await act(async () => {
      handleDrop?.('', 'root', {
        kind: 'asset',
        assetId: 'route-skill-guides',
        path: 'guides/SKILL.md'
      })
    })

    expect(getSelectedItemId?.()).toBe('route-asset:route-skill-guides')
  })

  it('toggles every asset under a folder from the tree control', async () => {
    const root = createRoot(container)
    const onChange = vi.fn()
    const client = createRouteClientConfig({
      id: 'route-client-ui-verify',
      clientId: 'route-client-ui-verify',
      clientName: 'UI Verify Client',
      exposes: [
        {
          kind: 'skill',
          id: 'route-skill-root',
          enabled: true,
          path: 'SKILL.md',
          metadata: {
            title: 'Root skill',
            summary: 'Root summary',
            queryParameters: [],
            headerParameters: []
          },
          content: '# Root skill'
        },
        {
          kind: 'folder',
          id: 'route-folder-guides',
          path: 'guides'
        },
        {
          kind: 'skill',
          id: 'route-skill-guides',
          enabled: true,
          path: 'guides/SKILL.md',
          metadata: {
            title: 'Guide skill',
            summary: 'Guide summary',
            queryParameters: [],
            headerParameters: []
          },
          content: '# Guide skill'
        },
        {
          kind: 'resource',
          id: 'route-resource-config',
          enabled: true,
          method: 'GET',
          path: 'guides/config',
          selector: '[data-config]',
          alternativeSelectors: [],
          classes: [],
          attributes: {},
          metadata: {
            title: 'Config resource',
            summary: 'Config summary',
            queryParameters: [],
            headerParameters: []
          },
          source: 'return { ok: true }'
        }
      ]
    })
    const draft: ExtensionConfig = {
      ...DEFAULT_EXTENSION_CONFIG,
      backgroundClients: [],
      routeClients: [client]
    }

    await act(async () => {
      root.render(
        <I18nProvider>
          <ClientAssetsPanel
            client={client}
            draft={draft}
            initialPath="guides/SKILL.md"
            initialTab="assets"
            onSelectedPathChange={() => {}}
            onChange={onChange}
          />
        </I18nProvider>
      )
    })

    const guidesFolderNode = findTreeItemBySuffix('route-asset-folder:guides')
    expect(guidesFolderNode).toBeDefined()

    await act(async () => {
      triggerEnabledButton(guidesFolderNode)
    })

    expect(onChange).toHaveBeenCalledTimes(1)

    const nextConfig = onChange.mock.calls[0]?.[0] as ExtensionConfig
    const nextClient = nextConfig.routeClients.find(
      (item) => item.id === client.id
    )
    const folderAssets =
      nextClient?.exposes.filter((asset) => asset.path.startsWith('guides/')) ?? []

    expect(folderAssets.length).toBeGreaterThan(0)
    expect(
      folderAssets.every((asset) => !('enabled' in asset) || asset.enabled === false)
    ).toBe(true)
  })

  it('selects every filtered asset tree item with ctrl+a', async () => {
    const root = createRoot(container)
    const client = createRouteClientConfig({
      id: 'route-client-ui-verify',
      clientId: 'route-client-ui-verify',
      clientName: 'UI Verify Client',
      exposes: [
        {
          kind: 'skill',
          id: 'route-skill-root',
          enabled: true,
          path: 'SKILL.md',
          metadata: {
            title: 'Root skill',
            summary: 'Root summary',
            queryParameters: [],
            headerParameters: []
          },
          content: '# Root skill'
        },
        {
          kind: 'folder',
          id: 'route-folder-guides',
          path: 'guides'
        },
        {
          kind: 'skill',
          id: 'route-skill-guides',
          enabled: true,
          path: 'guides/SKILL.md',
          metadata: {
            title: 'Guide skill',
            summary: 'Guide summary',
            queryParameters: [],
            headerParameters: []
          },
          content: '# Guide skill'
        }
      ]
    })
    const draft: ExtensionConfig = {
      ...DEFAULT_EXTENSION_CONFIG,
      backgroundClients: [],
      routeClients: [client]
    }

    await act(async () => {
      root.render(
        <I18nProvider>
          <ClientAssetsPanel
            client={client}
            draft={draft}
            initialPath="SKILL.md"
            initialTab="assets"
            onSelectedPathChange={() => {}}
            onChange={() => {}}
          />
        </I18nProvider>
      )
    })

    const tree = container.querySelector('[role="tree"]') as HTMLElement | null
    expect(tree).toBeTruthy()

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

    expect(
      container.querySelectorAll('.MuiTreeItem-content.Mui-selected').length
    ).toBe(2)
  })
})
