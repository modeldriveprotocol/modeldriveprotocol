import * as vscode from 'vscode'

import {
  COMMAND_CONNECT,
  COMMAND_DISCONNECT,
  COMMAND_RECONNECT,
  COMMAND_SHOW_STATUS,
  OUTPUT_CHANNEL_NAME
} from './extension-constants.js'
import { ExtensionController } from './extension-controller.js'

let activeController: ExtensionController | undefined

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME)
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  )
  statusItem.command = COMMAND_SHOW_STATUS
  statusItem.show()

  const controller = new ExtensionController(context, output, statusItem)
  activeController = controller

  context.subscriptions.push(
    output,
    statusItem,
    vscode.commands.registerCommand(COMMAND_CONNECT, () => {
      void controller.connect('command', true)
    }),
    vscode.commands.registerCommand(COMMAND_DISCONNECT, () => {
      void controller.disconnect('command', true)
    }),
    vscode.commands.registerCommand(COMMAND_RECONNECT, () => {
      void controller.reconnect(true)
    }),
    vscode.commands.registerCommand(COMMAND_SHOW_STATUS, () => {
      controller.showStatus()
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('mdp')) {
        void controller.applyConfiguration()
      }
    }),
    {
      dispose() {
        void controller.dispose()
      }
    }
  )

  controller.initialize()
}

export async function deactivate(): Promise<void> {
  if (!activeController) {
    return
  }

  const controller = activeController
  activeController = undefined
  await controller.dispose()
}
