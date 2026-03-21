import type { MdpClient } from '@modeldriveprotocol/client'
import * as vscode from 'vscode'

import { toJsonCompatible } from '../model.js'
import {
  asObject,
  collectDiagnostics,
  createDocumentSnapshot,
  getActiveEditorSnapshot,
  listWorkspaceFolders,
  readBoolean,
  readPositiveNumber,
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

  client.exposeTool(
    'vscode.getWorkspaceContext',
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
    },
    {
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
    }
  )

  client.exposeTool(
    'vscode.findWorkspaceFiles',
    async (args) => {
      const options = asObject(args)
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
    },
    {
      description: 'Find files in the current VSCode workspace using glob patterns.',
      inputSchema: {
        type: 'object',
        properties: {
          glob: { type: 'string' },
          exclude: { type: 'string' },
          maxResults: { type: 'number' }
        }
      }
    }
  )

  client.exposeTool(
    'vscode.readWorkspaceFile',
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
    },
    {
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
    }
  )

  client.exposeTool(
    'vscode.searchWorkspaceText',
    async (args) => {
      const options = asObject(args)
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
    },
    {
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
    }
  )

  client.exposeTool(
    'vscode.getDiagnostics',
    async (args) => {
      const options = asObject(args)
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
    },
    {
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
    }
  )

  client.exposeTool(
    'vscode.executeCommand',
    async (args) => {
      const options = asObject(args)
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
    },
    {
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
    }
  )
}
