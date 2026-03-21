import { describe, expect, it } from 'vitest'

import {
  createDefaultClientId,
  createReviewPrompt,
  normalizeAllowedCommands,
  toJsonCompatible,
  truncateText
} from '../src/model.js'

describe('vscode extension model helpers', () => {
  it('normalizes allowlisted commands', () => {
    expect(
      normalizeAllowedCommands([' workbench.action.files.save ', '', 1, 'workbench.action.files.save'])
    ).toEqual(['workbench.action.files.save'])
  })

  it('creates stable sanitized client ids', () => {
    expect(createDefaultClientId('Machine Id 01', 'Repo / Window')).toBe(
      'vscode-machine-id-01-repo-window'
    )
  })

  it('truncates long text and reports original length', () => {
    const slice = truncateText('abcdef', 3)

    expect(slice.truncated).toBe(true)
    expect(slice.totalLength).toBe(6)
    expect(slice.text).toContain('[truncated 3 chars]')
  })

  it('serializes nested values into JSON-compatible data', () => {
    const circular: { self?: unknown; error: Error; nested: Date } = {
      error: new Error('boom'),
      nested: new Date('2025-01-01T00:00:00.000Z')
    }
    circular.self = circular

    expect(toJsonCompatible(circular)).toEqual({
      error: {
        name: 'Error',
        message: 'boom'
      },
      nested: '2025-01-01T00:00:00.000Z',
      self: '[Circular]'
    })
  })

  it('builds review prompts from editor context', () => {
    const payload = createReviewPrompt({
      fileLabel: 'src/example.ts',
      languageId: 'typescript',
      sourceKind: 'selection',
      text: {
        text: 'const answer = 42;',
        truncated: false,
        totalLength: 18
      },
      diagnostics: [
        {
          uri: 'file:///src/example.ts',
          severity: 'warning',
          message: 'Unused value',
          range: {
            start: { line: 0, character: 6 },
            end: { line: 0, character: 12 }
          }
        }
      ],
      goal: 'behavioral regressions',
      tone: 'very terse'
    })
    const [systemMessage, userMessage] = payload.messages

    expect(payload.description).toContain('src/example.ts')
    expect(systemMessage!.content).toContain('behavioral regressions')
    expect(userMessage!.content).toContain('Unused value')
    expect(userMessage!.content).toContain('const answer = 42;')
  })
})
