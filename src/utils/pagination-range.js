/**
 * Collapsed page list for pagination UIs.
 * Returns 1-based page numbers and 'ellipsis' tokens.
 *
 * @param {number} page - Current page (1-based)
 * @param {number} total - Total pages
 * @param {number} maxButtons - Max numeric page buttons before collapsing
 * @returns {(number | 'ellipsis')[]}
 */
export function getCollapsedPageRange(page, total, maxButtons = 4) {
  if (total <= 0) return []
  const current = Math.max(1, Math.min(page, total))

  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const leading = maxButtons - 1

  if (current <= leading) {
    return [
      ...Array.from({ length: leading }, (_, i) => i + 1),
      'ellipsis',
      total,
    ]
  }

  if (current > total - leading) {
    const start = total - leading + 1
    return [
      1,
      'ellipsis',
      ...Array.from({ length: leading }, (_, i) => start + i),
    ]
  }

  if (maxButtons <= 3) {
    return [1, 'ellipsis', current, 'ellipsis', total]
  }

  return [1, 'ellipsis', current - 1, current, 'ellipsis', total]
}

/**
 * Responsive max numeric buttons: fewer on narrow viewports.
 * @param {number} [width]
 * @returns {number}
 */
export function getResponsiveMaxPageButtons(width = typeof window !== 'undefined' ? window.innerWidth : 1024) {
  if (width < 400) return 3
  if (width < 640) return 3
  return 4
}