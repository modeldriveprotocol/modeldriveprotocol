import type { MdpClient } from '@modeldriveprotocol/client'

import { getActiveEditorSnapshot, jsonResource, listWorkspaceFolders } from './shared.js'
import type { CapabilityEnvironment } from './types.js'

export function registerCapabilityResources(
  client: MdpClient,
  environment: CapabilityEnvironment
): void {
  const { config } = environment

  client.exposeResource(
    'vscode://workspace/folders',
    async () =>
      jsonResource({
        workspaceFolders: listWorkspaceFolders()
      }),
    {
      name: 'VSCode Workspace Folders',
      description: 'Workspace folders from the current VSCode window.',
      mimeType: 'application/json'
    }
  )

  client.exposeResource(
    'vscode://active-editor/document',
    async () =>
      jsonResource(
        getActiveEditorSnapshot({
          includeDocumentText: true,
          includeSelectionText: false,
          textLimit: config.resourceTextLimit
        })
      ),
    {
      name: 'Active VSCode Document',
      description: 'Current active editor document metadata and text excerpt.',
      mimeType: 'application/json'
    }
  )

  client.exposeResource(
    'vscode://active-editor/selection',
    async () =>
      jsonResource(
        getActiveEditorSnapshot({
          includeDocumentText: false,
          includeSelectionText: true,
          textLimit: config.resourceTextLimit
        })
      ),
    {
      name: 'Active VSCode Selection',
      description: 'Current active editor selection and its surrounding metadata.',
      mimeType: 'application/json'
    }
  )
}
