import { z } from 'zod'

import { workspaceBundleEditorSchema as baseWorkspaceBundleEditorSchema } from './schema/root-definitions.js'

export const WORKSPACE_BUNDLE_SCHEMA_URI =
  'https://modeldriveprotocol.dev/schemas/chrome-extension-workspace-bundle.json'

export const workspaceBundleEditorSchema = baseWorkspaceBundleEditorSchema
  .meta({
    $id: WORKSPACE_BUNDLE_SCHEMA_URI,
    title: 'MDP Chrome extension workspace bundle'
  })

export const workspaceBundleJsonSchema = {
  ...z.toJSONSchema(workspaceBundleEditorSchema, {
    target: 'draft-07'
  }),
  additionalProperties: true
}
