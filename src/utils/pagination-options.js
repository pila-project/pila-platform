/** Sentinel for “show all rows/items” (matches PTable convention). */
export const ALL_PER_PAGE = -1

export function isAllPerPage(perPage) {
  return perPage === ALL_PER_PAGE
}

/**
 * Normalize numeric or { value, title } options for pagination dropdowns.
 * @param {Array<number | { value: number, title: string }>} options
 * @param {(slug: string) => string} [t]
 */
export function normalizePerPageOptions(options, t) {
  return (options || []).map((opt) => {
    if (typeof opt === 'number') {
      if (opt === ALL_PER_PAGE) {
        return { value: ALL_PER_PAGE, title: t?.('all') || 'All' }
      }
      return { value: opt, title: String(opt) }
    }
    if (opt?.value === ALL_PER_PAGE && t) {
      return { ...opt, title: t('all') || opt.title || 'All' }
    }
    return opt
  })
}

/** Card grid surfaces (Explore, content pickers). */
export function gridPerPageOptions(t, sizes = [12, 24, 48]) {
  return [
    ...sizes.map((n) => ({ value: n, title: String(n) })),
    { value: ALL_PER_PAGE, title: t('all') || 'All' },
  ]
}

/** Table surfaces (teacher assignments, students, etc.). */
export function tablePerPageOptions(t, sizes = [10, 25, 50]) {
  return [
    ...sizes.map((n) => ({ value: n, title: String(n) })),
    { value: ALL_PER_PAGE, title: t('all') || 'All' },
  ]
}