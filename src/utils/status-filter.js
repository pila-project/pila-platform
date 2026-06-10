export const STATUS_FILTER = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
}

export function defaultActiveStatusFilters() {
  return [STATUS_FILTER.ACTIVE]
}

export function buildStatusFilterOptions(t) {
  return [
    { value: STATUS_FILTER.ACTIVE, label: t('active') },
    { value: STATUS_FILTER.ARCHIVED, label: t('archived') },
  ]
}

export function matchesStatusFilter(selectedStatuses, isArchived) {
  if (!selectedStatuses?.length) return false
  const status = isArchived ? STATUS_FILTER.ARCHIVED : STATUS_FILTER.ACTIVE
  return selectedStatuses.includes(status)
}

export function filterGroupIdsByStatus({
  activeIds,
  archivedIds,
  archivedIdSet,
  selectedStatuses,
  searchQuery,
  getSearchText,
}) {
  let ids = []
  if (selectedStatuses?.includes(STATUS_FILTER.ACTIVE)) {
    ids.push(...activeIds)
  }
  if (selectedStatuses?.includes(STATUS_FILTER.ARCHIVED)) {
    ids.push(...archivedIds)
  }

  const q = searchQuery?.trim().toLowerCase()
  if (q) {
    ids = ids.filter((id) => getSearchText(id).toLowerCase().includes(q))
  }

  return ids.sort((a, b) => {
    const aArchived = archivedIdSet.has(a)
    const bArchived = archivedIdSet.has(b)
    if (aArchived === bArchived) return 0
    return aArchived ? 1 : -1
  })
}