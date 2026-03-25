import {
  asRecord,
  createRequestId,
  readString,
  readStringArray
} from '../utils.js'
import type {
  RecordedFlowStep,
  RouteClientRecording,
  RouteSkillFolder,
  RouteSkillParameter,
  RouteSkillParameterType,
  RouteSelectorResource,
  RouteSkillEntry
} from './types.js'
import {
  deriveSkillTitle,
  normalizeAttributeMap,
  normalizeId,
  normalizeOffset,
  normalizePatterns,
  normalizeSkillPath,
  normalizeString,
  normalizeTimestamp
} from './internal.js'

export function normalizeRecordings(value: unknown): RouteClientRecording[] {
  if (!Array.isArray(value)) {
    return []
  }

  const usedPaths = new Set<string>()

  return value.map((item) => {
    const record = asRecord(item)
    const name = normalizeString(readString(record, 'name'), 'Recorded Flow')
    const steps = normalizeRecordedSteps(record.steps)
    const mode =
      readString(record, 'mode') === 'script' ? 'script' : 'recording'

    return {
      id: normalizeId(readString(record, 'id')) ?? createRequestId('recording'),
      path: normalizeUniqueAssetPath(
        readString(record, 'path'),
        name,
        'flow',
        usedPaths
      ),
      name,
      description: normalizeString(
        readString(record, 'description'),
        'Recorded user interactions that can be replayed as a tool call.'
      ),
      mode,
      createdAt: normalizeTimestamp(readString(record, 'createdAt')),
      updatedAt: normalizeTimestamp(readString(record, 'updatedAt')),
      ...(readString(record, 'startUrl')
        ? { startUrl: readString(record, 'startUrl') }
        : {}),
      capturedFeatures: normalizePatterns(
        readStringArray(record, 'capturedFeatures') ?? []
      ),
      steps,
      scriptSource: readString(record, 'scriptSource') ?? ''
    } satisfies RouteClientRecording
  })
}

function normalizeRecordedSteps(value: unknown): RecordedFlowStep[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      const record = asRecord(item)
      const type = readString(record, 'type')
      const selector = readString(record, 'selector')?.trim()
      const tagName = readString(record, 'tagName')?.trim()

      if (
        !selector ||
        !tagName ||
        (type !== 'click' && type !== 'fill' && type !== 'pressKey')
      ) {
        return undefined
      }

      return {
        id: normalizeId(readString(record, 'id')) ?? createRequestId('step'),
        type,
        selector,
        alternativeSelectors: normalizePatterns(
          readStringArray(record, 'alternativeSelectors') ?? []
        ),
        tagName,
        classes: normalizePatterns(readStringArray(record, 'classes') ?? []),
        timestampOffsetMs: normalizeOffset(record.timestampOffsetMs),
        ...(readString(record, 'text')
          ? { text: readString(record, 'text') }
          : {}),
        ...(readString(record, 'label')
          ? { label: readString(record, 'label') }
          : {}),
        ...(readString(record, 'inputType')
          ? { inputType: readString(record, 'inputType') }
          : {}),
        ...(readString(record, 'value')
          ? { value: readString(record, 'value') }
          : {}),
        ...(readString(record, 'key')
          ? { key: readString(record, 'key') }
          : {}),
        ...(readString(record, 'code')
          ? { code: readString(record, 'code') }
          : {})
      } satisfies RecordedFlowStep
    })
    .filter((step): step is RecordedFlowStep => Boolean(step))
}

export function normalizeSelectorResources(
  value: unknown
): RouteSelectorResource[] {
  if (!Array.isArray(value)) {
    return []
  }

  const usedPaths = new Set<string>()

  return value
    .map((item) => {
      const record = asRecord(item)
      const name = normalizeString(
        readString(record, 'name'),
        'Selector Resource'
      )
      const selector = readString(record, 'selector')?.trim()
      const tagName = readString(record, 'tagName')?.trim()

      if (!selector || !tagName) {
        return undefined
      }

      return {
        id:
          normalizeId(readString(record, 'id')) ??
          createRequestId('selector-resource'),
        path: normalizeUniqueAssetPath(
          readString(record, 'path'),
          name,
          'resource',
          usedPaths
        ),
        name,
        description: normalizeString(
          readString(record, 'description'),
          'Serializable selector resource captured from a page element.'
        ),
        createdAt: normalizeTimestamp(readString(record, 'createdAt')),
        ...(readString(record, 'url')
          ? { url: readString(record, 'url') }
          : {}),
        selector,
        alternativeSelectors: normalizePatterns(
          readStringArray(record, 'alternativeSelectors') ?? []
        ),
        tagName,
        classes: normalizePatterns(readStringArray(record, 'classes') ?? []),
        ...(readString(record, 'text')
          ? { text: readString(record, 'text') }
          : {}),
        attributes: normalizeAttributeMap(record.attributes)
      } satisfies RouteSelectorResource
    })
    .filter((resource): resource is RouteSelectorResource => Boolean(resource))
}

