/**
 * Teacher assignment publication lifecycle (client-side, no backend cron).
 *
 * - effectiveAssignmentStatus: what the product means (time-aware).
 * - tryPromoteScheduledAssignment: teacher-owned idempotent write Scheduled → Published when due.
 * Students must not call tryPromote (owner write / safety).
 */

export const ASSIGNMENT_STATUS = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  SCHEDULED: 'Scheduled',
}

/**
 * @param {{ scheduledDate?: string|null, scheduledTime?: string|null }} data
 * @returns {Date|null}
 */
export function getPublicationDateTime(data) {
  if (!data?.scheduledDate) return null
  const rawTime = data.scheduledTime || '00:00'
  // Accept "HH:mm" or "HH:mm:ss"; Date parse is local for YYYY-MM-DDTHH:mm
  const time = String(rawTime).length === 5 ? `${rawTime}:00` : String(rawTime)
  const dt = new Date(`${data.scheduledDate}T${time}`)
  if (!Number.isNaN(dt.getTime())) return dt
  const fallback = new Date(data.scheduledDate)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

/**
 * Product-facing status. Scheduled past due reads as Published without requiring a write.
 *
 * @param {{ status?: string|null, scheduledDate?: string|null, scheduledTime?: string|null }|null|undefined} data
 * @param {{ hasAssignedGroups?: boolean, now?: number }} [opts]
 */
export function effectiveAssignmentStatus(data, opts = {}) {
  const now = opts.now ?? Date.now()
  const hasAssignedGroups = !!opts.hasAssignedGroups
  const raw = data?.status || null

  if (raw === ASSIGNMENT_STATUS.DRAFT) return ASSIGNMENT_STATUS.DRAFT
  if (raw === ASSIGNMENT_STATUS.PUBLISHED) return ASSIGNMENT_STATUS.PUBLISHED

  if (raw === ASSIGNMENT_STATUS.SCHEDULED) {
    const at = getPublicationDateTime(data)
    if (at && at.getTime() <= now) return ASSIGNMENT_STATUS.PUBLISHED
    return ASSIGNMENT_STATUS.SCHEDULED
  }

  // Legacy / missing status: schedule fields or group assign
  const at = getPublicationDateTime(data)
  if (at) {
    if (at.getTime() <= now) return ASSIGNMENT_STATUS.PUBLISHED
    return ASSIGNMENT_STATUS.SCHEDULED
  }
  if (hasAssignedGroups) return ASSIGNMENT_STATUS.PUBLISHED
  return ASSIGNMENT_STATUS.DRAFT
}

/**
 * Once effectively Published, teacher must not revert to Draft.
 */
export function isPublicationLocked(data, opts = {}) {
  return effectiveAssignmentStatus(data, opts) === ASSIGNMENT_STATUS.PUBLISHED
}

/**
 * Whether a stored Scheduled item is due for a promote write.
 */
export function shouldPromoteScheduled(data, now = Date.now()) {
  if (!data || data.status !== ASSIGNMENT_STATUS.SCHEDULED) return false
  const at = getPublicationDateTime(data)
  return !!(at && at.getTime() <= now)
}

/**
 * Next future publish instant among assignment data snapshots (for timers).
 * @param {Array<{ status?: string, scheduledDate?: string, scheduledTime?: string }>} items
 * @param {number} [now]
 * @returns {number|null} epoch ms
 */
export function nextScheduledPublishAt(items, now = Date.now()) {
  let next = null
  for (const data of items || []) {
    if (data?.status !== ASSIGNMENT_STATUS.SCHEDULED) continue
    const at = getPublicationDateTime(data)
    if (!at) continue
    const t = at.getTime()
    if (t > now && (next === null || t < next)) next = t
  }
  return next
}

/**
 * Teacher-only: if assignment is Scheduled and due, set status Published (idempotent).
 * Mutates Agent state document; does not re-assign groups or re-fire xAPI.
 *
 * @param {string} id
 * @param {{ agent?: { state: Function, synced?: Function }, now?: number }} [opts]
 * @returns {Promise<{ promoted: boolean, reason?: string, status?: string }>}
 */
export async function tryPromoteScheduledAssignment(id, opts = {}) {
  const agent = opts.agent ?? (typeof Agent !== 'undefined' ? Agent : null)
  const now = opts.now ?? Date.now()

  if (!id) return { promoted: false, reason: 'no-id' }
  if (!agent?.state) return { promoted: false, reason: 'no-agent' }

  let state
  try {
    state = await agent.state(id)
  } catch {
    return { promoted: false, reason: 'load-failed' }
  }
  if (!state) return { promoted: false, reason: 'missing' }

  if (state.status === ASSIGNMENT_STATUS.PUBLISHED) {
    return { promoted: false, reason: 'already-published', status: ASSIGNMENT_STATUS.PUBLISHED }
  }
  if (state.status !== ASSIGNMENT_STATUS.SCHEDULED) {
    return { promoted: false, reason: 'not-scheduled', status: state.status || null }
  }

  const at = getPublicationDateTime(state)
  if (!at) return { promoted: false, reason: 'no-schedule' }
  if (at.getTime() > now) return { promoted: false, reason: 'not-due' }

  state.status = ASSIGNMENT_STATUS.PUBLISHED
  if (!state.publishedAt) {
    state.publishedAt = new Date(now).toISOString()
  }

  try {
    if (typeof agent.synced === 'function') await agent.synced()
  } catch {
    // Status already mutated on the reactive doc; sync may retry later
  }

  return { promoted: true, status: ASSIGNMENT_STATUS.PUBLISHED }
}

/**
 * Promote all due Scheduled ids; returns list of promoted ids.
 */
export async function promoteDueScheduledAssignments(ids, opts = {}) {
  const promotedIds = []
  for (const id of ids || []) {
    const result = await tryPromoteScheduledAssignment(id, opts)
    if (result.promoted) promotedIds.push(id)
  }
  return promotedIds
}
