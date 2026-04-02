import { describe, expect, it } from 'vitest'

import config from '../../../docs/.vitepress/config.mts'

describe('docs sidebar', () => {
  it('includes manual install in the english guide sidebar', () => {
    const sidebar = readGuideSidebar('root')

    expect(flattenLinks(sidebar)).toContain('/guide/manual-install')
  })

  it('includes manual install in the chinese guide sidebar', () => {
    const sidebar = readGuideSidebar('zh-Hans')

    expect(flattenLinks(sidebar)).toContain('/zh-Hans/guide/manual-install')
  })

  it('includes browser simple mdp client in the english apps sidebar', () => {
    const sidebar = readAppsSidebar('root')

    expect(flattenLinks(sidebar)).toContain('/apps/browser-simple-mdp-client')
  })

  it('includes browser simple mdp client in the chinese apps sidebar', () => {
    const sidebar = readAppsSidebar('zh-Hans')

    expect(flattenLinks(sidebar)).toContain('/zh-Hans/apps/browser-simple-mdp-client')
  })

  it('includes canonical tools pages in the english server sidebar', () => {
    const sidebar = readServerSidebar('root')

    expect(flattenLinks(sidebar)).toContain('/server/tools/list-paths')
    expect(flattenLinks(sidebar)).toContain('/server/tools/call-path')
    expect(flattenLinks(sidebar)).toContain('/server/tools/call-paths')
    expect(flattenLinks(sidebar)).not.toContain('/server/tools/list-tools')
    expect(flattenLinks(sidebar)).not.toContain('/server/tools/call-tools')
  })

  it('includes canonical tools pages in the chinese server sidebar', () => {
    const sidebar = readServerSidebar('zh-Hans')

    expect(flattenLinks(sidebar)).toContain('/zh-Hans/server/tools/list-paths')
    expect(flattenLinks(sidebar)).toContain('/zh-Hans/server/tools/call-path')
    expect(flattenLinks(sidebar)).toContain('/zh-Hans/server/tools/call-paths')
    expect(flattenLinks(sidebar)).not.toContain('/zh-Hans/server/tools/list-tools')
    expect(flattenLinks(sidebar)).not.toContain('/zh-Hans/server/tools/call-tools')
  })
})

function readGuideSidebar(locale: 'root' | 'zh-Hans') {
  const themeConfig = config.locales?.[locale]?.themeConfig as {
    sidebar: Record<string, Array<{ link?: string, items?: unknown[] }>>
  }
  const guidePrefix = locale === 'root' ? '/guide/' : '/zh-Hans/guide/'
  return themeConfig.sidebar[guidePrefix] ?? []
}

function readAppsSidebar(locale: 'root' | 'zh-Hans') {
  const themeConfig = config.locales?.[locale]?.themeConfig as {
    sidebar: Record<string, Array<{ link?: string, items?: unknown[] }>>
  }
  const appsPrefix = locale === 'root' ? '/apps/' : '/zh-Hans/apps/'
  return themeConfig.sidebar[appsPrefix] ?? []
}

function readServerSidebar(locale: 'root' | 'zh-Hans') {
  const themeConfig = config.locales?.[locale]?.themeConfig as {
    sidebar: Record<string, Array<{ link?: string, items?: unknown[] }>>
  }
  const serverPrefix = locale === 'root' ? '/server/' : '/zh-Hans/server/'
  return themeConfig.sidebar[serverPrefix] ?? []
}

function flattenLinks(
  items: Array<{ link?: string, items?: unknown[] }>
): string[] {
  const links: string[] = []

  for (const item of items) {
    if (item.link) {
      links.push(item.link)
    }

    if (Array.isArray(item.items)) {
      links.push(...flattenLinks(item.items as Array<{ link?: string, items?: unknown[] }>))
    }
  }

  return links
}
