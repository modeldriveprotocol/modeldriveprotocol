import type { SkillHeaders, SkillQuery } from '@modeldriveprotocol/client'
import type { JsonSchema } from '@modeldriveprotocol/protocol'

import type { RouteSkillEntry, RouteSkillParameter } from '#~/shared/config.js'

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

  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      ...(querySchema ? { query: querySchema } : {}),
      ...(headerSchema ? { headers: headerSchema } : {})
    }
  }
}

function buildRouteSkillParameterSchema(
  parameters: RouteSkillParameter[],
  description: string
): JsonSchema | undefined {
  if (parameters.length === 0) {
    return undefined
  }

  return {
    type: 'object',
    description,
    additionalProperties: false,
    properties: Object.fromEntries(
      parameters.map((parameter) => [
        parameter.key,
        {
          type: 'string',
          ...(parameter.summary
            ? {
                description: parameter.summary
              }
            : {})
        }
      ])
    )
  }
}
