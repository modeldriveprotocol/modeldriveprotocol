import { MonacoCodeEditor } from '../foundation/monaco-editor.js'

import {
  WORKSPACE_BUNDLE_SCHEMA_URI,
  workspaceBundleJsonSchema
} from './schema.js'

const WORKSPACE_BUNDLE_MODEL_URI =
  'inmemory://modeldriveprotocol/chrome-extension/workspace-bundle.json'

export function WorkspaceBundleEditor({
  ariaLabel,
  minHeight = 360,
  onChange,
  value
}: {
  ariaLabel: string
  minHeight?: number
  onChange: (value: string) => void
  value: string
}) {
  return (
    <MonacoCodeEditor
      ariaLabel={ariaLabel}
      jsonSchema={{
        schemaUri: WORKSPACE_BUNDLE_SCHEMA_URI,
        schema: workspaceBundleJsonSchema
      }}
      language="json"
      minHeight={minHeight}
      modelUri={WORKSPACE_BUNDLE_MODEL_URI}
      onChange={onChange}
      options={{
        formatOnPaste: true,
        formatOnType: true,
        quickSuggestions: {
          comments: false,
          other: true,
          strings: true
        },
        wordWrap: 'on'
      }}
      value={value}
    />
  )
}
