import { competencyScoreRows } from './leaf-performance.js'

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
 * The embed host posts `{ type: 'close', info }`. The assignment listener
 * usually receives `info` already. Accept either shape.
 */
export function closePayload(info) {
  if (
    info
    && info.type === 'close'
    && info.info
    && typeof info.info === 'object'
  ) return info.info
  return info
}

/** True when a close payload has at least one score row. An empty object does not. */
export function closeHasScoreRows(info) {
  const payload = closePayload(info)
  return Object.keys(competencyScoreRows(payload?.competencies)).length > 0
}

/**
 * Same-host sequence item close: show a competency card, end this assignment
 * piece after the last activity, or stay so the student can use Next.
 * `hasScoreRows` is closeHasScoreRows(info), not merely "competencies is an object".
 */
export function sequenceItemCloseFollowUp({
  itemCount,
  itemIndex,
  hasScoreRows,
} = {}) {
  if (hasScoreRows) return 'card'
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
