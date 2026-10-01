function tagLabel(name) {
  return String(name || '').trim().toLocaleLowerCase()
}

/**
 * Leaf checkboxes for one category.
 * Drops the category id itself and a different id with the same display name.
 * A missing name is kept, so a failed lookup does not hide Emerging or Mastering.
 */
export function competencyIdsForCategory(categoryId, ids, names) {
  const categoryName = tagLabel(names?.get?.(categoryId))
  const seen = new Set()
  const kept = []

  for (const id of ids || []) {
    if (!id || id === categoryId || seen.has(id)) continue
    seen.add(id)
    const name = tagLabel(names?.get?.(id))
    if (categoryName && name && name === categoryName) continue
    kept.push(id)
  }

  return kept
}
