import { SUPPORTED_WORKSPACE_BUNDLE_VERSION } from '#~/shared/config.js'

import { assetDefinitions } from './asset-definitions.js'
import { clientDefinitions } from './client-definitions.js'
import { sourceDefinitions } from './source-definitions.js'

export const WORKSPACE_BUNDLE_SCHEMA_URI =
  'https://modeldriveprotocol.dev/schemas/chrome-extension-workspace-bundle.json'

export const workspaceBundleJsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: WORKSPACE_BUNDLE_SCHEMA_URI,
  title: 'MDP Chrome extension workspace bundle',
  type: 'object',
  additionalProperties: true,
  required: ['version', 'serverUrl', 'notificationTitle', 'backgroundClient', 'routeClients', 'marketSources', 'marketAutoCheckUpdates'],
  properties: {
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$', default: SUPPORTED_WORKSPACE_BUNDLE_VERSION, description: 'Workspace bundle version.' },
    serverUrl: { type: 'string', pattern: '^(wss?|https?)://.+$', default: 'ws://127.0.0.1:47372', description: 'MDP server URL used by the extension.' },
    notificationTitle: { type: 'string', default: 'Model Drive Protocol for Chrome', description: 'Notification title shown by the extension.' },
    marketAutoCheckUpdates: { type: 'boolean', default: true, description: 'Whether market sources should be checked for updates automatically.' },
    backgroundClient: { $ref: '#/definitions/backgroundClient' },
    routeClients: { type: 'array', default: [], items: { $ref: '#/definitions/routeClient' } },
    marketSources: { type: 'array', items: { $ref: '#/definitions/marketSource' } }
  },
  definitions: {
    ...clientDefinitions,
    ...assetDefinitions,
    ...sourceDefinitions
  }
} as const
