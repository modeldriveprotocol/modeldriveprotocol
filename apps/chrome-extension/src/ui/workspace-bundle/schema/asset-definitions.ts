import { z } from 'zod'

const nonEmptyStringSchema = z.string().min(1)
const dateTimeStringSchema = z.string().meta({ format: 'date-time' })

export const routeSelectorResourceSchema = z.object({
  id: nonEmptyStringSchema,
  path: nonEmptyStringSchema,
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
  summary: z.string(),
  type: z.enum(['string', 'number', 'boolean']).default('string')
})

export const routeSkillMetadataSchema = z.object({
  title: nonEmptyStringSchema,
  summary: z.string(),
  queryParameters: z.array(routeSkillParameterSchema),
  headerParameters: z.array(routeSkillParameterSchema)
})

export const routeSkillEntrySchema = z.object({
  id: nonEmptyStringSchema,
  path: nonEmptyStringSchema,
  metadata: routeSkillMetadataSchema,
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
