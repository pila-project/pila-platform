import { ref } from 'vue'

function normalizeName(name) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Confirm when a normalized name already exists in a list.
 * @param {object} options
 * @param {() => string[]} options.getExistingNames
 */
export function useDuplicateGuard({ getExistingNames }) {
  const duplicatePrompt = ref(null)

  function findDuplicate(name) {
    const key = normalizeName(name)
    if (!key) return null
    const names = getExistingNames()
    return names.find(n => normalizeName(n) === key) || null
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