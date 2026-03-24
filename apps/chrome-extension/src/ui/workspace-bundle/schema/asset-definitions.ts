import { clientIconEnum } from './constants.js'

export const assetDefinitions = {
  routeSelectorResource: {
    type: 'object',
    additionalProperties: false,
    required: [
      'id',
      'name',
      'description',
      'createdAt',
      'selector',
      'alternativeSelectors',
      'tagName',
      'classes',
      'attributes'
    ],
    properties: {
      id: { type: 'string', minLength: 1 },
      name: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      url: { type: 'string' },
      selector: { type: 'string', minLength: 1 },
      alternativeSelectors: { type: 'array', items: { type: 'string' } },
      tagName: { type: 'string' },
      classes: { type: 'array', items: { type: 'string' } },
      text: { type: 'string' },
      attributes: { type: 'object', additionalProperties: { type: 'string' } }
    }
  },
  routeSkillEntry: {
    type: 'object',
    additionalProperties: false,
    required: [
      'id',
      'path',
      'title',
      'summary',
      'icon',
      'queryParameters',
      'headerParameters',
      'content'
    ],
    properties: {
      id: { type: 'string', minLength: 1 },
      path: { type: 'string', minLength: 1 },
      title: { type: 'string', minLength: 1 },
      summary: { type: 'string' },
      icon: { enum: clientIconEnum },
      queryParameters: {
        type: 'array',
        items: { $ref: '#/definitions/routeSkillParameter' }
      },
      headerParameters: {
        type: 'array',
        items: { $ref: '#/definitions/routeSkillParameter' }
      },
      content: { type: 'string' }
    }
  },
  routeSkillFolder: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'path'],
    properties: {
      id: { type: 'string', minLength: 1 },
      path: { type: 'string', minLength: 1 }
    }
  },
  routeSkillParameter: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'key', 'summary'],
    properties: {
      id: { type: 'string', minLength: 1 },
      key: { type: 'string', minLength: 1 },
      summary: { type: 'string' }
    }
  },
  marketClientInstallSource: {
    type: 'object',
    additionalProperties: false,
    required: [
      'type',
      'sourceId',
      'sourceUrl',
      'marketClientId',
      'marketVersion',
      'installedAt'
    ],
    properties: {
      type: { const: 'market' },
      sourceId: { type: 'string', minLength: 1 },
      sourceUrl: { type: 'string', format: 'uri' },
      marketClientId: { type: 'string', minLength: 1 },
      marketVersion: { type: 'string', minLength: 1 },
      installedAt: { type: 'string', format: 'date-time' }
    }
  }
} as const
