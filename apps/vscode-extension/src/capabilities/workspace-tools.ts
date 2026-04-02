import type { MdpClient } from '@modeldriveprotocol/client'
import * as vscode from 'vscode'

import { toJsonCompatible } from '../model.js'
import {
  collectDiagnostics,
  createDocumentSnapshot,
  getActiveEditorSnapshot,
  listWorkspaceFolders,
  readBoolean,
  readPositiveNumber,
  readRequestObject,
  readSeverity,
  readString,
  resolveWorkspaceDocument,
  searchWorkspaceText
} from './shared.js'
import type { CapabilityEnvironment } from './types.js'

export function registerWorkspaceTools(
  client: MdpClient,
  environment: CapabilityEnvironment
): void {
  const { config } = environment

  client.expose(
    '/vscode/get-workspace-context',
    {
      method: 'POST',
      description: 'Read the current VSCode workspace, active editor, and diagnostic state.',
      inputSchema: {
        type: 'object',
        properties: {
          includeDocumentText: { type: 'boolean' },
          includeSelectionText: { type: 'boolean' },
          textLimit: { type: 'number' },
          diagnosticLimit: { type: 'number' },
          severity: {
            type: 'string',
            enum: ['error', 'warning', 'information', 'hint']
          }
        }
      }
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

      return {
        workspaceFolders: listWorkspaceFolders(),
        activeEditor: getActiveEditorSnapshot({
          includeDocumentText: readBoolean(options.includeDocumentText, false),
          includeSelectionText: readBoolean(options.includeSelectionText, true),
          textLimit
        }),
        diagnostics: collectDiagnostics({
          limit: diagnosticLimit,
          severity: readSeverity(options.severity)
        }),
        allowedCommands: config.allowedCommands
      }
    }
  )

  client.expose(
    '/vscode/find-workspace-files',
    {
      method: 'POST',
      description: 'Find files in the current VSCode workspace using glob patterns.',
      inputSchema: {
        type: 'object',
        properties: {
          glob: { type: 'string' },
          exclude: { type: 'string' },
          maxResults: { type: 'number' }
        }
      }
    },
    async (request) => {
      const options = readRequestObject(request)
      const limit = readPositiveNumber(
        options.maxResults,
        config.findFilesMaxResults,
        config.findFilesMaxResults
      )
      const include = readString(options.glob) ?? '**/*'
      const exclude = readString(options.exclude)
      const uris = await vscode.workspace.findFiles(include, exclude, limit)

      return {
        include,
        exclude: exclude ?? null,
        maxResults: limit,
        results: uris.map((uri) => ({
          uri: uri.toString(),
          relativePath: vscode.workspace.asRelativePath(uri, false)
        }))
      }
    }
  )

  client.expose(
    '/vscode/read-workspace-file',
    {
      method: 'POST',
      description: 'Read a workspace file by relative path, absolute path, or URI and return its text and metadata.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          uri: { type: 'string' },
          includeDiagnostics: { type: 'boolean' },
          textLimit: { type: 'number' },
          diagnosticLimit: { type: 'number' }
        }
      }
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
      const includeDiagnostics = readBoolean(options.includeDiagnostics, true)
      const document = await resolveWorkspaceDocument(options)

      return {
        ...createDocumentSnapshot(document, {
          includeText: true,
          textLimit
        }),
        diagnostics: includeDiagnostics
          ? collectDiagnostics({
            uri: document.uri.toString(),
            limit: diagnosticLimit
          })
          : []
      }
    }
  )

  client.expose(
    '/vscode/search-workspace-text',
    {
      method: 'POST',
      description: 'Search the current VSCode workspace for text matches and preview snippets.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          include: { type: 'string' },
          exclude: { type: 'string' },
          isCaseSensitive: { type: 'boolean' },
          isRegExp: { type: 'boolean' },
          isWordMatch: { type: 'boolean' },
          previewChars: { type: 'number' },
          maxResults: { type: 'number' }
        },
        required: ['query']
      }
    },
    async (request) => {
      const options = readRequestObject(request)
      const query = readString(options.query)

      if (!query) {
        throw new Error('Missing required "query" argument')
      }

      const limit = readPositiveNumber(
        options.maxResults,
        config.textSearchMaxResults,
        config.textSearchMaxResults
      )
      const include = readString(options.include)
      const exclude = readString(options.exclude)
      const isCaseSensitive = readBoolean(options.isCaseSensitive, false)
      const isRegExp = readBoolean(options.isRegExp, false)
      const isWordMatch = readBoolean(options.isWordMatch, false)
      const previewChars = readPositiveNumber(options.previewChars, 160, 1_000)
      const search = await searchWorkspaceText({
        query,
        include,
        exclude,
        maxResults: limit,
        isCaseSensitive,
        isRegExp,
        isWordMatch,
        previewChars
      })

      return {
        query,
        include: include ?? null,
        exclude: exclude ?? null,
        maxResults: limit,
        previewChars,
        isCaseSensitive,
        isRegExp,
        isWordMatch,
        results: search.results,
        resultCount: search.results.length,
        limitHit: search.limitHit
      }
    }
  )

  client.expose(
    '/vscode/get-diagnostics',
    {
      method: 'POST',
      description: 'Read diagnostics from the current VSCode workspace or a specific document.',
      inputSchema: {
        type: 'object',
        properties: {
          uri: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['error', 'warning', 'information', 'hint']
          },
          maxResults: { type: 'number' }
        }
      }
    },
    async (request) => {
      const options = readRequestObject(request)
      const limit = readPositiveNumber(
        options.maxResults,
        config.diagnosticResultLimit,
        config.diagnosticResultLimit
      )
      const uri = readString(options.uri)
      const diagnostics = collectDiagnostics({
        ...(uri ? { uri } : {}),
        limit,
        severity: readSeverity(options.severity)
      })

      return {
        uri: uri ?? null,
        diagnostics
      }
    }
  )

  client.expose(
    '/vscode/execute-command',
    {
      method: 'POST',
      description: config.allowedCommands.length > 0
        ? `Run an allowlisted VSCode command. Allowed commands: ${config.allowedCommands.join(', ')}`
        : 'Run an allowlisted VSCode command. No commands are currently allowlisted.',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          arguments: { type: 'array' }
        },
        required: ['command']
      }
    },
    async (request) => {
      const options = readRequestObject(request)
      const command = readString(options.command)

      if (!command) {
        throw new Error('Missing required "command" argument')
      }

      if (!config.allowedCommands.includes(command)) {
        throw new Error(
          `Command "${command}" is not allowed. Configure mdp.allowedCommands to opt in.`
        )
      }

      const commandArgs = Array.isArray(options.arguments)
        ? options.arguments
        : []
      const result = await vscode.commands.executeCommand(command, ...commandArgs)

      return {
        command,
        arguments: commandArgs,
        result: toJsonCompatible(result)
      }
    }
  )
}
