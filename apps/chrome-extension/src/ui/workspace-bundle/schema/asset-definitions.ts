import { z } from 'zod'

import { clientIconEnum } from './constants.js'

const nonEmptyStringSchema = z.string().min(1)
const dateTimeStringSchema = z.string().meta({ format: 'date-time' })

export const routeSelectorResourceSchema = z.object({
  id: nonEmptyStringSchema,
  name: nonEmptyStringSchema,
  description: z.string(),
  createdAt: dateTimeStringSchema,
  url: z.string().optional(),
  selector: nonEmptyStringSchema,
  alternativeSelectors: z.array(z.string()),
  tagName: z.string(),
  classes: z.array(z.string()),
  text: z.string().optional(),
  attributes: z.record(z.string(), z.string())
})

export const routeSkillParameterSchema = z.object({
  id: nonEmptyStringSchema,
  key: nonEmptyStringSchema,
  summary: z.string()
})

export const routeSkillEntrySchema = z.object({
  id: nonEmptyStringSchema,
  path: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  summary: z.string(),
  icon: z.enum(clientIconEnum),
  queryParameters: z.array(routeSkillParameterSchema),
  headerParameters: z.array(routeSkillParameterSchema),
  content: z.string()
})

export const routeSkillFolderSchema = z.object({
  id: nonEmptyStringSchema,
  path: nonEmptyStringSchema
})

export const marketClientInstallSourceSchema = z.object({
  type: z.literal('market'),
  sourceId: nonEmptyStringSchema,
  sourceUrl: z.url(),
  marketClientId: nonEmptyStringSchema,
  marketVersion: nonEmptyStringSchema,
  installedAt: dateTimeStringSchema
})
