// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'

import { countVisibleElements, isElementVisible, queryVisibleElements } from '../src/page/visibility.js'

describe('page visibility helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('treats rendered elements as visible', () => {
    document.body.innerHTML = '<button class="target">Click</button>'
    const element = document.querySelector('.target')

    expect(element).toBeTruthy()
    expect(isElementVisible(element!)).toBe(true)
  })

  it('treats hidden ancestors and styles as not visible', () => {
    document.body.innerHTML = `
      <section style="display: none">
        <button class="display-none">A</button>
      </section>
      <section style="visibility: hidden">
        <button class="visibility-hidden">B</button>
      </section>
      <section hidden>
        <button class="hidden-attr">C</button>
      </section>
      <section style="opacity: 0">
        <button class="opacity-zero">D</button>
      </section>
    `

    for (
      const selector of [
        '.display-none',
        '.visibility-hidden',
        '.hidden-attr',
        '.opacity-zero'
      ]
    ) {
      const element = document.querySelector(selector)
      expect(element).toBeTruthy()
      expect(isElementVisible(element!)).toBe(false)
    }
  })

  it('filters and counts visible matches', () => {
    document.body.innerHTML = `
      <button class="item">Visible</button>
      <button class="item" style="display: none">Hidden</button>
      <section hidden>
        <button class="item">Hidden by parent</button>
      </section>
    `

    expect(queryVisibleElements(document, '.item')).toHaveLength(1)
    expect(countVisibleElements(document, '.item')).toEqual({
      totalMatches: 3,
      visibleMatches: 1
    })
  })
})
