import { normalizeAssignmentContent } from './assignment-content.js'
import { KL_PLAY_DECISION_TIMEOUT_MS } from './kl-assignment-play.js'
import { classifyLeaves, isSinglePethematiciansAssignment } from './kl-playability.js'
import {
  SEQUENCE_ACTIVE_TYPE,
  SEQUENCE_SYNC_TIMEOUT_MS,
  normalizeSequenceItems,
  serializeArraySequenceItems,
  withTimeout,
} from './sequence-items.js'

// One generated sequence per in-flight save. A second Save for the same
// assignment waits, then reuses the wrapper id the first save just created.
const wrapperFlightTail = new Map()
const wrapperSessionId = new Map()

export function resetAssignmentKlWrapperFlight() {
  wrapperFlightTail.clear()
  wrapperSessionId.clear()
}

function keep() {
  return { keep: true }
}

/** Non-empty opts.name, else the assignment name passed by sync, else a label KL can show. */
function wrapperDocName(opts) {
  const fromOpts = typeof opts?.name === 'string' ? opts.name.trim() : ''
  if (fromOpts) return fromOpts
  const fromAssignment = typeof opts?.assignmentName === 'string' ? opts.assignmentName.trim() : ''
  if (fromAssignment) return fromAssignment
  return 'Assignment'
}

function inactiveExisting(existing) {
  const id = typeof existing?.id === 'string' ? existing.id : ''
  if (!id) return null
  const items = Array.isArray(existing?.items) ? [...existing.items] : []
  return { id, items, inactive: true }
}

function enqueueWrapper(assignmentId, task) {
  const previous = wrapperFlightTail.get(assignmentId) || Promise.resolve()
  const run = previous.then(() => task(), () => task())
  const settled = run.then((result) => {
    if (result?.id) wrapperSessionId.set(assignmentId, result.id)
    return result
  })
  wrapperFlightTail.set(assignmentId, settled.then(() => {}, () => {}))
  return settled
}

/**
 * Create or patch the hidden item-list sequence, or decide to drop / keep
 * `klWrapper`. Does not write the assignment.
 *
 * A non teacher-to-student save returns `{ keep: true }` before any await.
 * 'kl' ensures the wrapper doc. 'fallback' marks an existing wrapper inactive
 * (id and items stay so readers still merge its group). 'unknown', a reuse
 * timeout, or a doc we must not touch returns `{ keep: true }`.
 *
 * @returns {{ id: string, items: string[], inactive?: boolean } | { keep: true } | null | Promise}
 */
export function prepareAssignmentKlWrapper(assignmentId, contentIds, existingKlWrapper, opts = {}) {
  if (!assignmentId || opts.teacherToStudent !== true) {
    return keep()
  }
  return enqueueWrapper(assignmentId, () => prepareAssignmentKlWrapperNow(
    assignmentId,
    contentIds,
    existingKlWrapper,
    opts,
  ))
}

const KL_WRAPPER_DECISION_TIMEOUT = 'KL play decision timed out'

function wrapperDecisionTimeoutMs(opts) {
  const requested = opts?.decisionTimeoutMs
  if (Number.isFinite(requested) && requested > 0) return requested
  return KL_PLAY_DECISION_TIMEOUT_MS
}

async function prepareAssignmentKlWrapperNow(assignmentId, contentIds, existingKlWrapper, opts) {
  try {
    return await withTimeout(
      decideAssignmentKlWrapper(assignmentId, contentIds, existingKlWrapper, opts),
      wrapperDecisionTimeoutMs(opts),
      KL_WRAPPER_DECISION_TIMEOUT,
    )
  } catch (error) {
    if (error instanceof Error && error.message === KL_WRAPPER_DECISION_TIMEOUT) return keep()
    throw error
  }
}

