/** Normalize sequence `items` from Agent state (array or legacy object map). */
export function normalizeSequenceItems(items) {
  if (!items) return []
  if (Array.isArray(items)) return [...items]
  if (typeof items === 'object') {
    return Object.values(items)
      .map((entry) => (typeof entry === 'string' ? entry : entry?.id ?? entry))
      .filter(Boolean)
  }
  return []
}

export function isExternalExploreDrop(dataTransfer, internalDragIndex) {
  if (!dataTransfer) return false
  if (internalDragIndex !== null && internalDragIndex !== undefined) return false
  const types = [...(dataTransfer.types || [])]
  if (types.includes('text/x-reorder')) return false
  const id = dataTransfer.getData('text/plain') || dataTransfer.getData('text')
  return !!id
}