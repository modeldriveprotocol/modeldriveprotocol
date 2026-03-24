import { z } from 'zod'

import { marketSourceProviderEnum, marketSourceRefTypeEnum } from './constants.js'

const nonEmptyStringSchema = z.string().min(1)

const directMarketSourceSchema = z.object({
  id: nonEmptyStringSchema,
  kind: z.literal('direct'),
  url: z.url(),
  official: z.boolean().optional()
})

const repositoryMarketSourceSchema = z.object({
  id: nonEmptyStringSchema,
  kind: z.literal('repository'),
  url: z.url(),
  provider: z.enum(marketSourceProviderEnum),
  repository: nonEmptyStringSchema,
  refType: z.enum(marketSourceRefTypeEnum),
  ref: nonEmptyStringSchema,
  official: z.boolean().optional()
})

export const marketSourceSchema = z.discriminatedUnion('kind', [
  directMarketSourceSchema,
  repositoryMarketSourceSchema
])
