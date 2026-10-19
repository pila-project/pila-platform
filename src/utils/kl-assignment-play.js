import { validate as isUuid } from 'uuid'
import { normalizeAssignmentContent } from './assignment-content.js'
import { GEN_AI_SEQUENCES } from './constants.js'
import { itemInfoHasRealCell } from './kl-wrapper-progress.js'
import {
  classifyLeaves,
  isKlPlayableShape,
  isSinglePethematiciansAssignment,
  sequenceLeaves,
} from './kl-playability.js'
import { klPlayerUrl } from './kl-player.js'
import { leafPerformancePath } from './leaf-performance.js'
import {
  KL_SEQUENCE_PLAYER_HOST,
  SEQUENCE_SYNC_TIMEOUT_MS,
  isSequenceActiveType,
  normalizeSequenceItems,
  withTimeout,
} from './sequence-items.js'

/** One bound for the whole student-page play decision. Past this, use today's path. */
export const KL_PLAY_DECISION_TIMEOUT_MS = 8_000

function sameIdList(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false
  }
  return true
}

/**
 * How the student page should open this assignment.
 * Always plans. `kl` embeds one Know Learning player URL. The page must not
 * write performance or watch competency scores for that play. An existing
 * progress doc gets any missing `{index}/{itemId}` keys before this returns.
 * A missing `itemInfo` is left for Know Learning's first init.
 * A single non-UUID content id stays on today's path and does not read metadata.
 * Trunk-era string `content` does too, unless an active klWrapper is stored.
 *
 * @returns {Promise<{ kind: 'today' } | { kind: 'kl', playableId: string }>}
 */
export function planKlAssignmentPlay({
  assignmentId,
  assignmentState,
  agent = globalThis.Agent,
  timeoutMs = SEQUENCE_SYNC_TIMEOUT_MS,
  decisionTimeoutMs = KL_PLAY_DECISION_TIMEOUT_MS,
} = {}) {
  return withTimeout(
    planKlAssignmentPlayNow({ assignmentId, assignmentState, agent, timeoutMs }),
    decisionTimeoutMs,
    'KL play decision timed out',
  ).catch(() => ({ kind: 'today' }))
}

async function planKlAssignmentPlayNow({ assignmentId, assignmentState, agent, timeoutMs }) {
  const contentIds = normalizeAssignmentContent(assignmentState?.content)
  const storedWrapper = assignmentState?.klWrapper
  // Playback ignores an inactive wrapper. Readers still merge its group.
  const wrapperId = storedWrapper?.inactive === true
    ? ''
    : (typeof storedWrapper?.id === 'string' ? storedWrapper.id : '')

  // A Pethematicians sequence on its own is one sequence, not a wrapper item: today's path.
  if (isSinglePethematiciansAssignment(contentIds)) return { kind: 'today' }

  if (wrapperId) {
    return planWrapperPlay({
      assignmentId,
      assignmentState,
      contentIds,
      wrapperId,
      agent,
      timeoutMs,
    })
  }

  // A string is the trunk shape. Today's player reads it. An array uses the branch below.
  if (typeof assignmentState?.content === 'string') return { kind: 'today' }

  if (contentIds.length !== 1) return { kind: 'today' }
  return planSingleSequencePlay({
    assignmentId,
    sequenceId: contentIds[0],
    agent,
    timeoutMs,
  })
}

async function planWrapperPlay({
  assignmentId,
  assignmentState,
  contentIds,
  wrapperId,
  agent,
  timeoutMs,
}) {
  let wrapperState = null
  try {
    wrapperState = await withTimeout(
      agent.state(wrapperId),
      timeoutMs,
      'KL wrapper document timed out',
    )
  } catch {
    return { kind: 'today' }
  }

  const docItems = normalizeSequenceItems(wrapperState?.items)
  const recorded = normalizeSequenceItems(assignmentState?.klWrapper?.items)
  if (!sameIdList(docItems, recorded) || !sameIdList(docItems, contentIds)) {
    return { kind: 'today' }
  }

  // Re-check the deny list. A leaf denied after the wrapper was saved stays on today's path.
  // The stored klWrapper field is left as it is so dashboard merge can still read it.
  let verdict = 'unknown'
  try {
    verdict = await classifyLeaves(contentIds, { agent, timeoutMs })
  } catch {
    verdict = 'unknown'
  }
  if (verdict !== 'kl') return { kind: 'today' }

  try {
    if (await legacyProgressBeatsWrapper(agent, assignmentId, contentIds, wrapperId, timeoutMs)) {
      return { kind: 'today' }
    }
    await seedExistingKlProgress(agent, assignmentId, wrapperId, docItems, timeoutMs)
  } catch {
    return { kind: 'today' }
  }

  return {
    kind: 'kl',
    playableId: klPlayerUrl(wrapperId),
  }
}

