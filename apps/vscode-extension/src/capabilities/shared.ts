import { isAbsolute } from 'node:path'

import * as vscode from 'vscode'

import {
  type SerializedDiagnostic,
  type SerializedRange,
  type TextSlice,
  severityLabel,
  toJsonCompatible,
  truncateText
} from '../model.js'
import type { ActiveEditorSnapshot, DocumentSnapshot, SerializedTextSearchMatch } from './types.js'

export function getActiveEditorSnapshot(options: {
  includeDocumentText: boolean
  includeSelectionText: boolean
  textLimit: number
}): ActiveEditorSnapshot {
  const editor = vscode.window.activeTextEditor

  if (!editor) {
    return {
      available: false,
      reason: 'No active editor is open in this VSCode window.'
    }
  }

  return {
    available: true,
    ...createDocumentSnapshot(editor.document, {
      includeText: options.includeDocumentText,
      textLimit: options.textLimit
    }),
    selection: {
      isEmpty: editor.selection.isEmpty,
      range: serializeRange(editor.selection),
      ...(options.includeSelectionText
        ? { text: truncateText(editor.document.getText(editor.selection), options.textLimit) }
        : {})
    }
  }
}

export function listWorkspaceFolders() {
  return (vscode.workspace.workspaceFolders ?? []).map((folder) => ({
    name: folder.name,
    index: folder.index,
    uri: folder.uri.toString()
  }))
}

export function createDocumentSnapshot(
  document: vscode.TextDocument,
  options: {
    includeText: boolean
    textLimit: number
  }
): DocumentSnapshot {
  return {
    uri: document.uri.toString(),
    fileName: document.fileName,
    relativePath: toRelativePath(document.uri),
    languageId: document.languageId,
    version: document.version,
    isDirty: document.isDirty,
    lineCount: document.lineCount,
    ...(options.includeText
      ? { text: truncateText(document.getText(), options.textLimit) }
      : {})
  }
}

export async function resolveWorkspaceDocument(
  options: Record<string, unknown>
): Promise<vscode.TextDocument> {
  const uri = readString(options.uri)

  if (uri) {
    return vscode.workspace.openTextDocument(vscode.Uri.parse(uri))
  }

  const workspacePath = normalizeWorkspacePath(readString(options.path))

  if (!workspacePath) {
    throw new Error('Provide either "uri" or "path" when reading a workspace file.')
  }

  if (isAbsolute(workspacePath)) {
    return vscode.workspace.openTextDocument(vscode.Uri.file(workspacePath))
  }

  const matches = await vscode.workspace.findFiles(workspacePath, undefined, 2)

  if (matches.length === 0) {
    throw new Error(`No workspace file matched "${workspacePath}".`)
  }

  if (matches.length > 1) {
    throw new Error(
      `Workspace path "${workspacePath}" matched multiple files. Use "uri" to disambiguate.`
    )
  }

  return vscode.workspace.openTextDocument(matches[0] as vscode.Uri)
}

export function resolveReviewText(
  activeEditor: Extract<ActiveEditorSnapshot, { available: true }>
): TextSlice {
  return activeEditor.selection.isEmpty
    ? (activeEditor.text as TextSlice)
    : activeEditor.selection.text ?? (activeEditor.text as TextSlice)
}

export async function searchWorkspaceText(options: {
  query: string
  include?: string | undefined
  exclude?: string | undefined
  maxResults: number
  isCaseSensitive: boolean
  isRegExp: boolean
  isWordMatch: boolean
  previewChars: number
}): Promise<{
  results: SerializedTextSearchMatch[]
  limitHit: boolean
}> {
  const results: SerializedTextSearchMatch[] = []
  const completion = await vscode.workspace.findTextInFiles(
    {
      pattern: options.query,
      isCaseSensitive: options.isCaseSensitive,
      isRegExp: options.isRegExp,
      isWordMatch: options.isWordMatch
    },
    {
      ...(options.include ? { include: options.include } : {}),
      ...(options.exclude ? { exclude: options.exclude } : {}),
      maxResults: options.maxResults,
      previewOptions: {
        matchLines: 1,
        charsPerLine: options.previewChars
      }
    },
    (result) => {
      if (!isTextSearchMatch(result) || results.length >= options.maxResults) {
        return
      }

      results.push(serializeTextSearchMatch(result))
    }
  )

  return {
    results,
    limitHit: completion.limitHit ?? results.length >= options.maxResults
  }
}

export function collectDiagnostics(options: {
  uri?: string | undefined
  limit: number
  severity?: ReturnType<typeof readSeverity> | undefined
}): SerializedDiagnostic[] {
  const diagnostics = options.uri
    ? (() => {
      const uri = vscode.Uri.parse(options.uri as string)
      return [[uri, vscode.languages.getDiagnostics(uri)] as const]
    })()
    : vscode.languages.getDiagnostics()

  const entries: SerializedDiagnostic[] = []

  for (const [uri, items] of diagnostics) {
    for (const diagnostic of items) {
      const severity = severityLabel(diagnostic.severity)

      if (options.severity && severity !== options.severity) {
        continue
      }

      const code = normalizeDiagnosticCode(diagnostic.code)
      const entry: SerializedDiagnostic = {
        uri: uri.toString(),
        severity,
        message: diagnostic.message,
        range: serializeRange(diagnostic.range),
        ...(diagnostic.source ? { source: diagnostic.source } : {}),
        ...(code !== undefined ? { code } : {})
      }

      entries.push(entry)

      if (entries.length >= options.limit) {
        return entries
      }
    }
  }

  return entries
}

export function jsonResource(payload: unknown) {
  return {
    mimeType: 'application/json',
    text: JSON.stringify(toJsonCompatible(payload), null, 2)
  }
}

export function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function readPositiveNumber(
  value: unknown,
  fallback: number,
  max: number
): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.min(Math.floor(value), max)
    : fallback
}

export function readSeverity(value: unknown) {
  if (
    value === 'error' ||
    value === 'warning' ||
    value === 'information' ||
    value === 'hint'
  ) {
    return value
  }

  return undefined
}

function normalizeDiagnosticCode(
  code: string | number | { value: string | number } | undefined
): string | number | undefined {
  if (code === undefined) {
    return undefined
  }

  if (typeof code === 'string' || typeof code === 'number') {
    return code
  }

  return code.value
}

function serializeRange(range: vscode.Range): SerializedRange {
  return {
    start: {
      line: range.start.line,
      character: range.start.character
    },
    end: {
      line: range.end.line,
      character: range.end.character
    }
  }
}

function serializeRangeList(
  value: vscode.Range | readonly vscode.Range[]
): SerializedRange[] {
  const ranges = Array.isArray(value) ? value : [value]
  return ranges.map((range) => serializeRange(range))
}

function serializeTextSearchMatch(
  match: vscode.TextSearchMatch
): SerializedTextSearchMatch {
  return {
    uri: match.uri.toString(),
    relativePath: toRelativePath(match.uri),
    ranges: serializeRangeList(match.ranges),
    preview: {
      text: match.preview.text,
      matches: serializeRangeList(match.preview.matches)
    }
  }
}

function isTextSearchMatch(
  result: vscode.TextSearchResult
): result is vscode.TextSearchMatch {
  return 'preview' in result && 'ranges' in result
}

function toRelativePath(uri: vscode.Uri): string {
  return vscode.workspace.asRelativePath(
    uri,
    (vscode.workspace.workspaceFolders?.length ?? 0) > 1
  )
}

function normalizeWorkspacePath(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  return value.replace(/^[.][/\\]/, '').replace(/\\/g, '/')
}
