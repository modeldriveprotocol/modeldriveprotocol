import type { MdpClient } from '@modeldriveprotocol/client'

import { type PromptPayload, createReviewPrompt, createUnavailablePrompt } from '../model.js'
import {
  asObject,
  collectDiagnostics,
  getActiveEditorSnapshot,
  readPositiveNumber,
  readString,
  resolveReviewText
} from './shared.js'
import type { CapabilityEnvironment } from './types.js'

export function registerReviewCapabilities(
  client: MdpClient,
  environment: CapabilityEnvironment
): void {
  const { config } = environment

  client.exposePrompt(
    'vscode.reviewSelection',
    async (args) =>
      buildReviewPrompt(
        asObject(args),
        config.resourceTextLimit,
        config.diagnosticResultLimit
      ),
    {
      description: 'Build a review prompt from the active VSCode selection or active document.',
      arguments: [
        {
          name: 'goal',
          description: 'What the review should optimize for',
          required: false
        },
        {
          name: 'tone',
          description: 'How concise or direct the review should be',
          required: false
        }
      ]
    }
  )

  client.exposeSkill(
    'vscode/review-active-editor',
    async (args) => {
      const options = asObject(args)
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
    },
    {
      description: 'Collect active editor review context, diagnostics, and a ready-to-use review prompt.',
      inputSchema: {
        type: 'object',
        properties: {
          goal: { type: 'string' },
          tone: { type: 'string' },
          textLimit: { type: 'number' },
          diagnosticLimit: { type: 'number' }
        }
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