async function legacyProgressBeatsWrapper(agent, assignmentId, contentIds, wrapperId, timeoutMs) {
  const wrapperPerf = await withTimeout(
    agent.state(leafPerformancePath(assignmentId, wrapperId)),
    timeoutMs,
    'KL wrapper progress timed out',
  )
  if (itemInfoHasRealCell(wrapperPerf)) return false

  const settled = await Promise.all(contentIds.map(async (contentId) => {
    try {
      const legacy = await withTimeout(
        agent.state(leafPerformancePath(assignmentId, contentId)),
        timeoutMs,
        'Legacy assignment progress timed out',
      )
      return { real: itemInfoHasRealCell(legacy) }
    } catch (error) {
      return { error }
    }
  }))
  for (const result of settled) {
    if ('error' in result) throw result.error
    if (result.real) return true
  }
  return false
}

async function planSingleSequencePlay({ assignmentId, sequenceId, agent, timeoutMs }) {
  if (!sequenceId) return { kind: 'today' }
  // A raw URL, or any other non-UUID in an array, keeps today's path.
  // Play does not wrap it; only a stored klWrapper does that.
  if (!isUuid(sequenceId)) return { kind: 'today' }
  if (GEN_AI_SEQUENCES[sequenceId]) return { kind: 'today' }

  let meta = null
  let contentState = null
  try {
    ;[meta, contentState] = await Promise.all([
      withTimeout(agent.metadata(sequenceId), timeoutMs, 'Sequence metadata timed out'),
      withTimeout(agent.state(sequenceId), timeoutMs, 'Sequence state timed out'),
    ])
  } catch {
    return { kind: 'today' }
  }

  if (meta?.domain === KL_SEQUENCE_PLAYER_HOST) return { kind: 'today' }
  if (!isSequenceActiveType(meta?.active_type)) return { kind: 'today' }
  if (usesForeignPlayer(contentState)) return { kind: 'today' }
  if (!isKlPlayableShape(contentState)) return { kind: 'today' }

  const leaves = sequenceLeaves(contentState)
  let verdict = 'unknown'
  try {
    verdict = await classifyLeaves(leaves, { agent, timeoutMs })
  } catch {
    verdict = 'unknown'
  }
  if (verdict !== 'kl') return { kind: 'today' }

  try {
    await seedExistingKlProgress(agent, assignmentId, sequenceId, leaves, timeoutMs)
  } catch {
    return { kind: 'today' }
  }

  return {
    kind: 'kl',
    playableId: klPlayerUrl(sequenceId),
  }
}

function referencePlayerHost(state) {
  const player = state?.reference?.player
  if (typeof player !== 'string') return ''
  const raw = player.trim()
  if (!raw) return ''
  try {
    const url = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`)
    return url.host.replace(/\.$/, '').toLowerCase()
  } catch {
    return ''
  }
}

/** Today's path when reference.player is set to a host other than Know Learning. */
function usesForeignPlayer(state) {
  const player = state?.reference?.player
  if (typeof player !== 'string' || !player.trim()) return false
  return referencePlayerHost(state) !== KL_SEQUENCE_PLAYER_HOST.toLowerCase()
}

/**
 * Know Learning creates every key on first init (`if (!data.itemInfo)`), and
 * backfills missing keys only when `sequenceXapiLogMirror` is already set.
 * A missing itemInfo is left alone. An existing one gets only the missing
 * `{i}/{id}` keys. `activeItemIndex: null` stays null (the finished screen).
 * A non-integer or out-of-range index is clamped to 0.
 *
 * @returns {boolean} whether the document changed
 */
function fillExistingKlItemInfo(state, itemIds) {
  if (!state || typeof state !== 'object') return false
  const info = state.itemInfo
  if (!info || typeof info !== 'object' || Array.isArray(info)) return false

  const ids = itemIds || []
  for (let index = 0; index < ids.length; index += 1) {
    const itemId = ids[index]
    if (!itemId) continue
    const key = `${index}/${itemId}`
    if (!info[key] || typeof info[key] !== 'object') {
      info[key] = { time: 0, correct: null }
    }
  }

  if (state.activeItemIndex !== null && state.activeItemIndex !== undefined) {
    const index = state.activeItemIndex
    const inRange = Number.isInteger(index) && index >= 0 && index < ids.length
    if (!inRange) state.activeItemIndex = 0
  }

  if (state.sequenceXapiLogMirror == null) state.sequenceXapiLogMirror = []
  return true
}

async function seedExistingKlProgress(agent, assignmentId, sequenceId, itemIds, timeoutMs) {
  const perf = await withTimeout(
    agent.state(leafPerformancePath(assignmentId, sequenceId)),
    timeoutMs,
    'Sequence performance timed out',
  )
  if (!fillExistingKlItemInfo(perf, itemIds)) return
  await withTimeout(agent.synced(), timeoutMs, 'Sequence performance sync timed out')
}
