import { describe, expect, it } from 'vitest'

import {
  assertUrlMatchCondition,
  createStableId,
  describeUrlMatchCondition,
  matchesUrlCondition,
  normalizeUrlMatchCondition
} from '../src/shared/utils.js'

describe('chrome extension utils', () => {
  it('creates deterministic stable ids', () => {
    expect(createStableId('script', 'console.log(1)')).toBe(
      createStableId('script', 'console.log(1)')
    )
    expect(createStableId('script', 'console.log(1)')).not.toBe(
      createStableId('script', 'console.log(2)')
    )
  })

  it('normalizes and validates url match conditions', () => {
    expect(
      normalizeUrlMatchCondition({
        url: ' https://example.com/app ',
        includes: ' /dashboard ',
        matches: ' '
      })
    ).toEqual({
      url: 'https://example.com/app',
      includes: '/dashboard'
    })

    expect(() => assertUrlMatchCondition({})).toThrow(
      'One of url, includes, or matches is required'
    )
    expect(() => assertUrlMatchCondition({ matches: '[' })).toThrow(
      'Invalid matches regular expression'
    )
  })

  it('matches urls using exact, substring, and regex constraints', () => {
    expect(
      matchesUrlCondition('https://app.example.com/dashboard?id=1', {
        includes: '/dashboard',
        matches: 'id=\\d+'
      })
    ).toBe(true)

    expect(
      matchesUrlCondition('https://app.example.com/dashboard?id=1', {
        url: 'https://app.example.com/dashboard'
      })
    ).toBe(false)
  })

  it('describes url match conditions for timeout messages', () => {
    expect(
      describeUrlMatchCondition({
        url: 'https://app.example.com/dashboard',
        matches: 'tab=activity'
      })
    ).toBe('url = "https://app.example.com/dashboard" && url matches /tab=activity/')
  })
})
