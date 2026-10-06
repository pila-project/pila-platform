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

/**
 * What to do when the student finishes the content at `contentIndex`.
 * One piece of content closes the assignment. A later piece waits for the
 * student to continue or leave. The page never opens the next piece on its own.
 */
export function assignmentContentEndAction(contentCount, contentIndex) {
  const count = Number(contentCount)
  const index = Number(contentIndex)
  if (!Number.isInteger(count) || !Number.isInteger(index)) return 'close'
  if (count < 1 || index < 0 || index >= count) return 'close'
  if (index + 1 < count) return 'choose'
  return 'close'
}

export function isLastSequenceItem(itemCount, itemIndex) {
  const count = Number(itemCount)
  const index = Number(itemIndex)
  if (!Number.isInteger(count) || !Number.isInteger(index)) return false
  if (count < 1 || index < 0 || index >= count) return false
  return index + 1 === count
}

/**
 * Same-host sequence item close: show a competency card, end this assignment
 * piece after the last activity, or stay so the student can use Next.
 */
export function sequenceItemCloseFollowUp({
  itemCount,
  itemIndex,
  hasCompetencies,
} = {}) {
  if (hasCompetencies) return 'card'
  if (isLastSequenceItem(itemCount, itemIndex)) return 'end-content'
  return 'stay'
}

/** Competency card Close/Next: next item, end this assignment piece, or stay. */
export function competencyCardDismissFollowUp({
  itemCount,
  itemIndex,
  advance,
} = {}) {
  if (advance) return 'next-item'
  if (isLastSequenceItem(itemCount, itemIndex)) return 'end-content'
  return 'stay'
}

/** Drop one id from any legacy content shape; always returns a dense string[]. */
export function removeAssignmentContentId(content, id) {
  if (!id) return normalizeAssignmentContent(content)
  return normalizeAssignmentContent(content).filter((c) => c !== id)
}
