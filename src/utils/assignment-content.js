/** Normalize assignment `content` from Agent state (ids, legacy single value, or object map). */
export function normalizeAssignmentContent(content) {
  if (!content) return []
  if (Array.isArray(content)) {
    return content
      .map((entry) => (typeof entry === 'string' ? entry : entry?.id ?? entry))
      .filter(Boolean)
  }
  if (typeof content === 'string') return [content]
  if (typeof content === 'object') {
    return Object.values(content)
      .map((entry) => (typeof entry === 'string' ? entry : entry?.id ?? entry))
      .filter(Boolean)
  }
  return []
}