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

/** Comma-separated label for cards/lists; empty string when none. */
export function formatGroupSubjects(subject) {
  return normalizeGroupSubjects(subject).join(', ')
}

/** Value to persist on Agent group state (array or cleared). */
export function serializeGroupSubjects(subject) {
  const list = normalizeGroupSubjects(subject)
  return list.length ? list : undefined
}
