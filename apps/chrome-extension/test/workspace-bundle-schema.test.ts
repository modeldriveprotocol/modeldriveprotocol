import { describe, expect, it } from 'vitest'

import { parseWorkspaceBundleText } from '../src/ui/workspace-bundle/bundle.js'
import {
  WORKSPACE_BUNDLE_SCHEMA_URI,
  workspaceBundleJsonSchema
} from '../src/ui/workspace-bundle/schema.js'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

describe('workspace bundle editor schema', () => {
  it('exposes the draft-07 root metadata expected by Monaco', () => {
    expect(workspaceBundleJsonSchema).toMatchObject({
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: WORKSPACE_BUNDLE_SCHEMA_URI,
      title: 'MDP Chrome extension workspace bundle',
      type: 'object',
      additionalProperties: true
    })

    expect(asRecord(workspaceBundleJsonSchema).required).toEqual([
      'version',
      'serverUrl',
      'notificationTitle',
      'marketAutoCheckUpdates',
      'backgroundClients',
      'routeClients',
      'marketSources'
    ])
  })

  it('generates nested client and market source schemas from zod definitions', () => {
    const properties = asRecord(asRecord(workspaceBundleJsonSchema).properties)
    const backgroundClientItems = asRecord(
      asRecord(properties.backgroundClients).items
    )
    const marketSourceItems = asRecord(asRecord(properties.marketSources).items)

    expect(asRecord(backgroundClientItems.properties).kind).toEqual({
      type: 'string',
      const: 'background'
    })
    expect(marketSourceItems.oneOf).toHaveLength(2)
  })

  it('keeps workspace bundle parsing compatible with legacy backgroundClient payloads', () => {
    const parsed = parseWorkspaceBundleText(
      JSON.stringify({
        version: '1.0.0',
        serverUrl: 'ws://127.0.0.1:47372',
        notificationTitle: 'Model Drive Protocol for Chrome',
        marketAutoCheckUpdates: true,
        backgroundClient: {
          kind: 'background',
          id: 'legacy-background',
          enabled: false,
          favorite: false,
          clientId: 'legacy-background',
          clientName: 'Legacy Background',
          clientDescription: 'Legacy background client.',
          icon: 'chrome',
          disabledTools: [],
          disabledResources: [],
          disabledSkills: []
        },
        routeClients: [],
        marketSources: [],
        ignoredTopLevelKey: {
          safe: true
        }
      })
    )

    expect(parsed.backgroundClients[0]).toMatchObject({
      id: 'legacy-background',
      enabled: false
    })
  })
})
