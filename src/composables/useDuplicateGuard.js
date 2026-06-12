import { ref } from 'vue'

export function normalizeName(name) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function findDuplicateName(name, existingNames) {
  const key = normalizeName(name)
  if (!key) return null
  return existingNames.find(n => normalizeName(n) === key) || null
}

/**
 * Split bulk student rows into creates vs duplicate skips (existing roster + within upload).
 * @param {{ name: string, nickname?: string, grade?: string }[]} rows
 * @param {string[]} existingNames
 */
export function partitionBulkStudentRows(rows, existingNames) {
  const toCreate = []
  const skippedExisting = []
  const skippedBatch = []
  const seenInBatch = new Map()

  rows.forEach((row, index) => {
    const name = (row.name || '').trim()
    if (!name) return

    const key = normalizeName(name)
    const existingMatch = findDuplicateName(name, existingNames)

    if (existingMatch) {
      skippedExisting.push({ name, existingName: existingMatch, index })
      return
    }

    if (seenInBatch.has(key)) {
      const first = seenInBatch.get(key)
      skippedBatch.push({
        name,
        firstName: first.name,
        firstIndex: first.index,
        index,
      })
      return
    }

    seenInBatch.set(key, { name, index })
    toCreate.push(row)
  })

  return {
    toCreate,
    skippedExisting,
    skippedBatch,
    skippedCount: skippedExisting.length + skippedBatch.length,
  }
}

/**
 * Confirm when a normalized name already exists in a list.
 * @param {object} options
 * @param {() => string[]} options.getExistingNames
 */
export function useDuplicateGuard({ getExistingNames }) {
  const duplicatePrompt = ref(null)

  function findDuplicate(name) {
    return findDuplicateName(name, getExistingNames())
  }

  function runWithGuard(name, proceed) {
    const match = findDuplicate(name)
    if (match) {
      duplicatePrompt.value = { name, existingName: match, proceed }
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