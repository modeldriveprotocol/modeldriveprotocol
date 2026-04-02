import type { MdpClient } from '@modeldriveprotocol/client'

import { getActiveEditorSnapshot, jsonResource, listWorkspaceFolders } from './shared.js'
import type { CapabilityEnvironment } from './types.js'

export function registerCapabilityResources(
  client: MdpClient,
  environment: CapabilityEnvironment
): void {
  const { config } = environment

  client.expose(
    '/vscode/workspace/folders',
    {
      method: 'GET',
      description: 'Workspace folders from the current VSCode window.',
      contentType: 'application/json'
    },
    async () =>
      jsonResource({
        workspaceFolders: listWorkspaceFolders()
      })
  )

  client.expose(
    '/vscode/active-editor/document',
    {
      method: 'GET',
      description: 'Current active editor document metadata and text excerpt.',
      contentType: 'application/json'
    },
    async () =>
      jsonResource(
        getActiveEditorSnapshot({
          includeDocumentText: true,
          includeSelectionText: false,
          textLimit: config.resourceTextLimit
        })
      )
  )

  client.expose(
    '/vscode/active-editor/selection',
    {
      method: 'GET',
      description: 'Current active editor selection and its surrounding metadata.',
      contentType: 'application/json'
    },
    async () =>
      jsonResource(
        getActiveEditorSnapshot({
          includeDocumentText: false,
          includeSelectionText: true,
          textLimit: config.resourceTextLimit
        })
      )
  )
}
