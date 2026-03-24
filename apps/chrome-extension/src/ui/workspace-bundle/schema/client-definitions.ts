import {
  clientIconEnum,
  recordedFlowStepTypeEnum,
  routeRuleModeEnum
} from './constants.js'

export const clientDefinitions = {
  backgroundClient: {
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
      'disabledTools',
      'disabledResources',
      'disabledSkills'
    ],
    properties: {
      kind: { const: 'background' },
      id: { type: 'string', minLength: 1 },
      enabled: { type: 'boolean', default: true },
      favorite: { type: 'boolean', default: false },
      clientId: { type: 'string', minLength: 1 },
      clientName: { type: 'string', minLength: 1 },
      clientDescription: { type: 'string', minLength: 1 },
      icon: { enum: clientIconEnum },
      disabledTools: { type: 'array', items: { type: 'string', minLength: 1 } },
      disabledResources: {
        type: 'array',
        items: { type: 'string', minLength: 1 }
      },
      disabledSkills: { type: 'array', items: { type: 'string', minLength: 1 } }
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
      'skillFolders',
      'skillEntries'
    ],
    properties: {
      kind: { const: 'route' },
      id: { type: 'string', minLength: 1 },
      enabled: { type: 'boolean', default: true },
      favorite: { type: 'boolean', default: false },
      clientId: { type: 'string', minLength: 1 },
      clientName: { type: 'string', minLength: 1 },
      clientDescription: { type: 'string', minLength: 1 },
      icon: { enum: clientIconEnum },
      matchPatterns: { type: 'array', items: { type: 'string', minLength: 1 } },
      routeRules: {
        type: 'array',
        items: { $ref: '#/definitions/routePathRule' }
      },
      autoInjectBridge: { type: 'boolean', default: true },
      toolScriptSource: { type: 'string' },
      recordings: {
        type: 'array',
        items: { $ref: '#/definitions/routeClientRecording' }
      },
      selectorResources: {
        type: 'array',
        items: { $ref: '#/definitions/routeSelectorResource' }
      },
      skillFolders: {
        type: 'array',
        items: { $ref: '#/definitions/routeSkillFolder' }
      },
      skillEntries: {
        type: 'array',
        items: { $ref: '#/definitions/routeSkillEntry' }
      },
      installSource: { $ref: '#/definitions/marketClientInstallSource' }
    }
  },
  routePathRule: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'mode', 'value'],
    properties: {
      id: { type: 'string', minLength: 1 },
      mode: { enum: routeRuleModeEnum },
      value: { type: 'string', minLength: 1 }
    }
  },
  routeClientRecording: {
    type: 'object',
    additionalProperties: false,
    required: [
      'id',
      'name',
      'description',
      'createdAt',
      'updatedAt',
      'capturedFeatures',
      'steps'
    ],
    properties: {
      id: { type: 'string', minLength: 1 },
      name: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      mode: { enum: ['recording', 'script'] },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      startUrl: { type: 'string' },
      capturedFeatures: { type: 'array', items: { type: 'string' } },
      steps: {
        type: 'array',
        items: { $ref: '#/definitions/recordedFlowStep' }
      },
      scriptSource: { type: 'string' }
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
      id: { type: 'string', minLength: 1 },
      type: { enum: recordedFlowStepTypeEnum },
      selector: { type: 'string', minLength: 1 },
      alternativeSelectors: { type: 'array', items: { type: 'string' } },
      tagName: { type: 'string' },
      classes: { type: 'array', items: { type: 'string' } },
      timestampOffsetMs: { type: 'number', minimum: 0 },
      text: { type: 'string' },
      label: { type: 'string' },
      inputType: { type: 'string' },
      value: { type: 'string' },
      key: { type: 'string' },
      code: { type: 'string' }
    }
  }
} as const
