import type { SkillHeaders, SkillQuery } from '@modeldriveprotocol/client'
import type { JsonSchema } from '@modeldriveprotocol/protocol'
import { z } from 'zod'

import type { RouteSkillEntry, RouteSkillParameter } from '#~/shared/config.js'
import { toProtocolJsonSchema } from '#~/background/json-schema.js'

const SKILL_TEMPLATE_TOKEN_PATTERN = /\{\{\s*(query|header)\.([^}]+?)\s*\}\}/g

export function renderRouteSkillContent(
  skill: RouteSkillEntry,
  query: SkillQuery,
  headers: SkillHeaders
): string {
  return skill.content.replace(
    SKILL_TEMPLATE_TOKEN_PATTERN,
    (_match, source, rawKey) => {
      const key = rawKey.trim()

      if (!key) {
        return ''
      }

      if (source === 'query') {
        return query[key] ?? ''
      }

      const exact = headers[key]

      if (exact !== undefined) {
        return exact
      }

      const lowerKey = key.toLowerCase()
      const matchedHeader = Object.entries(headers).find(
        ([name]) => name.toLowerCase() === lowerKey
      )

      return matchedHeader?.[1] ?? ''
    }
  )
}

export function buildRouteSkillInputSchema(
  skill: RouteSkillEntry
): JsonSchema | undefined {
  const querySchema = buildRouteSkillParameterSchema(
    skill.queryParameters,
    'Query values available to this skill.'
  )
  const headerSchema = buildRouteSkillParameterSchema(
    skill.headerParameters,
    'Header values available to this skill.'
  )

  if (!querySchema && !headerSchema) {
    return undefined
  }

  return toProtocolJsonSchema(
    z.object({
      ...(querySchema ? { query: querySchema.optional() } : {}),
      ...(headerSchema ? { headers: headerSchema.optional() } : {})
    })
  )
}

function buildRouteSkillParameterSchema(
  parameters: RouteSkillParameter[],
  description: string
): z.ZodType | undefined {
  if (parameters.length === 0) {
    return undefined
  }

  return z
    .object(
      Object.fromEntries(
        parameters.map((parameter) => [
          parameter.key,
          (
            parameter.summary
              ? z.string().describe(parameter.summary)
              : z.string()
          ).optional()
        ])
      ) as Record<string, z.ZodOptional<z.ZodType>>
    )
    .describe(description)
}
