import { clientIconEnum, recordedFlowStepTypeEnum, routeRuleModeEnum } from './constants.js'

export const clientDefinitions = {
  backgroundClient: {
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'enabled', 'favorite', 'clientId', 'clientName', 'clientDescription', 'icon'],
    properties: {
      kind: { const: 'background' },
      enabled: { type: 'boolean', default: true },
      favorite: { type: 'boolean', default: false },
      clientId: { type: 'string', minLength: 1 },
      clientName: { type: 'string', minLength: 1 },
      clientDescription: { type: 'string', minLength: 1 },
      icon: { enum: clientIconEnum }
    }
  },
  routeClient: {
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'id', 'enabled', 'favorite', 'clientId', 'clientName', 'clientDescription', 'icon', 'matchPatterns', 'routeRules', 'autoInjectBridge', 'toolScriptSource', 'recordings', 'selectorResources', 'skillEntries'],
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
      routeRules: { type: 'array', items: { $ref: '#/definitions/routePathRule' } },
      autoInjectBridge: { type: 'boolean', default: true },
      toolScriptSource: { type: 'string' },
      recordings: { type: 'array', items: { $ref: '#/definitions/routeClientRecording' } },
      selectorResources: { type: 'array', items: { $ref: '#/definitions/routeSelectorResource' } },
      skillEntries: { type: 'array', items: { $ref: '#/definitions/routeSkillEntry' } },
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
    required: ['id', 'name', 'description', 'createdAt', 'updatedAt', 'capturedFeatures', 'steps'],
    properties: {
      id: { type: 'string', minLength: 1 },
      name: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      startUrl: { type: 'string' },
      capturedFeatures: { type: 'array', items: { type: 'string' } },
      steps: { type: 'array', items: { $ref: '#/definitions/recordedFlowStep' } }
    }
  },
  recordedFlowStep: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'type', 'selector', 'alternativeSelectors', 'tagName', 'classes', 'timestampOffsetMs'],
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
