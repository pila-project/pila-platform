import { isUuid } from '../../../utils/teacher-academy.js'

/** On by default. ?klplayer=0 falls back to the built-in renderer. */
export function academyKlPlayerEnabled(queryValue) {
  return klPlayerQuery(queryValue) !== false
}

export function shouldUseAcademyKlPlayer({ id, fixture, queryValue }) {
  if (fixture) return false
  if (!isUuid(id)) return false
  return academyKlPlayerEnabled(queryValue)
}

/**
 * Nikki's resolver reads agent.environment().variables.LANGUAGES in order
 * and keeps the first language her app supports. Page language goes first;
 * the rest stay as fallback.
 */
export function languagesWithPageFirst(existing, pageLang) {
  const page = typeof pageLang === 'string' && pageLang ? pageLang : 'en'
  const prior = Array.isArray(existing)
    ? existing.filter((code) => typeof code === 'string' && code && code !== page)
    : []
  return [page, ...prior]
}

function klPlayerQuery(queryValue) {
  const raw = Array.isArray(queryValue) ? queryValue[queryValue.length - 1] : queryValue
  if (raw == null || raw === '') return null
  const text = String(raw)
  if (text === '0') return false
  if (text === '1') return true
  return null
}
