import { normalizeSequenceItems } from './sequence-items.js'

/** Teacher In Progress and live monitoring read `{assignmentId}/sequence-{contentId}`. */
export function leafPerformancePath(assignmentId, contentId) {
  return `${assignmentId}/sequence-${contentId}`
}

/** Live-table cell for a leaf: one column, local index 0. */
export function leafPerformanceItemKey(contentId) {
  return `0/${contentId}`
}

/**
 * A sequence already writes this object from the matching player.
 * Leaves (Datawise app, Candli game) only emit close.
 */
export function contentOwnsSequencePerformance(contentState) {
  return normalizeSequenceItems(contentState?.items).length > 0
}

export function ensureLeafPerformance(state, contentId) {
  const key = leafPerformanceItemKey(contentId)
  if (!state.itemInfo || typeof state.itemInfo !== 'object') state.itemInfo = {}
  if (!state.itemInfo[key] || typeof state.itemInfo[key] !== 'object') {
    state.itemInfo[key] = { time: 0, correct: null }
  }
  if (state.activeItemIndex == null || state.activeItemIndex === '') {
    state.activeItemIndex = 0
  }
  if (!Number.isFinite(Number(state.totalTime))) state.totalTime = 0
  return state
}

export function tickLeafPerformance(state, contentId) {
  ensureLeafPerformance(state, contentId)
  const entry = state.itemInfo[leafPerformanceItemKey(contentId)]
  state.totalTime = Number(state.totalTime) + 1
  entry.time = Number(entry.time) + 1
  state.activeItemIndex = 0
}

export function finishLeafPerformance(state, contentId, info) {
  ensureLeafPerformance(state, contentId)
  const correct = leafCloseCorrect(info)
  if (correct === undefined) return state
  state.itemInfo[leafPerformanceItemKey(contentId)].correct = correct
  return state
}

function leafCloseCorrect(info) {
  if (!info || typeof info !== 'object') return undefined
  if (info.competencies && typeof info.competencies === 'object') {
    return competencyMet(info.competencies)
  }
  if (info.success === true || info.success === false || info.success === 'completed') {
    return info.success
  }
  return undefined
}

/** Same 0.85 bar the matching sequence player uses for a Candli close payload. */
function competencyMet(competencies) {
  const scores = { ...competencies }
  delete scores['general:attempts']
  const rows = Object.values(scores).filter((row) => Array.isArray(row))
  if (!rows.length) return null
  const numerator = rows.reduce((sum, row) => sum + Number(row[0] || 0), 0)
  const denominator = rows.reduce((sum, row) => sum + Number(row[1] || 0), 0)
  return 0.85 < (denominator ? numerator / denominator : 0) ? true : null
}