async function decideAssignmentKlWrapper(assignmentId, contentIds, existingKlWrapper, opts) {
  const meta = await withTimeout(
    Agent.metadata(assignmentId),
    SEQUENCE_SYNC_TIMEOUT_MS,
    'Assignment wrapper metadata timed out',
  )
  const env = await Agent.environment()
  const user = env?.auth?.user
  if (!user || meta?.owner !== user) return keep()

  const leafIds = normalizeAssignmentContent(contentIds)
  if (isSinglePethematiciansAssignment(leafIds)) return inactiveExisting(existingKlWrapper)
  const verdict = await classifyLeaves(leafIds)
  if (verdict === 'unknown') return keep()
  if (verdict !== 'kl') return inactiveExisting(existingKlWrapper)

  const name = wrapperDocName(opts)
  const items = serializeArraySequenceItems(leafIds)
  const hintedId = wrapperSessionId.get(assignmentId)
    || (typeof existingKlWrapper?.id === 'string' ? existingKlWrapper.id : '')

  let wrapperId = ''
  if (hintedId) {
    const reused = await reuseWrapper(hintedId, assignmentId, user, items, name)
    if (reused.keep) return keep()
    if (reused.id) wrapperId = reused.id
  }
  if (!wrapperId) {
    wrapperId = await Agent.create({
      name,
      active_type: SEQUENCE_ACTIVE_TYPE,
      active: {
        name,
        assignmentWrapper: assignmentId,
        items,
      },
    })
  }

  await withTimeout(
    Agent.synced(),
    SEQUENCE_SYNC_TIMEOUT_MS,
    'Assignment wrapper sync timed out',
  )
  return { id: wrapperId, items: [...leafIds] }
}

async function reuseWrapper(wrapperId, assignmentId, user, items, name) {
  let meta = null
  try {
    meta = await withTimeout(
      Agent.metadata(wrapperId),
      SEQUENCE_SYNC_TIMEOUT_MS,
      'Assignment wrapper metadata timed out',
    )
  } catch {
    return keep()
  }
  // A new doc only when metadata proves this wrapper is not ours.
  if (meta?.owner !== user) return { create: true }

  let wrapper = null
  try {
    wrapper = await withTimeout(
      Agent.state(wrapperId),
      SEQUENCE_SYNC_TIMEOUT_MS,
      'Assignment wrapper state timed out',
    )
  } catch {
    return keep()
  }
  if (!wrapper || typeof wrapper !== 'object') return keep()

  wrapper.items = items
  wrapper.name = name
  wrapper.assignmentWrapper = assignmentId
  if (wrapper.reference && typeof wrapper.reference === 'object') {
    delete wrapper.reference.player
    if (Object.keys(wrapper.reference).length === 0) delete wrapper.reference
  }
  return { id: wrapperId }
}

/**
 * Set, deactivate, delete, or leave `klWrapper`.
 * `{ keep: true }` does not change the field. `inactive` keeps id and items.
 * A later active prepare replaces the field and clears `inactive`.
 */
export function applyAssignmentKlWrapper(assignmentState, prepared) {
  if (!assignmentState || typeof assignmentState !== 'object') return null
  if (prepared?.keep) return assignmentState.klWrapper ?? null
  if (prepared?.inactive) {
    const id = typeof prepared.id === 'string' ? prepared.id : ''
    if (!id) return assignmentState.klWrapper ?? null
    const items = Array.isArray(prepared.items) ? [...prepared.items] : []
    assignmentState.klWrapper = { id, items, inactive: true }
    return assignmentState.klWrapper
  }
  if (!prepared || typeof prepared.id !== 'string' || !prepared.id) {
    if (Object.prototype.hasOwnProperty.call(assignmentState, 'klWrapper')) {
      delete assignmentState.klWrapper
    }
    return null
  }
  const items = Array.isArray(prepared.items) ? [...prepared.items] : []
  assignmentState.klWrapper = { id: prepared.id, items }
  return assignmentState.klWrapper
}

/**
 * Prepare, then apply. A missing assignment state returns the current field
 * and does not await.
 */
export function syncAssignmentKlWrapper(assignmentId, assignmentState, opts = {}) {
  if (!assignmentState || typeof assignmentState !== 'object') {
    return assignmentState?.klWrapper ?? null
  }
  return syncAssignmentKlWrapperNow(assignmentId, assignmentState, opts)
}

async function syncAssignmentKlWrapperNow(assignmentId, assignmentState, opts) {
  let prepared = keep()
  try {
    prepared = await prepareAssignmentKlWrapper(
      assignmentId,
      assignmentState.content,
      assignmentState.klWrapper,
      { ...opts, assignmentName: assignmentState.name },
    )
  } catch {
    prepared = keep()
  }
  return applyAssignmentKlWrapper(assignmentState, prepared)
}

/**
 * Live-monitoring group for a stored wrapper.
 * Included whenever `klWrapper.id` is set, including a stale item list.
 * Leaf ids are `klWrapper.items`.
 */
export function klWrapperDashboardGroup(assignmentState) {
  const wrapper = assignmentState?.klWrapper
  const sequenceId = typeof wrapper?.id === 'string' ? wrapper.id : ''
  if (!sequenceId) return null
  const itemIds = normalizeSequenceItems(wrapper.items)
  return { sequenceId, itemIds }
}
