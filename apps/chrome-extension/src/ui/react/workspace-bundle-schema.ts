import { SUPPORTED_WORKSPACE_BUNDLE_VERSION } from '#~/shared/config.js'

const clientIconEnum = [
  'chrome',
  'route',
  'robot',
  'code',
  'layers',
  'insights',
  'spark',
  'javascript',
  'html',
  'css'
] as const

const routeRuleModeEnum = ['pathname-prefix', 'pathname-exact', 'url-contains', 'regex'] as const
const marketSourceKindEnum = ['direct', 'repository'] as const
const marketSourceProviderEnum = ['github', 'gitlab'] as const
const marketSourceRefTypeEnum = ['branch', 'tag', 'commit'] as const
const recordedFlowStepTypeEnum = ['click', 'fill', 'pressKey'] as const

export const WORKSPACE_BUNDLE_SCHEMA_URI =
  'https://modeldriveprotocol.dev/schemas/chrome-extension-workspace-bundle.json'

export const workspaceBundleJsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: WORKSPACE_BUNDLE_SCHEMA_URI,
  title: 'MDP Chrome extension workspace bundle',
  type: 'object',
  additionalProperties: true,
  required: [
    'version',
    'serverUrl',
    'notificationTitle',
    'backgroundClient',
    'routeClients',
    'marketSources',
    'marketAutoCheckUpdates'
  ],
  properties: {
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      default: SUPPORTED_WORKSPACE_BUNDLE_VERSION,
      description: 'Workspace bundle version.'
    },
    serverUrl: {
      type: 'string',
      pattern: '^(wss?|https?)://.+$',
      default: 'ws://127.0.0.1:47372',
      description: 'MDP server URL used by the extension.'
    },
    notificationTitle: {
      type: 'string',
      default: 'Model Drive Protocol for Chrome',
      description: 'Notification title shown by the extension.'
    },
    marketAutoCheckUpdates: {
      type: 'boolean',
      default: true,
      description: 'Whether market sources should be checked for updates automatically.'
    },
    backgroundClient: {
      $ref: '#/definitions/backgroundClient'
    },
    routeClients: {
      type: 'array',
      default: [],
      items: {
        $ref: '#/definitions/routeClient'
      }
    },
    marketSources: {
      type: 'array',
      items: {
        $ref: '#/definitions/marketSource'
      }
    }
  },
  definitions: {
    backgroundClient: {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'enabled', 'favorite', 'clientId', 'clientName', 'clientDescription', 'icon'],
      properties: {
        kind: {
          const: 'background'
        },
        enabled: {
          type: 'boolean',
          default: true
        },
        favorite: {
          type: 'boolean',
          default: false
        },
        clientId: {
          type: 'string',
          minLength: 1
        },
        clientName: {
          type: 'string',
          minLength: 1
        },
        clientDescription: {
          type: 'string',
          minLength: 1
        },
        icon: {
          enum: clientIconEnum
        }
      }
    },
    routeClient: {
      type: 'object',
      additionalProperties: false,
      required: [
        'kind',
        'id',
        'enabled',
        'favorite',
        'clientId',
        'clientName',
        'clientDescription',
        'icon',
        'matchPatterns',
        'routeRules',
        'autoInjectBridge',
        'toolScriptSource',
        'recordings',
        'selectorResources',
        'skillEntries'
      ],
      properties: {
        kind: {
          const: 'route'
        },
        id: {
          type: 'string',
          minLength: 1
        },
        enabled: {
          type: 'boolean',
          default: true
        },
        favorite: {
          type: 'boolean',
          default: false
        },
        clientId: {
          type: 'string',
          minLength: 1
        },
        clientName: {
          type: 'string',
          minLength: 1
        },
        clientDescription: {
          type: 'string',
          minLength: 1
        },
        icon: {
          enum: clientIconEnum
        },
        matchPatterns: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1
          }
        },
        routeRules: {
          type: 'array',
          items: {
            $ref: '#/definitions/routePathRule'
          }
        },
        autoInjectBridge: {
          type: 'boolean',
          default: true
        },
        toolScriptSource: {
          type: 'string'
        },
        recordings: {
          type: 'array',
          items: {
            $ref: '#/definitions/routeClientRecording'
          }
        },
        selectorResources: {
          type: 'array',
          items: {
            $ref: '#/definitions/routeSelectorResource'
          }
        },
        skillEntries: {
          type: 'array',
          items: {
            $ref: '#/definitions/routeSkillEntry'
          }
        },
        installSource: {
          $ref: '#/definitions/marketClientInstallSource'
        }
      }
    },
    routePathRule: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'mode', 'value'],
      properties: {
        id: {
          type: 'string',
          minLength: 1
        },
        mode: {
          enum: routeRuleModeEnum
        },
        value: {
          type: 'string',
          minLength: 1
        }
      }
    },
    routeClientRecording: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'description', 'createdAt', 'updatedAt', 'capturedFeatures', 'steps'],
      properties: {
        id: {
          type: 'string',
          minLength: 1
        },
        name: {
          type: 'string',
          minLength: 1
        },
        description: {
          type: 'string'
        },
        createdAt: {
          type: 'string',
          format: 'date-time'
        },
        updatedAt: {
          type: 'string',
          format: 'date-time'
        },
        startUrl: {
          type: 'string'
        },
        capturedFeatures: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        steps: {
          type: 'array',
          items: {
            $ref: '#/definitions/recordedFlowStep'
          }
        }
      }
    },
    recordedFlowStep: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'type',
        'selector',
        'alternativeSelectors',
        'tagName',
        'classes',
        'timestampOffsetMs'
      ],
      properties: {
        id: {
          type: 'string',
          minLength: 1
        },
        type: {
          enum: recordedFlowStepTypeEnum
        },
        selector: {
          type: 'string',
          minLength: 1
        },
        alternativeSelectors: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        tagName: {
          type: 'string'
        },
        classes: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        timestampOffsetMs: {
          type: 'number',
          minimum: 0
        },
        text: {
          type: 'string'
        },
        label: {
          type: 'string'
        },
        inputType: {
          type: 'string'
        },
        value: {
          type: 'string'
        },
        key: {
          type: 'string'
        },
        code: {
          type: 'string'
        }
      }
    },
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
        id: {
          type: 'string',
          minLength: 1
        },
        name: {
          type: 'string',
          minLength: 1
        },
        description: {
          type: 'string'
        },
        createdAt: {
          type: 'string',
          format: 'date-time'
        },
        url: {
          type: 'string'
        },
        selector: {
          type: 'string',
          minLength: 1
        },
        alternativeSelectors: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        tagName: {
          type: 'string'
        },
        classes: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        text: {
          type: 'string'
        },
        attributes: {
          type: 'object',
          additionalProperties: {
            type: 'string'
          }
        }
      }
    },
    routeSkillEntry: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'path', 'title', 'summary', 'icon', 'content'],
      properties: {
        id: {
          type: 'string',
          minLength: 1
        },
        path: {
          type: 'string',
          minLength: 1
        },
        title: {
          type: 'string',
          minLength: 1
        },
        summary: {
          type: 'string'
        },
        icon: {
          enum: clientIconEnum
        },
        content: {
          type: 'string'
        }
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
        type: {
          const: 'market'
        },
        sourceId: {
          type: 'string',
          minLength: 1
        },
        sourceUrl: {
          type: 'string',
          format: 'uri'
        },
        marketClientId: {
          type: 'string',
          minLength: 1
        },
        marketVersion: {
          type: 'string',
          minLength: 1
        },
        installedAt: {
          type: 'string',
          format: 'date-time'
        }
      }
    },
    marketSource: {
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'kind', 'url'],
          properties: {
            id: {
              type: 'string',
              minLength: 1
            },
            kind: {
              const: 'direct'
            },
            url: {
              type: 'string',
              format: 'uri'
            },
            official: {
              type: 'boolean'
            }
          }
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'kind', 'url', 'provider', 'repository', 'refType', 'ref'],
          properties: {
            id: {
              type: 'string',
              minLength: 1
            },
            kind: {
              const: 'repository'
            },
            url: {
              type: 'string',
              format: 'uri'
            },
            provider: {
              enum: marketSourceProviderEnum
            },
            repository: {
              type: 'string',
              minLength: 1
            },
            refType: {
              enum: marketSourceRefTypeEnum
            },
            ref: {
              type: 'string',
              minLength: 1
            },
            official: {
              type: 'boolean'
            }
          }
        }
      ]
    }
  }
} as const
