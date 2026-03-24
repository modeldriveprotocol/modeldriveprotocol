import { z } from 'zod'

import { SUPPORTED_WORKSPACE_BUNDLE_VERSION } from '#~/shared/config.js'

import { backgroundClientSchema, routeClientSchema } from './client-definitions.js'
import { marketSourceSchema } from './source-definitions.js'

const workspaceBundleVersionValueSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/)
  .describe('Workspace bundle version.')

const workspaceBundleServerUrlValueSchema = z
  .string()
  .regex(/^(wss?|https?):\/\/.+$/)
  .describe('MDP server URL used by the extension.')

const workspaceBundleNotificationTitleValueSchema = z
  .string()
  .describe('Notification title shown by the extension.')

const workspaceBundleMarketAutoCheckUpdatesValueSchema = z
  .boolean()
  .describe('Whether market sources should be checked for updates automatically.')

export const workspaceBundleEditorSchema = z
  .object({
    version: workspaceBundleVersionValueSchema.default(
      SUPPORTED_WORKSPACE_BUNDLE_VERSION
    ),
    serverUrl: workspaceBundleServerUrlValueSchema.default('ws://127.0.0.1:47372'),
    notificationTitle: workspaceBundleNotificationTitleValueSchema.default(
      'Model Drive Protocol for Chrome'
    ),
    marketAutoCheckUpdates:
      workspaceBundleMarketAutoCheckUpdatesValueSchema.default(true),
    backgroundClients: z.array(backgroundClientSchema).default([]),
    routeClients: z.array(routeClientSchema).default([]),
    marketSources: z.array(marketSourceSchema)
  })
  .loose()

export const workspaceBundleImportSchema = z
  .object({
    version: workspaceBundleVersionValueSchema.optional(),
    serverUrl: workspaceBundleServerUrlValueSchema.optional(),
    notificationTitle: workspaceBundleNotificationTitleValueSchema.optional(),
    marketAutoCheckUpdates:
      workspaceBundleMarketAutoCheckUpdatesValueSchema.optional(),
    backgroundClients: z.array(z.unknown()).optional(),
    backgroundClient: z.unknown().optional(),
    routeClients: z.array(z.unknown()).optional(),
    marketSources: z.array(z.unknown()).optional()
  })
  .passthrough()
