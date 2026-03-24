import { asRecord, createRequestId, readString, readStringArray } from '../utils.js'
import type {
  RecordedFlowStep,
  RouteClientRecording,
  RouteSelectorResource,
  RouteSkillEntry
} from './types.js'
import {
  deriveSkillTitle,
  normalizeAttributeMap,
  normalizeIcon,
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

  return value
    .map((item) => {
      const record = asRecord(item)
      const name = normalizeString(readString(record, 'name'), 'Recorded Flow')
      const steps = normalizeRecordedSteps(record.steps)

      return {
        id: normalizeId(readString(record, 'id')) ?? createRequestId('recording'),
        name,
        description: normalizeString(
          readString(record, 'description'),
          'Recorded user interactions that can be replayed as a tool call.'
        ),
        createdAt: normalizeTimestamp(readString(record, 'createdAt')),
        updatedAt: normalizeTimestamp(readString(record, 'updatedAt')),
        ...(readString(record, 'startUrl') ? { startUrl: readString(record, 'startUrl') } : {}),
        capturedFeatures: normalizePatterns(readStringArray(record, 'capturedFeatures') ?? []),
        steps
      } satisfies RouteClientRecording
    })
    .filter((recording) => recording.steps.length > 0)
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

      if (!selector || !tagName || (type !== 'click' && type !== 'fill' && type !== 'pressKey')) {
        return undefined
      }

      return {
        id: normalizeId(readString(record, 'id')) ?? createRequestId('step'),
        type,
        selector,
        alternativeSelectors: normalizePatterns(readStringArray(record, 'alternativeSelectors') ?? []),
        tagName,
        classes: normalizePatterns(readStringArray(record, 'classes') ?? []),
        timestampOffsetMs: normalizeOffset(record.timestampOffsetMs),
        ...(readString(record, 'text') ? { text: readString(record, 'text') } : {}),
        ...(readString(record, 'label') ? { label: readString(record, 'label') } : {}),
        ...(readString(record, 'inputType') ? { inputType: readString(record, 'inputType') } : {}),
        ...(readString(record, 'value') ? { value: readString(record, 'value') } : {}),
        ...(readString(record, 'key') ? { key: readString(record, 'key') } : {}),
        ...(readString(record, 'code') ? { code: readString(record, 'code') } : {})
      } satisfies RecordedFlowStep
    })
    .filter((step): step is RecordedFlowStep => Boolean(step))
}

export function normalizeSelectorResources(value: unknown): RouteSelectorResource[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      const record = asRecord(item)
      const name = normalizeString(readString(record, 'name'), 'Selector Resource')
      const selector = readString(record, 'selector')?.trim()
      const tagName = readString(record, 'tagName')?.trim()

      if (!selector || !tagName) {
        return undefined
      }

      return {
        id: normalizeId(readString(record, 'id')) ?? createRequestId('selector-resource'),
        name,
        description: normalizeString(
          readString(record, 'description'),
          'Serializable selector resource captured from a page element.'
        ),
        createdAt: normalizeTimestamp(readString(record, 'createdAt')),
        ...(readString(record, 'url') ? { url: readString(record, 'url') } : {}),
        selector,
        alternativeSelectors: normalizePatterns(readStringArray(record, 'alternativeSelectors') ?? []),
        tagName,
        classes: normalizePatterns(readStringArray(record, 'classes') ?? []),
        ...(readString(record, 'text') ? { text: readString(record, 'text') } : {}),
        attributes: normalizeAttributeMap(record.attributes)
      } satisfies RouteSelectorResource
    })
    .filter((resource): resource is RouteSelectorResource => Boolean(resource))
}

export function normalizeSkillEntries(value: unknown): RouteSkillEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      const record = asRecord(item)
      const path = normalizeSkillPath(readString(record, 'path'))

      if (!path) {
        return undefined
      }

      return {
        id: normalizeId(readString(record, 'id')) ?? createRequestId('skill'),
        path,
        title: normalizeString(readString(record, 'title'), deriveSkillTitle(path)),
        summary: normalizeString(
          readString(record, 'summary'),
          'Workspace guidance for the route-scoped client.'
        ),
        icon: normalizeIcon(readString(record, 'icon'), 'spark'),
        content: readString(record, 'content')?.trim() ?? ''
      } satisfies RouteSkillEntry
    })
    .filter((entry): entry is RouteSkillEntry => Boolean(entry))
}
