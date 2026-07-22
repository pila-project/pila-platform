export const FAVORITES_FILTER = {
  ONLY: 'favorites-only',
}

export function defaultFavoritesFilters() {
  return []
}

export function buildFavoritesFilterOptions(t) {
  return [
    {
      value: FAVORITES_FILTER.ONLY,
      label: t('favorites-only'),
    },
  ]
}

export function isFavoritesFilterActive(selectedFilters) {
  return selectedFilters?.includes(FAVORITES_FILTER.ONLY)
}

export function matchesFavoritesFilter(selectedFilters, id, favoriteIds) {
  if (!isFavoritesFilterActive(selectedFilters)) return true
  return !!id && favoriteIds?.has(id)
}