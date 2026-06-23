export const CONTENT_TYPE_FILTER = {
  SEQUENCES_ONLY: 'sequences-only',
}

export function defaultContentTypeFilters() {
  return []
}

export function buildContentTypeFilterOptions(t) {
  return [
    {
      value: CONTENT_TYPE_FILTER.SEQUENCES_ONLY,
      label: t('sequences-only') || 'Sequences only',
    },
  ]
}

export function isSequencesOnlyFilterActive(selectedFilters) {
  return selectedFilters?.includes(CONTENT_TYPE_FILTER.SEQUENCES_ONLY)
}

export function matchesContentTypeFilter(selectedFilters, id, sequenceIds) {
  if (!isSequencesOnlyFilterActive(selectedFilters)) return true
  if (!id) return false
  if (sequenceIds?.has?.(id)) return true
  if (Array.isArray(sequenceIds)) return sequenceIds.includes(id)
  return false
}