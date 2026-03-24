import { describe, expect, it } from 'vitest'

import {
  buildRouteSkillInputSchema,
  renderRouteSkillContent
} from '../src/background/capabilities/route/skills.js'
import {
  DEFAULT_EXTENSION_CONFIG,
  createRouteClientConfig,
  normalizeConfig
} from '../src/shared/config.js'

describe('route skill assets', () => {
  it('renders markdown variables from query and headers', () => {
    const content = renderRouteSkillContent(
      {
        id: 'skill-refund',
        path: 'workspace/orders/refunds',
        title: 'Refund guide',
        summary: 'Refund instructions',
        icon: 'spark',
        queryParameters: [
          {
            id: 'query-ticket',
            key: 'ticketId',
            summary: 'Support ticket id'
          }
        ],
        headerParameters: [
          {
            id: 'header-workspace',
            key: 'x-workspace',
            summary: 'Workspace name'
          }
        ],
        content:
          '# Refund\n\nTicket: {{query.ticketId}}\nWorkspace: {{header.X-Workspace}}\nMissing: {{query.missing}}'
      },
      {
        ticketId: 'REQ-42'
      },
      {
        'X-Workspace': 'ops'
      }
    )

    expect(content).toBe(
      '# Refund\n\nTicket: REQ-42\nWorkspace: ops\nMissing: '
    )
  })

  it('describes configured query and header variables in the skill schema', () => {
    expect(
      buildRouteSkillInputSchema({
        id: 'skill-refund',
        path: 'workspace/orders/refunds',
        title: 'Refund guide',
        summary: 'Refund instructions',
        icon: 'spark',
        queryParameters: [
          {
            id: 'query-ticket',
            key: 'ticketId',
            summary: 'Support ticket id'
          }
        ],
        headerParameters: [
          {
            id: 'header-workspace',
            key: 'x-workspace',
            summary: 'Workspace name'
          }
        ],
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
            ticketId: {
              type: 'string',
              description: 'Support ticket id'
            }
          }
        },
        headers: {
          type: 'object',
          description: 'Header values available to this skill.',
          additionalProperties: false,
          properties: {
            'x-workspace': {
              type: 'string',
              description: 'Workspace name'
            }
          }
        }
      }
    })
  })

  it('normalizes route skill parameters for query and headers', () => {
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

    const skill = normalized.routeClients[0]?.skillEntries[0]

    expect(skill?.queryParameters).toEqual([
      {
        id: 'query-ticket-a',
        key: 'ticketId',
        summary: 'Support ticket id'
      }
    ])
    expect(skill?.headerParameters).toEqual([
      {
        id: 'header-workspace-a',
        key: 'X-Workspace',
        summary: 'Workspace name'
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
              title: 'Refund guide',
              summary: '',
              icon: 'spark',
              queryParameters: [],
              headerParameters: [],
              content: '# Refund'
            },
            {
              id: 'skill-refund-b',
              path: 'workspace/orders-returns',
              title: 'Duplicate normalized path',
              summary: '',
              icon: 'spark',
              queryParameters: [],
              headerParameters: [],
              content: '# Duplicate'
            }
          ]
        }
      ]
    })

    expect(normalized.routeClients[0]?.skillEntries).toHaveLength(1)
    expect(normalized.routeClients[0]?.skillEntries[0]?.path).toBe(
      'workspace/orders-returns'
    )
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
        id: 'folder-guides',
        path: 'workspace/guides'
      }
    ])
  })
})
