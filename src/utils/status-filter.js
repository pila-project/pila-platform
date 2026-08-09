/**
 * Teacher redesign archive filter semantics:
 * - Active is always shown (implicit default — no "Active" chip).
 * - Filter bar offers only "Archived".
 * - When Archived is selected → Active + Archived.
 * - When Archived is off → Active only.
 */
export const STATUS_FILTER = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
}

/** Empty selection = active-only (implicit). */
export function defaultActiveStatusFilters() {
  return []
}

/** Single chip: Archived (on = include archived alongside active). */
export function buildStatusFilterOptions(t) {
  return [
    { value: STATUS_FILTER.ARCHIVED, label: t('archived') },
  ]
}

/**
 * @param {string[]} selectedStatuses - e.g. [] or ['archived']
 * @param {boolean} isArchived
 */
export function matchesStatusFilter(selectedStatuses, isArchived) {
  if (!isArchived) return true
  return !!selectedStatuses?.includes(STATUS_FILTER.ARCHIVED)
}

export function includesArchivedStatus(selectedStatuses) {
  return !!selectedStatuses?.includes(STATUS_FILTER.ARCHIVED)
}

export function filterGroupIdsByStatus({
  activeIds,
  archivedIds,
  archivedIdSet,
  selectedStatuses,
  searchQuery,
  getSearchText,
}) {
  let ids = [...(activeIds || [])]
  if (includesArchivedStatus(selectedStatuses)) {
    ids.push(...(archivedIds || []))
  }

  const q = searchQuery?.trim().toLowerCase()
  if (q) {
    ids = ids.filter((id) => getSearchText(id).toLowerCase().includes(q))
  }

  return ids.sort((a, b) => {
    const aArchived = archivedIdSet.has(a)
    const bArchived = archivedIdSet.has(b)
    if (aArchived !== bArchived) return aArchived ? 1 : -1

    const nameCmp = getSearchText(a).localeCompare(getSearchText(b), undefined, { sensitivity: 'base' })
    if (nameCmp !== 0) return nameCmp

    return a.localeCompare(b)
  })
}
