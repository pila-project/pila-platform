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
