/**
 * Group `subject` field — string (legacy) or string[] (multi-select, UIUX-110).
 */

/** Always return a clean string[] for UI and display. */
export function normalizeGroupSubjects(subject) {
  if (Array.isArray(subject)) {
    return subject
      .filter(s => typeof s === 'string' && s.trim())
      .map(s => s.trim())
  }
  if (typeof subject === 'string' && subject.trim()) {
    return [subject.trim()]
  }
  return []
}

const SUBJECT_I18N_KEYS = {
  Mathematics: 'subject-mathematics',
  English: 'subject-english',
  Science: 'subject-science',
  'Social Studies': 'subject-social-studies',
  Art: 'subject-art',
  Music: 'subject-music',
  'Physical Education': 'subject-physical-education',
  Other: 'subject-other',
}

function subjectI18nKey(value) {
  return SUBJECT_I18N_KEYS[value] || `subject-${value.toLowerCase().replace(/\s+/g, '-')}`
}

/**
 * Comma-separated label for cards/lists; empty string when none.
 * When `t` is provided, map stored English values to subject-* i18n keys.
 * Without `t`, join the raw English values (serialize/tests).
 */
export function formatGroupSubjects(subject, t) {
  const values = normalizeGroupSubjects(subject)
  if (typeof t !== 'function') return values.join(', ')
  return values
    .map((value) => {
      const key = subjectI18nKey(value)
      const translated = t(key)
      if (!translated || translated === key) return value
      return translated
    })
    .join(', ')
}

/** Value to persist on Agent group state (array or cleared). */
export function serializeGroupSubjects(subject) {
  const list = normalizeGroupSubjects(subject)
  return list.length ? list : undefined
}
