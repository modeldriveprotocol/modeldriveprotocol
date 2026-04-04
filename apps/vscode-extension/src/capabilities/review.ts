import type { MdpClient } from '@modeldriveprotocol/client/node'

import { type PromptPayload, createReviewPrompt, createUnavailablePrompt } from '../model.js'
import {
  collectDiagnostics,
  getActiveEditorSnapshot,
  readPositiveNumber,
  readRequestObject,
  readString,
  resolveReviewText
} from './shared.js'
import type { CapabilityEnvironment } from './types.js'

export function registerReviewCapabilities(
  client: MdpClient,
  environment: CapabilityEnvironment
): void {
  const { config } = environment

  client.expose(
    '/vscode/review-selection/prompt.md',
    {
      description: 'Build a review prompt from the active VSCode selection or active document.',
      inputSchema: {
        type: 'object',
        properties: {
          goal: { type: 'string' },
          tone: { type: 'string' },
          textLimit: { type: 'number' },
          diagnosticLimit: { type: 'number' }
        }
      }
    },
    async (request) =>
      buildReviewPrompt(
        readRequestObject(request),
        config.resourceTextLimit,
        config.diagnosticResultLimit
      )
  )

  client.expose(
    '/vscode/review-active-editor/skill.md',
    {
      description: 'Collect active editor review context, diagnostics, and a ready-to-use review prompt.',
      contentType: 'application/json'
    },
    async (request) => {
      const options = readRequestObject(request)
      const textLimit = readPositiveNumber(
        options.textLimit,
        config.resourceTextLimit,
        200_000
      )
      const diagnosticLimit = readPositiveNumber(
        options.diagnosticLimit,
        config.diagnosticResultLimit,
        1_000
      )
      const activeEditor = getActiveEditorSnapshot({
        includeDocumentText: true,
        includeSelectionText: true,
        textLimit
      })

      if (!activeEditor.available) {
        return {
          available: false,
          summary: activeEditor.reason,
          suggestedPrompt: createUnavailablePrompt(activeEditor.reason)
        }
      }

      const diagnostics = collectDiagnostics({
        uri: activeEditor.uri,
        limit: diagnosticLimit
      })
      const sourceKind = activeEditor.selection.isEmpty ? 'document' : 'selection'
      const text = resolveReviewText(activeEditor)
      const prompt = buildReviewPrompt(options, textLimit, diagnosticLimit)

      return {
        available: true,
        summary: `Collected ${sourceKind} review context for ${activeEditor.relativePath}`,
        editor: activeEditor,
        diagnostics,
        suggestedPrompt: prompt,
        reviewSource: sourceKind,
        text
      }
    }
  )
}

function buildReviewPrompt(
  options: Record<string, unknown>,
  defaultTextLimit: number,
  defaultDiagnosticLimit: number
): PromptPayload {
  const textLimit = readPositiveNumber(options.textLimit, defaultTextLimit, 200_000)
  const diagnosticLimit = readPositiveNumber(
    options.diagnosticLimit,
    defaultDiagnosticLimit,
    1_000
  )
  const activeEditor = getActiveEditorSnapshot({
    includeDocumentText: true,
    includeSelectionText: true,
    textLimit
  })

  if (!activeEditor.available) {
    return createUnavailablePrompt(activeEditor.reason)
  }

  const diagnostics = collectDiagnostics({
    uri: activeEditor.uri,
    limit: diagnosticLimit
  })
  const sourceKind = activeEditor.selection.isEmpty ? 'document' : 'selection'
  const text = resolveReviewText(activeEditor)

  return createReviewPrompt({
    fileLabel: activeEditor.relativePath,
    languageId: activeEditor.languageId,
    sourceKind,
    text,
    diagnostics,
    goal: readString(options.goal),
    tone: readString(options.tone)
  })
}
