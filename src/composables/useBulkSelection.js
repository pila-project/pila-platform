import { ref, computed, watch } from 'vue'

/**
 * Bulk row selection with prune when visible items change (filters, pagination scope).
 * @param {import('vue').Ref|import('vue').ComputedRef} items - Current visible items
 * @param {string} itemKey - Property used as stable id (default 'id')
 */
export function useBulkSelection(items, itemKey = 'id') {
  const selected = ref([])

  const visibleIds = computed(() => {
    const list = items.value ?? []
    return new Set(list.map(item => item[itemKey]))
  })

  const selectedInView = computed(() =>
    selected.value.filter(s => visibleIds.value.has(s[itemKey]))
  )

  const selectedCount = computed(() => selectedInView.value.length)

  watch(items, () => {
    const pruned = selectedInView.value
    if (pruned.length !== selected.value.length) {
      selected.value = pruned
    }
  }, { deep: true })

  function setSelected(next) {
    selected.value = next
  }

  function clearSelection() {
    selected.value = []
  }

  return {
    selected,
    selectedInView,
    selectedCount,
    setSelected,
    clearSelection,
  }
}