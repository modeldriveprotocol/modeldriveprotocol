import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_EXTENSION_CONFIGURATION } from '../src/config.js'
import type { ExtensionConfiguration } from '../src/model.js'

interface MockUri {
  fsPath: string
  path: string
  scheme: string
  toString(skipEncoding?: boolean): string
}

interface RegisteredCapability {
  handler: (args: unknown) => Promise<unknown> | unknown
  options: unknown
}

const state = {
  workspaceFolders: undefined as
    | Array<{
      name: string
      index: number
      uri: MockUri
    }>
    | undefined,
  activeTextEditor: undefined as
    | {
      document: ReturnType<typeof createDocument>
      selection: ReturnType<typeof createRange>
    }
    | undefined,
  diagnosticsByUri: new Map<string, unknown[]>(),
  allDiagnostics: [] as Array<[MockUri, unknown[]]>,
  findFiles: vi.fn(),
  findTextInFiles: vi.fn(),
  openTextDocument: vi.fn(),
  executeCommand: vi.fn()
}

vi.mock(
  'vscode',
  () => ({
    Uri: {
      parse(value: string) {
        return createUri(value)
      },
      file(path: string) {
        return createUri(`file://${path.startsWith('/') ? '' : '/'}${path}`)
      }
    },
    workspace: {
      get workspaceFolders() {
        return state.workspaceFolders
      },
      getConfiguration: () => ({
        get<T>(_section: string, defaultValue?: T) {
          return defaultValue
        }
      }),
      onDidChangeConfiguration: () => ({ dispose() {} }),
      findFiles: (...args: Parameters<typeof state.findFiles>) => state.findFiles(...args),
      findTextInFiles: (...args: Parameters<typeof state.findTextInFiles>) => state.findTextInFiles(...args),
      openTextDocument: (...args: Parameters<typeof state.openTextDocument>) => state.openTextDocument(...args),
      asRelativePath(pathOrUri: string | MockUri, includeWorkspaceFolder?: boolean) {
        const uri = typeof pathOrUri === 'string' ? createUri(pathOrUri) : pathOrUri
        const folders = state.workspaceFolders ?? []

        for (const folder of folders) {
          const base = stripTrailingSlash(folder.uri.fsPath)

          if (uri.fsPath === base) {
            return includeWorkspaceFolder ? folder.name : ''
          }

          if (uri.fsPath.startsWith(`${base}/`)) {
            const relativePath = uri.fsPath.slice(base.length + 1)
            return includeWorkspaceFolder
              ? `${folder.name}/${relativePath}`
              : relativePath
          }
        }

        return uri.fsPath.replace(/^\/+/, '')
      }
    },
    languages: {
      getDiagnostics(uri?: MockUri) {
        if (uri) {
          return state.diagnosticsByUri.get(uri.toString()) ?? []
        }

        return state.allDiagnostics
      }
    },
    window: {
      get activeTextEditor() {
        return state.activeTextEditor
      },
      showInformationMessage: vi.fn(),
      showErrorMessage: vi.fn()
    },
    commands: {
      executeCommand: (...args: Parameters<typeof state.executeCommand>) => state.executeCommand(...args)
    },
    DiagnosticSeverity: {
      Error: 0,
      Warning: 1,
      Information: 2,
      Hint: 3
    }
  })
)

let registerCapabilities: typeof import('../src/capabilities.js').registerCapabilities

beforeEach(async () => {
  if (!registerCapabilities) {
    ;({ registerCapabilities } = await import('../src/capabilities.js'))
  }

  resetState()
})

