import { describe, expect, it } from 'vitest'

import {
  DEFAULT_BACKGROUND_CLIENT,
  DEFAULT_EXTENSION_CONFIG,
  ROOT_ROUTE_SKILL_PATH,
  DEFAULT_WORKSPACE_MANAGEMENT_CLIENT,
  createRouteClientFromUrl,
  createRouteClientConfig,
  getOriginMatchPattern,
  isValidMatchPattern,
  listWorkspaceMatchPatterns,
  matchChromePattern,
  matchesRouteClient,
  normalizeConfig,
  parseMatchPatterns
} from '../src/shared/config.js'

describe('chrome extension config helpers', () => {
  it('normalizes missing values to defaults', () => {
    expect(normalizeConfig(undefined)).toEqual(DEFAULT_EXTENSION_CONFIG)
  })

  it('migrates legacy config into background and route clients', () => {
    const migrated = normalizeConfig({
      serverUrl: 'ws://127.0.0.1:47372',
      clientId: 'legacy-client',
      clientName: 'Legacy Chrome',
      clientDescription: 'Legacy description',
      autoConnect: true,
      autoInjectBridge: false,
      matchPatterns: ['https://app.example.com/*'],
      toolScriptSource: 'window.test = true;'
    })

    expect(migrated.backgroundClients[0]?.clientId).toBe('legacy-client-background')
    expect(migrated.backgroundClients[0]?.disabledExposePaths).toContain(
      '/clients'
    )
    expect(migrated.backgroundClients[1]?.id).toBe(DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.id)
    expect(migrated.routeClients).toHaveLength(1)
    expect(migrated.routeClients[0]?.clientId).toBe('legacy-client-page')
    expect(migrated.routeClients[0]?.autoInjectBridge).toBe(false)
    expect(migrated.routeClients[0]?.pathScriptSource).toBe('window.test = true;')
  })

  it('re-adds the required workspace management background client when missing', () => {
    const normalized = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      backgroundClients: [DEFAULT_BACKGROUND_CLIENT]
    })

    expect(normalized.backgroundClients.map((client) => client.id)).toEqual([
      DEFAULT_BACKGROUND_CLIENT.id,
      DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.id
    ])
  })

  it('stabilizes the required workspace management client identity and protected capabilities', () => {
    const normalized = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      backgroundClients: [
        DEFAULT_BACKGROUND_CLIENT,
        {
          ...DEFAULT_WORKSPACE_MANAGEMENT_CLIENT,
          enabled: false,
          clientId: 'custom-workspace-client',
          exposes: DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.exposes.map((asset) =>
            asset.id === 'extension.clients.list'
              ? {
                  ...asset,
                  path: '/workspace/clients',
                  description: 'List workspace clients from a custom path.'
                }
              : { ...asset }
          ),
          disabledExposePaths: []
        }
      ]
    })

    expect(normalized.backgroundClients[1]).toMatchObject({
      id: DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.id,
      enabled: true,
      clientId: DEFAULT_WORKSPACE_MANAGEMENT_CLIENT.clientId
    })
    expect(normalized.backgroundClients[1]?.exposes.find((asset) => asset.id === 'extension.clients.list'))
      .toMatchObject({
        path: '/workspace/clients',
        description: 'List workspace clients from a custom path.'
      })
  })

  it('normalizes script-based flows alongside recorded flows', () => {
    const normalized = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [
        {
          ...createRouteClientConfig({
            id: 'route-script',
            clientId: 'route-script',
            matchPatterns: ['https://app.example.com/*']
          }),
          recordings: [
            {
              id: 'flow-script',
              name: 'Script Flow',
              description: 'Runs custom code',
              mode: 'script',
              createdAt: '2026-03-25T10:00:00.000Z',
              updatedAt: '2026-03-25T10:00:00.000Z',
              capturedFeatures: [],
              steps: [],
              scriptSource: 'return args?.selector ?? "button";'
            }
          ]
        }
      ]
    })

    expect(normalized.routeClients[0]?.recordings[0]).toMatchObject({
      id: 'flow-script',
      path: 'script-flow',
      mode: 'script',
      scriptSource: 'return args?.selector ?? "button";',
      steps: []
    })
  })

  it('normalizes background expose configuration from legacy capability ids', () => {
    const {
      exposes: _exposes,
      disabledExposePaths: _disabledExposePaths,
      ...legacyBackgroundClient
    } = DEFAULT_EXTENSION_CONFIG.backgroundClients[0]!
    const normalized = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      backgroundClients: [
        {
          ...legacyBackgroundClient,
          disabledTools: [
            'extension.listTabs',
            ' extension.listTabs ',
            'extension.unknown'
          ],
          disabledResources: [
            'chrome-extension://tabs',
            'chrome-extension://missing',
            'chrome-extension://tabs'
          ],
          disabledSkills: ['background.skill.missing']
        }
      ]
    })

    expect(normalized.backgroundClients[0]?.disabledExposePaths).toEqual([
      '/tabs',
      '/resources/tabs'
    ])
  })

  it('preserves editable background expose assets and derives disabled paths from them', () => {
    const normalized = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      backgroundClients: [
        {
          ...DEFAULT_BACKGROUND_CLIENT,
          exposes: DEFAULT_BACKGROUND_CLIENT.exposes.map((asset) =>
            asset.id === 'extension.status'
              ? {
                  ...asset,
                  path: '/browser/status',
                  description: 'Read browser status from a custom background path.',
                  enabled: false
                }
              : { ...asset }
          )
        },
        DEFAULT_WORKSPACE_MANAGEMENT_CLIENT
      ]
    })

    expect(normalized.backgroundClients[0]?.exposes.find((asset) => asset.id === 'extension.status'))
      .toMatchObject({
        path: '/browser/status',
        description: 'Read browser status from a custom background path.',
        enabled: false
      })
    expect(normalized.backgroundClients[0]?.disabledExposePaths).toContain(
      '/browser/status'
    )
  })

  it('migrates legacy background skill paths to the directory-local SKILL.md layout', () => {
    const normalized = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      backgroundClients: [
        {
          ...DEFAULT_BACKGROUND_CLIENT,
          disabledExposePaths: [
            '/extension/skills/manage-clients/skill.md'
          ],
          exposes: DEFAULT_BACKGROUND_CLIENT.exposes.map((asset) =>
            asset.id === 'extension.skills.manage-clients'
              ? {
                  ...asset,
                  path: '/extension/skills/manage-clients/skill.md',
                  enabled: false
                }
              : asset.id === 'extension.skills.manage-client-expose-rules'
                ? {
                    ...asset,
                    path: '/extension/skills/manage-client-expose-rules/skill.md'
                  }
                : { ...asset }
          )
        },
        DEFAULT_WORKSPACE_MANAGEMENT_CLIENT
      ]
    })

    expect(
      normalized.backgroundClients[0]?.exposes.find(
        (asset) => asset.id === 'extension.skills.manage-clients'
      )
    ).toMatchObject({
      path: '/clients/SKILL.md',
      enabled: false
    })
    expect(
      normalized.backgroundClients[0]?.exposes.find(
        (asset) => asset.id === 'extension.skills.manage-client-expose-rules'
      )
    ).toMatchObject({
      path: '/clients/.ai/skills/manage-client-expose-rules/SKILL.md'
    })
    expect(normalized.backgroundClients[0]?.disabledExposePaths).toContain(
      '/clients/SKILL.md'
    )
    expect(normalized.backgroundClients[0]?.disabledExposePaths).toContain(
      '/clients/.ai/skills/manage-client-expose-rules/SKILL.md'
    )
  })

  it('migrates legacy built-in background skill descriptions and markdown content to root paths', () => {
    const normalized = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      backgroundClients: [
        {
          ...DEFAULT_BACKGROUND_CLIENT,
          exposes: DEFAULT_BACKGROUND_CLIENT.exposes.map((asset) =>
            asset.id === 'extension.skills.root'
              ? {
                  ...asset,
                  path: '/extension/SKILL.md',
                  description:
                    'Overview for the /extension directory and the built-in Chrome extension capabilities exposed from it.',
                  source: `# /extension

This directory is the root of the built-in Chrome extension capabilities exposed through Model Drive Protocol.

## How to navigate

- Read the files directly under \`/extension\` for runtime status and browser actions.
- Read \`/extension/resources/SKILL.md\` before working with JSON snapshot resources.
- Read \`/extension/clients/SKILL.md\` before creating, updating, or deleting stored clients.

## Notes

- Different background clients can expose different subsets of this directory.
- Prefer reading the nearest \`SKILL.md\` in the folder you are working in.
- If a folder contains \`.ai/skills\` or \`.ai/rules\`, use those for more detailed guidance.
`
                }
              : asset.id === 'extension.skills.manage-clients'
                ? {
                    ...asset,
                    path: '/extension/clients/SKILL.md',
                    description:
                      'Guide for creating, updating, and deleting stored Chrome extension clients.',
                    source: `# Manage Chrome Workspace Clients

Use this skill to inspect, create, update, or delete the Chrome extension clients stored in the workspace.

## Recommended workflow

1. Read \`/extension/clients\` and inspect the current \`backgroundClients\` and \`routeClients\` entries.
2. Create a new \`background\` or \`route\` client with \`/extension/clients/create\`.
3. Update client metadata, enablement, icons, expose paths, descriptions, or backend scripts with \`/extension/clients/update\`.
4. Delete a client when it is no longer needed with \`/extension/clients/delete\`.

## Targeting rules

- Prefer the internal \`id\` field from the client listing result when mutating a specific client.
- Pass \`kind\` together with \`clientId\` if the target would otherwise be ambiguous.
- The built-in \`background-client-workspace\` client is required and cannot be deleted.

## Notes

- Mutations are persisted to extension storage.
- Saved changes are applied to connected clients right after the write completes.
`
                  }
                : asset.id === 'extension.skills.manage-client-expose-rules'
                  ? {
                      ...asset,
                      path: '/extension/clients/.ai/skills/manage-client-expose-rules/SKILL.md',
                      description:
                        'Guide for persisting route expose rules for a stored Chrome extension client.',
                      source: `# Add Stored Expose Rules To Route Clients

Use this skill when you need to add and persist a new expose rule for a route client.

## Recommended workflow

1. Read \`/extension/clients\` and find the target route client.
2. Call \`/extension/clients/add-expose-rule\` with the route client \`id\`, a \`mode\`, and a \`value\`.
3. Re-read the client listing if you need to confirm the saved route rule list.

## Supported modes

- \`pathname-prefix\`
- \`pathname-exact\`
- \`url-contains\`
- \`regex\`

## Notes

- This endpoint only works for \`route\` clients.
- The response sets \`duplicate: true\` when the same \`mode\` and \`value\` already exist.
- Stored expose rules are persisted and then applied to the live route client registration.
`
                  }
                : { ...asset }
          )
        },
        DEFAULT_WORKSPACE_MANAGEMENT_CLIENT
      ]
    })

    expect(
      normalized.backgroundClients[0]?.exposes.find(
        (asset) => asset.id === 'extension.skills.root'
      )
    ).toMatchObject({
      path: '/SKILL.md',
      description:
        'Overview for the root directory and the built-in Chrome extension capabilities exposed from it.'
    })
    expect(
      normalized.backgroundClients[0]?.exposes.find(
        (asset) => asset.id === 'extension.skills.root'
      )?.source
    ).toContain('# /')
    expect(
      normalized.backgroundClients[0]?.exposes.find(
        (asset) => asset.id === 'extension.skills.root'
      )?.source
    ).not.toContain('/extension/')

    expect(
      normalized.backgroundClients[0]?.exposes.find(
        (asset) => asset.id === 'extension.skills.manage-clients'
      )
    ).toMatchObject({
      path: '/clients/SKILL.md',
      description:
        'Overview for the /clients workspace folder and its built-in management capabilities.'
    })
    expect(
      normalized.backgroundClients[0]?.exposes.find(
        (asset) => asset.id === 'extension.skills.manage-clients'
      )?.source
    ).toContain('POST /clients/create')
    expect(
      normalized.backgroundClients[0]?.exposes.find(
        (asset) => asset.id === 'extension.skills.manage-clients'
      )?.source
    ).not.toContain('/extension/clients')
    expect(
      normalized.backgroundClients[0]?.exposes.find(
        (asset) => asset.id === 'extension.skills.manage-client-expose-rules'
      )
    ).toMatchObject({
      path: '/clients/.ai/skills/manage-client-expose-rules/SKILL.md',
      description:
        'Detailed skill for persisting route expose rules under the /clients workspace folder.'
    })
    expect(
      normalized.backgroundClients[0]?.exposes.find(
        (asset) => asset.id === 'extension.skills.manage-client-expose-rules'
      )?.source
    ).toContain('/clients/add-expose-rule')
    expect(
      normalized.backgroundClients[0]?.exposes.find(
        (asset) => asset.id === 'extension.skills.manage-client-expose-rules'
      )?.source
    ).not.toContain('/extension/clients')
  })

  it('deduplicates and trims match patterns', () => {
    expect(
      parseMatchPatterns(' https://app.example.com/* \nhttps://app.example.com/*\n')
    ).toEqual(['https://app.example.com/*'])
  })

  it('validates basic chrome match patterns', () => {
    expect(isValidMatchPattern('https://app.example.com/*')).toBe(true)
    expect(isValidMatchPattern('not-a-pattern')).toBe(false)
  })

  it('matches wildcard subdomains', () => {
    expect(
      matchChromePattern('https://*.example.com/*', 'https://admin.example.com/dashboard')
    ).toBe(true)
    expect(
      matchChromePattern('https://*.example.com/*', 'https://elsewhere.dev/dashboard')
    ).toBe(false)
  })

  it('matches route clients against host patterns and path rules', () => {
    const client = createRouteClientConfig({
      matchPatterns: ['https://app.example.com/*'],
      routeRules: [
        {
          id: 'rule-1',
          mode: 'pathname-prefix',
          value: '/billing'
        }
      ]
    })

    expect(matchesRouteClient('https://app.example.com/billing/invoices', client)).toBe(true)
    expect(matchesRouteClient('https://app.example.com/settings/profile', client)).toBe(false)
  })

  it('creates route client presets from a live url', () => {
    const client = createRouteClientFromUrl('https://app.example.com/billing/invoices?id=1')

    expect(client.matchPatterns).toEqual(['https://app.example.com/*'])
    expect(client.routeRules[0]?.value).toBe('/billing/invoices')
    expect(client.clientName).toContain('app.example.com')
  })

  it('creates route clients with a protected root skill entry by default', () => {
    const client = createRouteClientConfig({
      id: 'route-with-root-skill',
      clientId: 'route-with-root-skill',
      matchPatterns: ['https://app.example.com/*']
    })

    expect(client.skillEntries).toHaveLength(1)
    expect(client.skillEntries[0]).toMatchObject({
      path: ROOT_ROUTE_SKILL_PATH,
      content: ''
    })
  })

  it('re-adds a missing root skill entry when normalizing imported route clients', () => {
    const normalized = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [
        {
          ...createRouteClientConfig({
            id: 'route-imported',
            clientId: 'route-imported',
            matchPatterns: ['https://app.example.com/*'],
            skillEntries: []
          }),
          skillEntries: [
            {
              id: 'nested-skill',
              path: 'orders/refund-policy',
              metadata: {
                title: 'Refund policy',
                summary: '',
                queryParameters: [],
                headerParameters: []
              },
              content: '# Refund Policy'
            }
          ]
        }
      ]
    })

    expect(normalized.routeClients[0]?.skillEntries.map((skill) => skill.path)).toEqual([
      ROOT_ROUTE_SKILL_PATH,
      'orders/refund-policy/SKILL.md'
    ])
    expect(normalized.routeClients[0]?.skillEntries[0]?.content).toBe('')
  })

  it('collects enabled route match patterns across the workspace', () => {
    const config = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [
        createRouteClientConfig({
          id: 'route-a',
          clientId: 'route-a',
          matchPatterns: ['https://app.example.com/*']
        }),
        createRouteClientConfig({
          id: 'route-b',
          clientId: 'route-b',
          matchPatterns: ['https://admin.example.com/*']
        })
      ]
    })

    expect(listWorkspaceMatchPatterns(config)).toEqual([
      'https://app.example.com/*',
      'https://admin.example.com/*'
    ])
  })

  it('converts active tab urls into permission patterns', () => {
    expect(getOriginMatchPattern('https://app.example.com/dashboard?id=1')).toBe(
      'https://app.example.com/*'
    )
    expect(getOriginMatchPattern('file:///Users/test/index.html')).toBe('file:///*')
    expect(getOriginMatchPattern('chrome://extensions')).toBeUndefined()
  })
})
