import type { ExtensionConfiguration, SerializedRange, TextSlice } from '../model.js'

export interface CapabilityEnvironment {
  config: ExtensionConfiguration
  log(message: string): void
}

export interface DocumentSnapshot {
  uri: string
  fileName: string
  relativePath: string
  languageId: string
  version: number
  isDirty: boolean
  lineCount: number
  text?: TextSlice
}

export interface SelectionSnapshot {
  isEmpty: boolean
  range: SerializedRange
  text?: TextSlice
}

export interface SerializedTextSearchMatch {
  uri: string
  relativePath: string
  ranges: SerializedRange[]
  preview: {
    text: string
    matches: SerializedRange[]
  }
}

export type ActiveEditorSnapshot =
  | ({
    available: true
    selection: SelectionSnapshot
  } & DocumentSnapshot)
  | {
    available: false
    reason: string
  }
