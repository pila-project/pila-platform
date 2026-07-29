import { ref } from 'vue'

export function normalizeName(name) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Normalize grade for comparison (empty / missing treated as same bucket). */
export function normalizeGrade(grade) {
  return String(grade ?? '').trim().toLowerCase()
}

/**
 * Name-only match (groups, legacy).
 * @param {string} name
 * @param {string[]} existingNames
 */
export function findDuplicateName(name, existingNames) {
  const key = normalizeName(name)
  if (!key) return null
  return existingNames.find(n => normalizeName(n) === key) || null
}

/**
 * Student duplicate check with grade (UIUX-49).
 * - hard: same normalized name + same grade
 * - soft: same name, different grade (warn, do not auto-block)
 *
 * @param {string} name
 * @param {string} [grade]
 * @param {{ name: string, grade?: string }[]} existingStudents
 * @returns {{ type: 'hard'|'soft', existingName: string, existingGrade?: string } | null}
 */
export function findStudentDuplicate(name, grade, existingStudents = []) {
  const n = normalizeName(name)
  if (!n) return null
  const g = normalizeGrade(grade)

  let soft = null
  for (const e of existingStudents) {
    if (!e?.name || normalizeName(e.name) !== n) continue
    // Legacy name-only roster entries (no grade): treat as hard match
    if (e.matchAnyGrade) {
      return {
        type: 'hard',
        existingName: e.name,
        existingGrade: e.grade,
      }
    }
    if (normalizeGrade(e.grade) === g) {
      return {
        type: 'hard',
        existingName: e.name,
        existingGrade: e.grade,
      }
    }
    if (!soft) {
      soft = {
        type: 'soft',
        existingName: e.name,
        existingGrade: e.grade,
      }
    }
  }
  return soft
}

/**
 * Split bulk student rows into creates vs hard duplicate skips.
 * Soft name/grade conflicts are allowed into toCreate (not skipped).
 *
 * @param {{ name: string, nickname?: string, grade?: string }[]} rows
 * @param {{ name: string, grade?: string }[]|string[]} existing
 *   Prefer { name, grade }[]; bare string[] treated as name-only hard matches (legacy).
 */
export function partitionBulkStudentRows(rows, existing = []) {
  const existingStudents = (existing || []).map((e) => {
    if (typeof e === 'string') {
      return { name: e, grade: '', matchAnyGrade: true }
    }
    return { name: e?.name || '', grade: e?.grade || '' }
  }).filter(e => e.name)

  const toCreate = []
  const skippedExisting = []
  const skippedBatch = []
  /** @type {Map<string, { name: string, grade: string, index: number }>} */
  const seenInBatch = new Map()

  rows.forEach((row, index) => {
    const name = (row.name || '').trim()
    if (!name) return
    const grade = row.grade || ''
    const key = `${normalizeName(name)}|${normalizeGrade(grade)}`

    const conflict = findStudentDuplicate(name, grade, existingStudents)
    if (conflict?.type === 'hard') {
      skippedExisting.push({
        name,
        grade,
        existingName: conflict.existingName,
        existingGrade: conflict.existingGrade,
        index,
      })
      return
    }

    if (seenInBatch.has(key)) {
      const first = seenInBatch.get(key)
      skippedBatch.push({
        name,
        grade,
        firstName: first.name,
        firstIndex: first.index,
        index,
      })
      return
    }

    seenInBatch.set(key, { name, grade, index })
    // Soft conflicts (same name, other grade) still create
    toCreate.push({
      ...row,
      name,
      grade,
      softConflict: conflict?.type === 'soft' ? conflict : null,
    })
  })

  const softConflicts = toCreate.filter(r => r.softConflict)

  return {
    toCreate,
    skippedExisting,
    skippedBatch,
    softConflicts,
    skippedCount: skippedExisting.length + skippedBatch.length,
  }
}

/**
 * Confirm when a name (and optionally grade) already exists.
 * @param {object} options
 * @param {() => string[]} [options.getExistingNames] - name-only (groups)
 * @param {() => { name: string, grade?: string }[]} [options.getExistingStudents] - students + grade
 */
export function useDuplicateGuard({ getExistingNames, getExistingStudents } = {}) {
  const duplicatePrompt = ref(null)

  function findDuplicate(name, grade) {
    if (typeof getExistingStudents === 'function') {
      return findStudentDuplicate(name, grade, getExistingStudents())
    }
    const match = findDuplicateName(name, getExistingNames?.() || [])
    return match ? { type: 'hard', existingName: match } : null
  }

  /**
   * @param {string} name
   * @param {Function} proceed
   * @param {string} [grade] - required for student grade-aware checks
   */
  function runWithGuard(name, proceed, grade) {
    const match = findDuplicate(name, grade)
    if (match) {
      duplicatePrompt.value = {
        name,
        grade,
        type: match.type,
        existingName: match.existingName,
        existingGrade: match.existingGrade,
        proceed,
      }
      return false
    }
    proceed()
    return true
  }

  function confirmDuplicateProceed() {
    const p = duplicatePrompt.value
    duplicatePrompt.value = null
    if (p?.proceed) p.proceed()
  }

  function cancelDuplicateProceed() {
    duplicatePrompt.value = null
  }

  return {
    duplicatePrompt,
    runWithGuard,
    confirmDuplicateProceed,
    cancelDuplicateProceed,
  }
}
