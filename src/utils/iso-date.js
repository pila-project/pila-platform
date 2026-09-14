/**
 * Local-calendar ISO dates (YYYY-MM-DD).
 * Never use Date#toISOString() for these — UTC conversion shifts the day.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function toIsoDateString(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseIsoDate(value) {
  if (!value || typeof value !== 'string') return null
  const match = ISO_DATE.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month
    || date.getDate() !== day
  ) {
    return null
  }
  return date
}

/**
 * Locale for *display* only. Thai uses Buddhist Era years in the UI;
 * model values and ISO saves stay Gregorian (see toIsoDateString / parseIsoDate).
 */
export function dateDisplayLocale(lang) {
  const short = String(lang || 'en').split(/[-_]/)[0].toLowerCase() || 'en'
  if (short === 'th') return 'th-TH-u-ca-buddhist'
  return short
}

/** Format a Gregorian Date or YYYY-MM-DD for UI (BE years when lang is Thai). */
export function formatDateForDisplay(value, lang) {
  let date = null
  if (value instanceof Date) {
    date = Number.isNaN(value.getTime()) ? null : value
  } else if (typeof value === 'string') {
    date = parseIsoDate(value)
    if (!date) {
      const parsed = new Date(value)
      date = Number.isNaN(parsed.getTime()) ? null : parsed
    }
  }
  if (!date) return ''
  return date.toLocaleDateString(dateDisplayLocale(lang), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

