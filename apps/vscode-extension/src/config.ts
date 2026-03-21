import {
  type ExtensionConfiguration,
  defaultDiagnosticLimit,
  defaultFindFilesLimit,
  defaultReconnectDelayMs,
  defaultResourceTextLimit,
  defaultTextSearchLimit,
  normalizeAllowedCommands,
  normalizeOptionalString
} from './model.js'

export interface WorkspaceConfigurationLike {
  get<T>(section: string): T | undefined
  get<T>(section: string, defaultValue: T): T
}

export const DEFAULT_EXTENSION_CONFIGURATION: ExtensionConfiguration = {
  serverUrl: 'ws://127.0.0.1:7070',
  autoConnect: true,
  autoReconnect: true,
  reconnectDelayMs: 3_000,
  clientId: undefined,
  clientName: undefined,
  authToken: undefined,
  allowedCommands: [],
  findFilesMaxResults: 200,
  textSearchMaxResults: 200,
  resourceTextLimit: 20_000,
  diagnosticResultLimit: 200
}

export function readExtensionConfiguration(
  configuration: WorkspaceConfigurationLike
): ExtensionConfiguration {
  return {
    serverUrl: normalizeOptionalString(
      configuration.get<string>('serverUrl', DEFAULT_EXTENSION_CONFIGURATION.serverUrl)
    ) ?? DEFAULT_EXTENSION_CONFIGURATION.serverUrl,
    autoConnect: configuration.get<boolean>('autoConnect', DEFAULT_EXTENSION_CONFIGURATION.autoConnect),
    autoReconnect: configuration.get<boolean>(
      'autoReconnect',
      DEFAULT_EXTENSION_CONFIGURATION.autoReconnect
    ),
    reconnectDelayMs: defaultReconnectDelayMs(
      configuration.get<number>(
        'reconnectDelayMs',
        DEFAULT_EXTENSION_CONFIGURATION.reconnectDelayMs
      )
    ),
    clientId: normalizeOptionalString(configuration.get<string>('clientId', '')),
    clientName: normalizeOptionalString(configuration.get<string>('clientName', '')),
    authToken: normalizeOptionalString(configuration.get<string>('authToken', '')),
    allowedCommands: normalizeAllowedCommands(
      configuration.get<unknown[]>('allowedCommands', DEFAULT_EXTENSION_CONFIGURATION.allowedCommands)
    ),
    findFilesMaxResults: defaultFindFilesLimit(
      configuration.get<number>(
        'findFilesMaxResults',
        DEFAULT_EXTENSION_CONFIGURATION.findFilesMaxResults
      )
    ),
    textSearchMaxResults: defaultTextSearchLimit(
      configuration.get<number>(
        'textSearchMaxResults',
        DEFAULT_EXTENSION_CONFIGURATION.textSearchMaxResults
      )
    ),
    resourceTextLimit: defaultResourceTextLimit(
      configuration.get<number>(
        'resourceTextLimit',
        DEFAULT_EXTENSION_CONFIGURATION.resourceTextLimit
      )
    ),
    diagnosticResultLimit: defaultDiagnosticLimit(
      configuration.get<number>(
        'diagnosticResultLimit',
        DEFAULT_EXTENSION_CONFIGURATION.diagnosticResultLimit
      )
    )
  }
}

export function isValidServerUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return ['ws:', 'wss:', 'http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}
