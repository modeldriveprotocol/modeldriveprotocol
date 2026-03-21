import type { MdpClient } from '@modeldriveprotocol/client'
import * as vscode from 'vscode'

import { isValidServerUrl, readExtensionConfiguration } from './config.js'
import { createExtensionClient, createExtensionClientInfo } from './extension-client.js'
import { type ExtensionControllerState } from './extension-constants.js'
import { showControllerStatus, updateStatusItem } from './extension-ui.js'
import type { ExtensionConfiguration } from './model.js'

export class ExtensionController {
  private readonly expectedClientClosures = new WeakSet<MdpClient>()
  private client: MdpClient | undefined
  private descriptor:
    | ReturnType<MdpClient['describe']>
    | undefined
  private lastError: string | undefined
  private lastConnectedAt: string | undefined
  private pendingReconnectAt: string | undefined
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private state: ExtensionControllerState = 'idle'
  private queue: Promise<void> = Promise.resolve()

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly output: vscode.OutputChannel,
    private readonly statusItem: vscode.StatusBarItem
  ) {}

  initialize(): void {
    const config = this.readConfiguration()
    this.updateStatus(config)

    if (config.autoConnect) {
      void this.connect('startup', false)
      return
    }

    this.log('Auto-connect is disabled.')
  }

  async connect(reason: string, notify: boolean): Promise<void> {
    return this.enqueue(async () => {
      const config = this.readConfiguration()

      await this.disposeClient(`prepare-${reason}`, false)
      await this.establishConnection(config, {
        reason,
        notifySuccess: notify,
        notifyError: notify || reason === 'startup'
      })
    })
  }

  async reconnect(notify: boolean): Promise<void> {
    return this.connect('reconnect', notify)
  }

  async disconnect(reason: string, notify: boolean): Promise<void> {
    return this.enqueue(async () => {
      await this.disposeClient(reason, notify)
      this.updateStatus(this.readConfiguration())
    })
  }

  async applyConfiguration(): Promise<void> {
    return this.enqueue(async () => {
      const config = this.readConfiguration()
      this.log('MDP configuration changed.')

      if (!config.autoConnect) {
        await this.disposeClient('configuration-disabled', false)
        this.lastError = undefined
        this.updateStatus(config)
        return
      }

      await this.disposeClient('configuration-reload', false)
      await this.establishConnection(config, {
        reason: 'configuration change',
        notifySuccess: false,
        notifyError: false
      })
    })
  }

  showStatus(): void {
    showControllerStatus(this.output, this.buildStatusView(this.readConfiguration()))
  }

  async dispose(): Promise<void> {
    await this.enqueue(async () => {
      this.clearReconnectTimer()
      await this.disposeClient('deactivate', false)
    })
  }

  private async disposeClient(reason: string, notify: boolean): Promise<void> {
    this.clearReconnectTimer()
    const client = this.client
    this.client = undefined
    this.descriptor = undefined

    if (!client) {
      this.pendingReconnectAt = undefined
      this.state = 'idle'
      return
    }

    try {
      this.expectedClientClosures.add(client)
      await client.disconnect()
      this.log(`Disconnected (${reason}).`)
    } catch (error) {
      this.lastError = errorMessage(error)
      this.log(`Disconnect failed (${reason}): ${this.lastError}`)
    } finally {
      this.state = 'idle'
    }

    if (notify) {
      void vscode.window.showInformationMessage('MDP client disconnected.')
    }
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const next = this.queue.then(task, task)
    this.queue = next.catch(() => undefined)
    return next
  }

  private async establishConnection(
    config: ExtensionConfiguration,
    options: {
      reason: string
      notifySuccess: boolean
      notifyError: boolean
    }
  ): Promise<void> {
    this.clearReconnectTimer()
    this.state = 'connecting'
    this.lastError = undefined
    this.updateStatus(config)

    try {
      if (!isValidServerUrl(config.serverUrl)) {
        throw new Error(
          `Unsupported MDP server URL: ${config.serverUrl}. Use ws, wss, http, or https.`
        )
      }

      const client = createExtensionClient(
        this.context,
        config,
        (message) => {
          this.log(message)
        },
        (closedClient) => {
          void this.handleTransportClose(closedClient, config.serverUrl)
        }
      )

      await client.connect()
      client.register()

      this.client = client
      this.descriptor = client.describe()
      this.state = 'connected'
      this.lastConnectedAt = new Date().toISOString()
      this.updateStatus(config)

      const summary = `Connected to ${config.serverUrl} as ${this.descriptor.id} (${
        capabilitySummary(this.descriptor)
      })`
      this.log(summary)

      if (options.notifySuccess) {
        void vscode.window.showInformationMessage(summary)
      }
    } catch (error) {
      this.client = undefined
      this.descriptor = undefined
      this.state = 'error'
      this.lastError = errorMessage(error)
      this.updateStatus(config)
      this.log(
        `Connection failed during ${options.reason}: ${this.lastError}`
      )

      if (options.notifyError) {
        void vscode.window.showErrorMessage(
          `MDP connection failed: ${this.lastError}`
        )
      }
    }
  }

  private readConfiguration(): ExtensionConfiguration {
    return readExtensionConfiguration(vscode.workspace.getConfiguration('mdp'))
  }

  private updateStatus(config: ExtensionConfiguration): void {
    updateStatusItem(this.statusItem, this.buildStatusView(config))
  }

  private buildStatusView(config: ExtensionConfiguration) {
    return {
      state: this.state,
      config,
      clientId: createExtensionClientInfo(this.context, config).id,
      descriptor: this.descriptor,
      lastConnectedAt: this.lastConnectedAt,
      lastError: this.lastError,
      pendingReconnectAt: this.pendingReconnectAt
    }
  }

  private log(message: string): void {
    this.output.appendLine(`[${new Date().toISOString()}] ${message}`)
  }

  private async handleTransportClose(
    client: MdpClient,
    serverUrl: string
  ): Promise<void> {
    await this.enqueue(async () => {
      if (this.expectedClientClosures.delete(client)) {
        return
      }

      if (this.client !== client) {
        return
      }

      const config = this.readConfiguration()
      this.client = undefined
      this.descriptor = undefined
      this.lastError = `Connection to ${serverUrl} closed unexpectedly.`
      this.log(this.lastError)

      if (config.autoConnect && config.autoReconnect) {
        this.scheduleReconnect(config)
        return
      }

      this.pendingReconnectAt = undefined
      this.state = 'error'
      this.updateStatus(config)
    })
  }

  private scheduleReconnect(config: ExtensionConfiguration): void {
    this.clearReconnectTimer()
    const reconnectAt = new Date(Date.now() + config.reconnectDelayMs)
    this.pendingReconnectAt = reconnectAt.toISOString()
    this.state = 'waiting'
    this.updateStatus(config)
    this.log(
      `Scheduling reconnect to ${config.serverUrl} in ${config.reconnectDelayMs}ms.`
    )

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      this.pendingReconnectAt = undefined
      void this.connect('auto-reconnect', false)
    }, config.reconnectDelayMs)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }

    this.pendingReconnectAt = undefined
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function capabilitySummary(
  descriptor: ReturnType<MdpClient['describe']>
): string {
  return [
    `${descriptor.tools.length} tools`,
    `${descriptor.prompts.length} prompts`,
    `${descriptor.skills.length} skills`,
    `${descriptor.resources.length} resources`
  ].join(', ')
}
