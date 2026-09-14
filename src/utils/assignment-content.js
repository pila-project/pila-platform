/** Normalize assignment `content` from Agent state (ids, legacy single value, or object map). */
export function normalizeAssignmentContent(content) {
  if (!content) return []
  if (Array.isArray(content)) {
    return content
      .map((entry) => (typeof entry === 'string' ? entry : entry?.id ?? entry))
      .filter((id) => typeof id === 'string' && id)
  }
  if (typeof content === 'string') return [content]
  if (typeof content === 'object') {
    return Object.values(content)
      .map((entry) => (typeof entry === 'string' ? entry : entry?.id ?? entry))
      .filter((id) => typeof id === 'string' && id)
  }
  return []
}

/** Drop one id from any legacy content shape; always returns a dense string[]. */
export function removeAssignmentContentId(content, id) {
  if (!id) return normalizeAssignmentContent(content)
  return normalizeAssignmentContent(content).filter((c) => c !== id)
}