function normalizeUniqueAssetPath(
  rawPath: string | undefined,
  fallbackName: string,
  defaultBase: string,
  usedPaths: Set<string>
): string {
  const basePath =
    normalizeSkillPath(rawPath) ??
    normalizeSkillPath(fallbackName) ??
    defaultBase
  let candidate = basePath
  let attempt = 2

  while (usedPaths.has(candidate)) {
    candidate = `${basePath}-${attempt}`
    attempt += 1
  }

  usedPaths.add(candidate)
  return candidate
}

export function normalizeSkillEntries(value: unknown): RouteSkillEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      const record = asRecord(item)
      const metadataRecord = asRecord(record.metadata)
      const path = normalizeSkillPath(readString(record, 'path'))

      if (!path) {
        return undefined
      }

      return {
        id: normalizeId(readString(record, 'id')) ?? createRequestId('skill'),
        path,
        metadata: {
          title: normalizeString(
            readString(metadataRecord, 'title') ?? readString(record, 'title'),
            deriveSkillTitle(path)
          ),
          summary: normalizeString(
            readString(metadataRecord, 'summary') ?? readString(record, 'summary'),
            'Workspace guidance for the route-scoped client.'
          ),
          queryParameters: normalizeSkillParameters(
            metadataRecord.queryParameters ?? record.queryParameters
          ),
          headerParameters: normalizeSkillParameters(
            metadataRecord.headerParameters ?? record.headerParameters,
            {
              caseInsensitiveKeys: true
            }
          )
        },
        content: readString(record, 'content')?.trim() ?? ''
      } satisfies RouteSkillEntry
    })
    .filter((entry): entry is RouteSkillEntry => Boolean(entry))
    .filter(
      (entry, index, array) =>
        array.findIndex((candidate) => candidate.path === entry.path) === index
    )
}

export function normalizeSkillFolders(
  value: unknown,
  skillEntries: RouteSkillEntry[]
): RouteSkillFolder[] {
  if (!Array.isArray(value)) {
    return []
  }

  const skillEntryPaths = new Set(skillEntries.map((entry) => entry.path))

  return value
    .map((item) => {
      const record = asRecord(item)
      const path = normalizeSkillPath(readString(record, 'path'))

      if (!path || skillEntryPaths.has(path)) {
        return undefined
      }

      return {
        id:
          normalizeId(readString(record, 'id')) ??
          createRequestId('skill-folder'),
        path
      } satisfies RouteSkillFolder
    })
    .filter((folder): folder is RouteSkillFolder => Boolean(folder))
    .filter(
      (folder, index, array) =>
        array.findIndex((candidate) => candidate.path === folder.path) === index
    )
}

function normalizeSkillParameters(
  value: unknown,
  options: {
    caseInsensitiveKeys?: boolean
  } = {}
): RouteSkillParameter[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      const record = asRecord(item)
      const key = readString(record, 'key')?.trim()

      if (!key) {
        return undefined
      }

      return {
        id:
          normalizeId(readString(record, 'id')) ??
          createRequestId('skill-param'),
        key,
        summary: readString(record, 'summary')?.trim() ?? '',
        type: normalizeSkillParameterType(readString(record, 'type'))
      } satisfies RouteSkillParameter
    })
    .filter((parameter): parameter is RouteSkillParameter => Boolean(parameter))
    .filter(
      (parameter, index, array) =>
        array.findIndex(
          (candidate) =>
            normalizeSkillParameterKey(
              candidate.key,
              options.caseInsensitiveKeys
            ) ===
            normalizeSkillParameterKey(
              parameter.key,
              options.caseInsensitiveKeys
            )
        ) === index
    )
}

function normalizeSkillParameterKey(
  value: string,
  caseInsensitive = false
): string {
  return caseInsensitive ? value.toLowerCase() : value
}

function normalizeSkillParameterType(
  value: string | undefined
): RouteSkillParameterType {
  if (value === 'number' || value === 'boolean') {
    return value
  }

  return 'string'
}
