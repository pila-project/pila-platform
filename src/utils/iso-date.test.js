import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  dateDisplayLocale,
  formatDateForDisplay,
  parseIsoDate,
  toIsoDateString,
} from './iso-date.js'

describe('dateDisplayLocale', () => {
  it('uses Buddhist calendar only for Thai UI language', () => {
    assert.equal(dateDisplayLocale('th'), 'th-TH-u-ca-buddhist')
    assert.equal(dateDisplayLocale('th-TH'), 'th-TH-u-ca-buddhist')
    assert.equal(dateDisplayLocale('TH'), 'th-TH-u-ca-buddhist')
  })

  it('does not use Buddhist calendar for other languages', () => {
    assert.equal(dateDisplayLocale('en'), 'en')
    assert.equal(dateDisplayLocale('en-US'), 'en')
    assert.equal(dateDisplayLocale('fr'), 'fr')
    assert.equal(dateDisplayLocale('de'), 'de')
    assert.equal(dateDisplayLocale(''), 'en')
  })
})

describe('formatDateForDisplay', () => {
  it('shows a Buddhist Era year when UI language is Thai', () => {
    const formatted = formatDateForDisplay('2026-09-11', 'th')
    assert.match(formatted, /2569/)
    assert.doesNotMatch(formatted, /2026/)
  })

  it('shows a Gregorian year for English and other languages', () => {
    for (const lang of ['en', 'fr', 'de']) {
      const formatted = formatDateForDisplay('2026-09-11', lang)
      assert.match(formatted, /2026/)
      assert.doesNotMatch(formatted, /2569/)
    }
  })
})

describe('toIsoDateString / parseIsoDate', () => {
  it('keeps model values Gregorian even when display is Thai', () => {
    const date = parseIsoDate('2026-09-11')
    assert.ok(date)
    assert.equal(toIsoDateString(date), '2026-09-11')
    assert.match(formatDateForDisplay(date, 'th'), /2569/)
  })
})
