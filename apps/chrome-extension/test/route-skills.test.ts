import { describe, expect, it } from 'vitest'

import {
  buildRouteSkillInputSchema,
  renderRouteSkillContent
} from '../src/background/capabilities/route/skills.js'
import {
  ROOT_ROUTE_SKILL_PATH,
  DEFAULT_EXTENSION_CONFIG,
  createRouteClientConfig,
  normalizeConfig
} from '../src/shared/config.js'

describe('route skill assets', () => {
  it('renders markdown variables from query and headers', () => {
    const content = renderRouteSkillContent(
      {
        kind: 'skill',
        id: 'skill-refund',
        enabled: true,
        path: 'workspace/orders/refunds',
        metadata: {
          title: 'Refund guide',
          summary: 'Refund instructions',
          queryParameters: [
            {
              id: 'query-attempt',
              key: 'attempt',
              summary: 'Retry attempt',
              type: 'number'
            }
          ],
          headerParameters: [
            {
              id: 'header-preview',
              key: 'x-preview',
              summary: 'Preview mode',
              type: 'boolean'
            }
          ]
        },
        content:
          '# Refund\n\nAttempt: {{query.attempt}}\nPreview: {{header.X-Preview}}\nMissing: {{query.missing}}'
      },
      {
        attempt: 3
      },
      {
        'X-Preview': 'true'
      }
    )

    expect(content).toBe(
      '# Refund\n\nAttempt: 3\nPreview: true\nMissing: '
    )
  })

  it('describes configured query and header variables in the skill schema', () => {
    expect(
      buildRouteSkillInputSchema({
        kind: 'skill',
        id: 'skill-refund',
        enabled: true,
        path: 'workspace/orders/refunds',
        metadata: {
          title: 'Refund guide',
          summary: 'Refund instructions',
          queryParameters: [
            {
              id: 'query-attempt',
              key: 'attempt',
              summary: 'Retry attempt',
              type: 'number'
            }
          ],
          headerParameters: [
            {
              id: 'header-preview',
              key: 'x-preview',
              summary: 'Preview mode',
              type: 'boolean'
            }
          ]
        },
        content: '# Refund'
      })
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: {
        query: {
          type: 'object',
          description: 'Query values available to this skill.',
          additionalProperties: false,
          properties: {
            attempt: {
              type: 'number',
              description: 'Retry attempt'
            }
          }
        },
        headers: {
          type: 'object',
          description: 'Header values available to this skill.',
          additionalProperties: false,
          properties: {
            'x-preview': {
              type: 'boolean',
              description: 'Preview mode'
            }
          }
        }
      }
    })
  })

  it('normalizes route skill parameters for query and headers from legacy top-level fields', () => {
    const normalized = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [
        {
          ...createRouteClientConfig({
            id: 'route-skills',
            clientId: 'route-skills',
            matchPatterns: ['https://app.example.com/*']
          }),
          skillEntries: [
            {
              id: 'skill-refund',
              path: 'workspace/orders/refunds',
              title: 'Refund guide',
              summary: '',
              icon: 'spark',
              queryParameters: [
                {
                  id: 'query-ticket-a',
                  key: ' ticketId ',
                  summary: 'Support ticket id'
                },
                {
                  id: 'query-retry',
                  key: 'maxRetries',
                  summary: 'Retry count',
                  type: 'number'
                },
                {
                  id: 'query-ticket-b',
                  key: 'ticketId',
                  summary: 'Duplicate query parameter'
                }
              ],
              headerParameters: [
                {
                  id: 'header-workspace-a',
                  key: ' X-Workspace ',
                  summary: 'Workspace name'
                },
                {
                  id: 'header-preview',
                  key: 'x-preview',
                  summary: 'Preview mode',
                  type: 'boolean'
                },
                {
                  id: 'header-workspace-b',
                  key: 'x-workspace',
                  summary: 'Duplicate header parameter'
                }
              ],
              content: 'Ticket {{query.ticketId}} in {{header.x-workspace}}'
            }
          ]
        }
      ]
    })

    const skill = normalized.routeClients[0]?.skillEntries.find(
      (entry) => entry.id === 'skill-refund'
    )

    expect(skill?.metadata.queryParameters).toEqual([
      {
        id: 'query-ticket-a',
        key: 'ticketId',
        summary: 'Support ticket id',
        type: 'string'
      },
      {
        id: 'query-retry',
        key: 'maxRetries',
        summary: 'Retry count',
        type: 'number'
      }
    ])
    expect(skill?.metadata.headerParameters).toEqual([
      {
        id: 'header-workspace-a',
        key: 'X-Workspace',
        summary: 'Workspace name',
        type: 'string'
      },
      {
        id: 'header-preview',
        key: 'x-preview',
        summary: 'Preview mode',
        type: 'boolean'
      }
    ])
  })

  it('normalizes skill paths into valid unique file paths', () => {
    const normalized = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [
        {
          ...createRouteClientConfig({
            id: 'route-skills',
            clientId: 'route-skills',
            matchPatterns: ['https://app.example.com/*']
          }),
          skillEntries: [
            {
              id: 'skill-refund-a',
              path: ' Workspace / Orders & Returns ',
              metadata: {
                title: 'Refund guide',
                summary: '',
                queryParameters: [],
                headerParameters: []
              },
              content: '# Refund'
            },
            {
              id: 'skill-refund-b',
              path: 'workspace/orders-returns',
              metadata: {
                title: 'Duplicate normalized path',
                summary: '',
                queryParameters: [],
                headerParameters: []
              },
              content: '# Duplicate'
            }
          ]
        }
      ]
    })

    expect(normalized.routeClients[0]?.skillEntries).toHaveLength(2)
    expect(normalized.routeClients[0]?.skillEntries.map((skill) => skill.path)).toEqual([
      ROOT_ROUTE_SKILL_PATH,
      'workspace/orders-returns/SKILL.md'
    ])
  })

  it('preserves explicit empty folders across normalization', () => {
    const normalized = normalizeConfig({
      ...DEFAULT_EXTENSION_CONFIG,
      routeClients: [
        {
          ...createRouteClientConfig({
            id: 'route-folders',
            clientId: 'route-folders',
            matchPatterns: ['https://app.example.com/*']
          }),
          skillFolders: [
            {
              id: 'folder-guides',
              path: ' Workspace / Guides '
            }
          ],
          skillEntries: []
        }
      ]
    })

    expect(normalized.routeClients[0]?.skillFolders).toEqual([
      {
        kind: 'folder',
        id: 'folder-guides',
        path: 'workspace/guides'
      }
    ])
  })
})
