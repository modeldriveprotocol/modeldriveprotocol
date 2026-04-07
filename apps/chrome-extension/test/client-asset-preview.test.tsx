// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SidepanelAssetPreview } from '../src/ui/apps/sidepanel/client-asset-preview.js'

describe('sidepanel asset preview', () => {
  let container: HTMLDivElement
  let root: Root | undefined

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)

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
    if (root) {
      act(() => {
        root?.unmount()
      })
      root = undefined
    }
    vi.unstubAllGlobals()
    container.remove()
  })

  it('keeps a same-named file selected instead of resolving it as the folder', async () => {
    root = createRoot(container)

    await act(async () => {
      root.render(
        <SidepanelAssetPreview
          entries={[
            {
              path: '/clients',
              displayPath: 'clients',
              contentKind: 'code',
              content: 'endpoint file content'
            },
            {
              path: '/clients/SKILL.md',
              displayPath: 'clients/SKILL.md',
              contentKind: 'markdown',
              content: '# clients folder'
            }
          ]}
          preferredPath="/clients"
          emptyLabel="Empty"
          pathLabel="Path"
        />
      )
    })

    expect(container.textContent).toContain('endpoint file content')
    expect(container.textContent).not.toContain('# clients folder')

    const trigger = container.querySelector(
      '[aria-label="Path: /clients"]'
    ) as HTMLElement | null

    expect(trigger).toBeTruthy()

    await act(async () => {
      trigger?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    const menuItems = Array.from(
      document.body.querySelectorAll('[role="menuitem"]')
    ) as HTMLElement[]

    expect(menuItems.map((item) => item.textContent?.trim())).toEqual([
      'clients/',
      'clients'
    ])
    expect(
      menuItems.find((item) => item.classList.contains('Mui-selected'))
        ?.textContent?.trim()
    ).toBe('clients')

    const folderItem = menuItems.find(
      (item) => item.textContent?.trim() === 'clients/'
    )

    await act(async () => {
      folderItem?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })

    expect(container.textContent).toContain('clients folder')
    expect(container.textContent).not.toContain('endpoint file content')
  })
})
