import { marketSourceProviderEnum, marketSourceRefTypeEnum } from './constants.js'

export const sourceDefinitions = {
  marketSource: {
    oneOf: [
      {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'kind', 'url'],
        properties: {
          id: { type: 'string', minLength: 1 },
          kind: { const: 'direct' },
          url: { type: 'string', format: 'uri' },
          official: { type: 'boolean' }
        }
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'kind', 'url', 'provider', 'repository', 'refType', 'ref'],
        properties: {
          id: { type: 'string', minLength: 1 },
          kind: { const: 'repository' },
          url: { type: 'string', format: 'uri' },
          provider: { enum: marketSourceProviderEnum },
          repository: { type: 'string', minLength: 1 },
          refType: { enum: marketSourceRefTypeEnum },
          ref: { type: 'string', minLength: 1 },
          official: { type: 'boolean' }
        }
      }
    ]
  }
} as const
