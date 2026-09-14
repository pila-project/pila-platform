/**
 * Assignment type field — persist canonical slug; display via t(slug).
 * Legacy values may be English title-case or a localized PSelect label.
 */

export const ASSIGNMENT_TYPE_SLUGS = Object.freeze([
  'assessment',
  'practice',
  'homework',
  'learning',
])

/** Localized labels (all staticTranslation locales) + slugs → canonical slug. */
const LABEL_TO_SLUG = Object.freeze({
  'Assessment': 'assessment',
  'assessment': 'assessment',
  'Avaliação': 'assessment',
  'avaliação': 'assessment',
  'Beoordeling': 'assessment',
  'beoordeling': 'assessment',
  'Bewertung': 'assessment',
  'bewertung': 'assessment',
  'Evaluación': 'assessment',
  'evaluación': 'assessment',
  'Hodnotenie': 'assessment',
  'hodnotenie': 'assessment',
  'Novērtējums': 'assessment',
  'novērtējums': 'assessment',
  'Ocenianie': 'assessment',
  'ocenianie': 'assessment',
  'Évaluation': 'assessment',
  'évaluation': 'assessment',
  'การประเมิน': 'assessment',
  'ការវាយតម្លៃ': 'assessment',
  'Devoirs': 'homework',
  'devoirs': 'homework',
  'Domáce úlohy': 'homework',
  'domáce úlohy': 'homework',
  'Hausaufgaben': 'homework',
  'hausaufgaben': 'homework',
  'Homework': 'homework',
  'homework': 'homework',
  'Huiswerk': 'homework',
  'huiswerk': 'homework',
  'Lição de casa': 'homework',
  'lição de casa': 'homework',
  'Mājas darbs': 'homework',
  'mājas darbs': 'homework',
  'Praca domowa': 'homework',
  'praca domowa': 'homework',
  'Tarea': 'homework',
  'tarea': 'homework',
  'การบ้าน': 'homework',
  'កិច្ចការផ្ទះ': 'homework',
  'Apprentissage': 'learning',
  'apprentissage': 'learning',
  'Aprendizagem': 'learning',
  'aprendizagem': 'learning',
  'Aprendizaje': 'learning',
  'aprendizaje': 'learning',
  'Learning': 'learning',
  'learning': 'learning',
  'Leren': 'learning',
  'leren': 'learning',
  'Lernen': 'learning',
  'lernen': 'learning',
  'Mācīšanās': 'learning',
  'mācīšanās': 'learning',
  'Nauka': 'learning',
  'nauka': 'learning',
  'Učenie': 'learning',
  'učenie': 'learning',
  'การเรียนรู้': 'learning',
  'ការរៀន': 'learning',
  'Oefening': 'practice',
  'oefening': 'practice',
  'Practice': 'practice',
  'practice': 'practice',
  'Praktizēšana': 'practice',
  'praktizēšana': 'practice',
  'Pratique': 'practice',
  'pratique': 'practice',
  'Precvičovanie': 'practice',
  'precvičovanie': 'practice',
  'Práctica': 'practice',
  'práctica': 'practice',
  'Prática': 'practice',
  'prática': 'practice',
  'Übung': 'practice',
  'übung': 'practice',
  'Ćwiczenie': 'practice',
  'ćwiczenie': 'practice',
  'ฝึกฝน': 'practice',
  'អនុវត្ត': 'practice',
})

/**
 * Normalize a stored assignmentType to a canonical slug, or '' if unknown/empty.
 * Accepts slug, English title-case, or any known locale label.
 */
export function normalizeAssignmentType(value) {
  if (value == null) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  if (LABEL_TO_SLUG[raw]) return LABEL_TO_SLUG[raw]
  const lower = raw.toLowerCase()
  if (LABEL_TO_SLUG[lower]) return LABEL_TO_SLUG[lower]
  return ''
}

/** Display label for pills/filters; falls back to raw when unrecognized. */
export function assignmentTypeLabel(value, t) {
  const slug = normalizeAssignmentType(value)
  if (slug && typeof t === 'function') return t(slug)
  if (value == null) return ''
  return String(value)
}

export function assignmentTypeBadgeClass(value) {
  const slug = normalizeAssignmentType(value)
  if (slug === 'assessment') return 'assign-type-pill assign-type-assessment'
  if (slug === 'homework') return 'assign-type-pill assign-type-homework'
  if (slug === 'practice') return 'assign-type-pill assign-type-practice'
  if (slug === 'learning') return 'assign-type-pill assign-type-learning'
  return 'assign-type-pill assign-type-default'
}

export function assignmentTypeOptions(t) {
  return ASSIGNMENT_TYPE_SLUGS.map(slug => ({
    value: slug,
    title: t(slug),
  }))
}
