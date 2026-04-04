import { z } from 'zod'

import {
  clientIconEnum,
  recordedFlowStepTypeEnum,
  routeRuleModeEnum
} from './constants.js'

import {
  marketClientInstallSourceSchema,
  routeSelectorResourceSchema,
  routeSkillEntrySchema,
  routeSkillFolderSchema
} from './asset-definitions.js'

const nonEmptyStringSchema = z.string().min(1)
const nonNegativeNumberSchema = z.number().min(0)
const dateTimeStringSchema = z.string().meta({ format: 'date-time' })

export const routePathRuleSchema = z.object({
  id: nonEmptyStringSchema,
  mode: z.enum(routeRuleModeEnum),
  value: nonEmptyStringSchema
})

export const recordedFlowStepSchema = z.object({
  id: nonEmptyStringSchema,
  type: z.enum(recordedFlowStepTypeEnum),
  selector: nonEmptyStringSchema,
  alternativeSelectors: z.array(z.string()),
  tagName: z.string(),
  classes: z.array(z.string()),
  timestampOffsetMs: nonNegativeNumberSchema,
  text: z.string().optional(),
  label: z.string().optional(),
  inputType: z.string().optional(),
  value: z.string().optional(),
  key: z.string().optional(),
  code: z.string().optional()
})

export const routeClientRecordingSchema = z.object({
  id: nonEmptyStringSchema,
  path: nonEmptyStringSchema,
  name: nonEmptyStringSchema,
  description: z.string(),
  mode: z.enum(['recording', 'script']).optional(),
  createdAt: dateTimeStringSchema,
  updatedAt: dateTimeStringSchema,
  startUrl: z.string().optional(),
  capturedFeatures: z.array(z.string()),
  steps: z.array(recordedFlowStepSchema),
  scriptSource: z.string().optional()
})

export const backgroundExposeAssetSchema = z.object({
  id: nonEmptyStringSchema,
  path: nonEmptyStringSchema,
  description: z.string(),
  enabled: z.boolean().default(true)
})

export const backgroundClientSchema = z.object({
  kind: z.literal('background'),
  id: nonEmptyStringSchema,
  enabled: z.boolean().default(true),
  favorite: z.boolean().default(false),
  clientId: nonEmptyStringSchema,
  clientName: nonEmptyStringSchema,
  clientDescription: nonEmptyStringSchema,
  icon: z.enum(clientIconEnum),
  exposes: z.array(backgroundExposeAssetSchema).optional(),
  disabledExposePaths: z.array(nonEmptyStringSchema).optional(),
  disabledTools: z.array(nonEmptyStringSchema).optional(),
  disabledResources: z.array(nonEmptyStringSchema).optional(),
  disabledSkills: z.array(nonEmptyStringSchema).optional()
})

export const routeClientSchema = z.object({
  kind: z.literal('route'),
  id: nonEmptyStringSchema,
  enabled: z.boolean().default(true),
  favorite: z.boolean().default(false),
  clientId: nonEmptyStringSchema,
  clientName: nonEmptyStringSchema,
  clientDescription: nonEmptyStringSchema,
  icon: z.enum(clientIconEnum),
  matchPatterns: z.array(nonEmptyStringSchema),
  routeRules: z.array(routePathRuleSchema),
  autoInjectBridge: z.boolean().default(true),
  pathScriptSource: z.string().default(''),
  toolScriptSource: z.string().optional(),
  recordings: z.array(routeClientRecordingSchema),
  selectorResources: z.array(routeSelectorResourceSchema),
  skillFolders: z.array(routeSkillFolderSchema),
  skillEntries: z.array(routeSkillEntrySchema),
  installSource: marketClientInstallSourceSchema.optional()
})
