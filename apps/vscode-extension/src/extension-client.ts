import { type MdpClient, createMdpClient } from '@modeldriveprotocol/client/node'
import * as vscode from 'vscode'

import { registerCapabilities } from './capabilities.js'
import {
  type ExtensionConfiguration,
  createDefaultClientId,
  createDefaultClientName,
  getWorkspaceLabel
} from './model.js'
import { createObservedClientTransport } from './transport.js'

export function createExtensionClient(
  context: vscode.ExtensionContext,
  config: ExtensionConfiguration,
  log: (message: string) => void,
  onTransportClose: (client: MdpClient) => void
): MdpClient {
  let client: MdpClient
  const transport = createObservedClientTransport(config.serverUrl, () => {
    onTransportClose(client)
  })

  client = createMdpClient({
    serverUrl: config.serverUrl,
    transport,
    client: createExtensionClientInfo(context, config),
    ...(config.authToken
      ? {
        auth: {
          token: config.authToken
        }
      }
      : {})
  })

  registerCapabilities(client, {
    config,
    log
  })

  return client
}

export function createExtensionClientInfo(
  context: vscode.ExtensionContext,
  config: ExtensionConfiguration
) {
  const folders = (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.name)
  const workspaceLabel = getWorkspaceLabel(folders)
  const id = config.clientId ??
    createDefaultClientId(vscode.env.machineId, workspaceLabel)
  const name = config.clientName ?? createDefaultClientName(workspaceLabel)
  const clientVersion = readExtensionVersion(context)

  return {
    id,
    name,
    description: 'VSCode extension host exposing editor, resource, prompt, and skill capabilities through MDP.',
    ...(clientVersion ? { version: clientVersion } : {}),
    platform: `vscode-${vscode.version}`,
    metadata: {
      extensionId: context.extension.id,
      workspaceLabel,
      workspaceFolderCount: folders.length,
      allowedCommandCount: config.allowedCommands.length,
      autoConnect: config.autoConnect
    }
  }
}

function readExtensionVersion(
  context: vscode.ExtensionContext
): string | undefined {
  const packageJson = context.extension.packageJSON as {
    version?: unknown
  }

  return typeof packageJson.version === 'string' ? packageJson.version : undefined
}
