import { listWorkspaceMatchPatterns } from '#~/shared/config.js'
import { createRequestId } from '#~/shared/utils.js'
import {
  createNotificationIcon,
  serializeTab,
  toTargetTabSummary
} from '#~/background/shared.js'

import type { ChromeExtensionRuntime } from './index.js'

export async function listGrantedOrigins() {
  return chrome.permissions.getAll()
}

export async function listTabs(
  _runtime: ChromeExtensionRuntime,
  options: { windowId?: number; activeOnly?: boolean }
) {
  const query: chrome.tabs.QueryInfo = {}
  if (options.windowId !== undefined) {
    query.windowId = options.windowId
  }
  if (options.activeOnly !== undefined) {
    query.active = options.activeOnly
  }
  const tabs = await chrome.tabs.query(query)
  return tabs.map((tab) => serializeTab(tab))
}

export async function activateTab(tabId: number) {
  const tab = await chrome.tabs.update(tabId, { active: true })
  if (!tab) {
    throw new Error(`Unknown tab ${tabId}`)
  }
  return serializeTab(tab)
}

export async function reloadTab(runtime: ChromeExtensionRuntime, args: unknown) {
  const tab = await runtime.resolveTargetTab(args)
  await chrome.tabs.reload(tab.id)
  return { reloaded: true as const, tab: serializeTab(tab) }
}

export async function createTab(options: { url: string; active?: boolean }) {
  const tab = await chrome.tabs.create({
    url: options.url,
    ...(options.active !== undefined ? { active: options.active } : {})
  })
  return serializeTab(tab)
}

export async function closeTab(runtime: ChromeExtensionRuntime, args: unknown) {
  const tab = await runtime.resolveTargetTab(args)
  await chrome.tabs.remove(tab.id)
  return { closed: true as const, tabId: tab.id }
}

export async function showNotification(
  runtime: ChromeExtensionRuntime,
  options: { title?: string; message: string }
) {
  const config = await runtime.getConfig()
  const notificationId = createRequestId('notification')
  await chrome.notifications.create(notificationId, {
    type: 'basic',
    title: options.title ?? config.notificationTitle,
    message: options.message,
    iconUrl: createNotificationIcon()
  })
  return { shown: true as const, notificationId }
}

export async function openOptionsPage() {
  await chrome.runtime.openOptionsPage()
  return { opened: true as const }
}

export async function getActiveTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  })
  const activeTab = tabs.at(0)
  return activeTab ? serializeTab(activeTab) : undefined
}

export async function resolveTargetTab(_runtime: ChromeExtensionRuntime, args: unknown) {
  const tabId = typeof args === 'object' && args && 'tabId' in args ? (args as { tabId?: number }).tabId : undefined
  if (tabId !== undefined) {
    return toTargetTabSummary(await chrome.tabs.get(tabId))
  }
  const activeTab = await getActiveTab()
  if (!activeTab) {
    throw new Error('No active tab is available')
  }
  return toTargetTabSummary(activeTab)
}

export async function getGrantedWorkspacePatterns(runtime: ChromeExtensionRuntime) {
  const config = await runtime.getConfig()
  return runtime.getPermissionState(listWorkspaceMatchPatterns(config))
}
