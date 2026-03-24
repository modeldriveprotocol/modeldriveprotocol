import type { JsonSchema } from '@modeldriveprotocol/protocol'
import { z } from 'zod'

export function toProtocolJsonSchema(schema: z.ZodType): JsonSchema {
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'draft-07'
  }) as Record<string, unknown>

  const { $schema: _unusedSchema, ...protocolSchema } = jsonSchema

  return protocolSchema as JsonSchema
}
