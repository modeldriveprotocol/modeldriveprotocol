import type { MdpClient } from '@modeldriveprotocol/client'
import * as vscode from 'vscode'

import {
  type ExtensionControllerState,
  COMMAND_CONNECT,
  COMMAND_RECONNECT,
  COMMAND_SHOW_STATUS
} from './extension-constants.js'
import type { ExtensionConfiguration } from './model.js'

export interface ExtensionStatusView {
  state: ExtensionControllerState
  config: ExtensionConfiguration
  clientId: string
  descriptor?: ReturnType<MdpClient['describe']> | undefined
  lastConnectedAt?: string | undefined
  lastError?: string | undefined
  pendingReconnectAt?: string | undefined
}

export function showControllerStatus(
  output: vscode.OutputChannel,
  status: ExtensionStatusView
): void {
  const lines = [
    `State: ${status.state}`,
    `Server: ${status.config.serverUrl}`,
    `Auto-connect: ${status.config.autoConnect ? 'enabled' : 'disabled'}`,
    `Client id: ${status.descriptor?.id ?? status.clientId}`
  ]

  if (status.lastConnectedAt) {
    lines.push(`Last connected: ${status.lastConnectedAt}`)
  }

  if (status.lastError) {
    lines.push(`Last error: ${status.lastError}`)
  }

  if (status.descriptor) {
    lines.push(`Capabilities: ${capabilitySummary(status.descriptor)}`)
  }

  void vscode.window.showInformationMessage(lines.join(' | '))
  output.show(true)

  if (status.descriptor) {
    output.appendLine(JSON.stringify(status.descriptor, null, 2))
  }
}

export function updateStatusItem(
  statusItem: vscode.StatusBarItem,
  status: ExtensionStatusView
): void {
  switch (status.state) {
    case 'connected':
      statusItem.text = 'MDP: connected'
      statusItem.command = COMMAND_SHOW_STATUS
      break
    case 'waiting':
      statusItem.text = 'MDP: waiting'
      statusItem.command = COMMAND_RECONNECT
      break
    case 'connecting':
      statusItem.text = 'MDP: connecting'
      statusItem.command = COMMAND_SHOW_STATUS
      break
    case 'error':
      statusItem.text = 'MDP: error'
      statusItem.command = COMMAND_SHOW_STATUS
      break
    default:
      statusItem.text = status.config.autoConnect ? 'MDP: idle' : 'MDP: disabled'
      statusItem.command = COMMAND_CONNECT
      break
  }

  const details = [
    `server: ${status.config.serverUrl}`,
    `state: ${status.state}`,
    `client: ${status.descriptor?.id ?? status.clientId}`
  ]

  if (status.lastConnectedAt) {
    details.push(`last connected: ${status.lastConnectedAt}`)
  }

  if (status.lastError) {
    details.push(`last error: ${status.lastError}`)
  }

  if (status.pendingReconnectAt) {
    details.push(`next reconnect: ${status.pendingReconnectAt}`)
  }

  if (status.descriptor) {
    details.push(`capabilities: ${capabilitySummary(status.descriptor)}`)
  }

  statusItem.tooltip = details.join('\n')
}

export function capabilitySummary(
  descriptor: ReturnType<MdpClient['describe']>
): string {
  return [
    `${descriptor.tools.length} tools`,
    `${descriptor.prompts.length} prompts`,
    `${descriptor.skills.length} skills`,
    `${descriptor.resources.length} resources`
  ].join(', ')
}