describe('vscode extension capabilities', () => {
  it('registers a workspace text search tool and serializes matches', async () => {
    const client = new FakeClient()

    state.findTextInFiles.mockImplementationOnce(
      async (
        query: Record<string, unknown>,
        options: Record<string, unknown>,
        callback: (result: unknown) => void
      ) => {
        expect(query).toEqual({
          pattern: 'answer',
          isCaseSensitive: true,
          isRegExp: false,
          isWordMatch: false
        })
        expect(options).toEqual({
          include: 'src/**/*.ts',
          maxResults: 8,
          previewOptions: {
            matchLines: 1,
            charsPerLine: 120
          }
        })

        callback({
          uri: createUri('file:///workspace/src/example.ts'),
          ranges: createRange(4, 6, 4, 12),
          preview: {
            text: 'const answer = 42;',
            matches: createRange(0, 6, 0, 12)
          }
        })
        callback({
          uri: createUri('file:///workspace/src/example.ts'),
          text: 'context',
          lineNumber: 5
        })

        return {
          limitHit: false
        }
      }
    )

    registerCapabilities(client as never, {
      config: createConfig(),
      log: () => {}
    })

    const searchTool = client.tools.get('vscode.searchWorkspaceText')
    expect(searchTool).toBeDefined()

    const result = await searchTool!.handler({
      query: 'answer',
      include: 'src/**/*.ts',
      isCaseSensitive: true,
      maxResults: 8,
      previewChars: 120
    })

    expect(result).toEqual({
      query: 'answer',
      include: 'src/**/*.ts',
      exclude: null,
      maxResults: 8,
      previewChars: 120,
      isCaseSensitive: true,
      isRegExp: false,
      isWordMatch: false,
      results: [
        {
          uri: 'file:///workspace/src/example.ts',
          relativePath: 'src/example.ts',
          ranges: [
            {
              start: { line: 4, character: 6 },
              end: { line: 4, character: 12 }
            }
          ],
          preview: {
            text: 'const answer = 42;',
            matches: [
              {
                start: { line: 0, character: 6 },
                end: { line: 0, character: 12 }
              }
            ]
          }
        }
      ],
      resultCount: 1,
      limitHit: false
    })
  })

  it('rejects text search requests without a query', async () => {
    const client = new FakeClient()
    registerCapabilities(client as never, {
      config: createConfig(),
      log: () => {}
    })

    const searchTool = client.tools.get('vscode.searchWorkspaceText')

    await expect(searchTool!.handler({})).rejects.toThrow(
      'Missing required "query" argument'
    )
  })

  it('reads workspace files by relative path and includes diagnostics', async () => {
    const client = new FakeClient()
    const document = createDocument({
      uri: 'file:///workspace/src/example.ts',
      text: 'const answer = 42;'
    })

    state.findFiles.mockResolvedValueOnce([document.uri])
    state.openTextDocument.mockResolvedValueOnce(document)
    setDiagnostics([
      {
        uri: document.uri.toString(),
        diagnostics: [
          createDiagnostic({
            severity: 1,
            message: 'Unused value',
            range: createRange(0, 6, 0, 12),
            code: 'no-unused-vars'
          })
        ]
      }
    ])

    registerCapabilities(client as never, {
      config: createConfig({
        resourceTextLimit: 6,
        diagnosticResultLimit: 5
      }),
      log: () => {}
    })

    const readWorkspaceFileTool = client.tools.get('vscode.readWorkspaceFile')
    const result = await readWorkspaceFileTool!.handler({
      path: './src/example.ts',
      includeDiagnostics: true
    })

    expect(state.findFiles).toHaveBeenCalledWith('src/example.ts', undefined, 2)
    expect(result).toEqual({
      uri: 'file:///workspace/src/example.ts',
      fileName: '/workspace/src/example.ts',
      relativePath: 'src/example.ts',
      languageId: 'typescript',
      version: 1,
      isDirty: false,
      lineCount: 1,
      text: {
        text: 'const \n\n[truncated 12 chars]',
        truncated: true,
        totalLength: 18
      },
      diagnostics: [
        {
          uri: 'file:///workspace/src/example.ts',
          severity: 'warning',
          message: 'Unused value',
          range: {
            start: { line: 0, character: 6 },
            end: { line: 0, character: 12 }
          },
          code: 'no-unused-vars'
        }
      ]
    })
  })
})

class FakeClient {
  readonly tools = new Map<string, RegisteredCapability>()
  readonly prompts = new Map<string, RegisteredCapability>()
  readonly skills = new Map<string, RegisteredCapability>()
  readonly resources = new Map<string, RegisteredCapability>()

  exposeTool(
    name: string,
    handler: RegisteredCapability['handler'],
    options: unknown
  ): void {
    this.tools.set(name, { handler, options })
  }

  exposePrompt(
    name: string,
    handler: RegisteredCapability['handler'],
    options: unknown
  ): void {
    this.prompts.set(name, { handler, options })
  }

  exposeSkill(
    name: string,
    handler: RegisteredCapability['handler'],
    options: unknown
  ): void {
    this.skills.set(name, { handler, options })
  }

  exposeResource(
    name: string,
    handler: RegisteredCapability['handler'],
    options: unknown
  ): void {
    this.resources.set(name, { handler, options })
  }
}

function resetState(): void {
  state.workspaceFolders = [
    {
      name: 'workspace',
      index: 0,
      uri: createUri('file:///workspace')
    }
  ]
  state.activeTextEditor = undefined
  state.diagnosticsByUri = new Map()
  state.allDiagnostics = []
  state.findFiles = vi.fn()
  state.findTextInFiles = vi.fn()
  state.openTextDocument = vi.fn()
  state.executeCommand = vi.fn()
}

function createConfig(
  overrides: Partial<ExtensionConfiguration> = {}
): ExtensionConfiguration {
  return {
    ...DEFAULT_EXTENSION_CONFIGURATION,
    ...overrides
  }
}

function createUri(value: string): MockUri {
  const url = new URL(value)
  const fsPath = url.protocol === 'file:' ? decodeURIComponent(url.pathname) : url.pathname

  return {
    fsPath,
    path: url.pathname,
    scheme: url.protocol.slice(0, -1),
    toString() {
      return value
    }
  }
}

function createRange(
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number
) {
  return {
    start: {
      line: startLine,
      character: startCharacter
    },
    end: {
      line: endLine,
      character: endCharacter
    },
    isEmpty: startLine === endLine && startCharacter === endCharacter
  }
}

function createDocument(options: {
  uri: string
  text: string
  languageId?: string
  version?: number
  isDirty?: boolean
}) {
  const uri = createUri(options.uri)

  return {
    uri,
    fileName: uri.fsPath,
    languageId: options.languageId ?? 'typescript',
    version: options.version ?? 1,
    isDirty: options.isDirty ?? false,
    lineCount: options.text.split(/\r?\n/u).length,
    getText(range?: unknown) {
      return range ? options.text : options.text
    }
  }
}

function createDiagnostic(options: {
  severity: number
  message: string
  range: ReturnType<typeof createRange>
  source?: string
  code?: string | number | { value: string | number }
}) {
  return {
    severity: options.severity,
    message: options.message,
    range: options.range,
    ...(options.source ? { source: options.source } : {}),
    ...(options.code !== undefined ? { code: options.code } : {})
  }
}

function setDiagnostics(
  entries: Array<{
    uri: string
    diagnostics: unknown[]
  }>
): void {
  state.diagnosticsByUri = new Map(
    entries.map((entry) => [entry.uri, entry.diagnostics])
  )
  state.allDiagnostics = entries.map((entry) => [
    createUri(entry.uri),
    entry.diagnostics
  ])
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, '')
}
