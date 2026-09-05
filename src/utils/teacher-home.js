import { ASSIGNMENT_STATUS, effectiveAssignmentStatus } from './assignment-status.js'

export const LEARN_ABOUT_PILA_URL = 'https://pilaproject.org'
export const HOME_LAYOUT_KEY = 'pila-home-layout'
export const HOME_ACTIVITY_SEQUENCES_KEY = 'pila-home-activity-sequences'
export const CURRENT_ASSIGNMENTS_PREVIEW_LIMIT = 3
export const RECENT_ACTIVITY_LIMIT = 4
/** Overscan past the 4 visible cards so a new item can still rank in. */
export const ACTIVITY_PREFETCH_LIMIT = 8
export const ACTIVITY_FETCH_CONCURRENCY = 4
export const ACTIVITY_IDLE_TIMEOUT_MS = 1200

export const DEFAULT_HOME_LAYOUT = {
  quickLinks: true,
  recentActivity: true,
  currentAssignments: true,
}

export function parseHomeLayout(raw) {
  const base = { ...DEFAULT_HOME_LAYOUT }
  if (!raw || typeof raw !== 'object') return base
  return {
    quickLinks: raw.quickLinks !== false,
    recentActivity: raw.recentActivity !== false,
    currentAssignments: raw.currentAssignments !== false,
  }
}

export function greetingFirstName(fullName, fallback = '') {
  const first = String(fullName || '').trim().split(/\s+/)[0]
  return first || fallback
}

export function formatWelcomeBack(template, name) {
  return String(template || '').replace('{name}', name)
}

/**
 * Most recently updated assignment ids for the home preview table.
 * @param {string[]} ids
 * @param {(id: string) => number} getUpdated
 * @param {number} [limit]
 */
export function currentAssignmentPreview(ids, getUpdated, limit = CURRENT_ASSIGNMENTS_PREVIEW_LIMIT) {
  return [...(ids || [])]
    .map(id => ({ id, updated: Number(getUpdated?.(id)) || 0 }))
    .sort((a, b) => b.updated - a.updated)
    .slice(0, limit)
}

export function relativeTimeFromNow(ts, now, t) {
  if (!ts) return ''
  const delta = now - ts
  const mins = Math.max(1, Math.round(delta / 60000))
  if (mins < 60) return t('n-minutes-ago').replace('{n}', String(mins))
  const hours = Math.round(mins / 60)
  if (hours < 24) return t('n-hours-ago').replace('{n}', String(hours))
  const days = Math.round(hours / 24)
  return t('n-days-ago').replace('{n}', String(days))
}

export const ACTIVITY_KIND = {
  CREATED_ASSIGNMENT: 'created-assignment',
  UPDATED_ASSIGNMENT: 'updated-assignment',
  CREATED_GROUP: 'created-group',
  CREATED_SEQUENCE: 'created-sequence',
  DEADLINE_PASSED: 'deadline-passed',
}

/** Lower wins when timestamps tie. */
export const ACTIVITY_KIND_PRIORITY = {
  [ACTIVITY_KIND.DEADLINE_PASSED]: 0,
  [ACTIVITY_KIND.CREATED_ASSIGNMENT]: 1,
  [ACTIVITY_KIND.CREATED_GROUP]: 2,
  [ACTIVITY_KIND.CREATED_SEQUENCE]: 3,
  [ACTIVITY_KIND.UPDATED_ASSIGNMENT]: 4,
}

/** Edits within this window of create still count as "created", not "updated". */
export const ASSIGNMENT_UPDATE_GRACE_MS = 2 * 60 * 1000

const MAX_TIMEOUT_MS = 2147483647

export function toEpochMs(value) {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) && ts > 0 ? ts : 0
}

/**
 * Due instant from assignment state. dueTime defaults to 00:00 (product currently
 * always writes that); YYYY-MM-DD is interpreted in local time.
 */
export function getAssignmentDueAt(data) {
  if (!data?.dueDate) return 0
  const dateStr = String(data.dueDate)
  if (dateStr.includes('T')) return toEpochMs(dateStr)
  const rawTime = data.dueTime || '00:00'
  const time = String(rawTime).length === 5 ? `${rawTime}:00` : String(rawTime)
  const dt = new Date(`${dateStr}T${time}`)
  return Number.isNaN(dt.getTime()) ? toEpochMs(data.dueDate) : dt.getTime()
}

export function isSequenceMetadata(meta) {
  return String(meta?.active_type || '').includes('type=sequence')
}

/**
 * Next future due instant among published assignments (for a client-side timer).
 * @param {Array<{ dueAt?: number, dueDate?: string, dueTime?: string, status?: string }>} assignments
 */
export function nextAssignmentDueAt(assignments, now = Date.now()) {
  let next = null
  for (const row of assignments || []) {
    if (row?.status !== ASSIGNMENT_STATUS.PUBLISHED) continue
    const dueAt = toEpochMs(row.dueAt) || getAssignmentDueAt(row)
    if (!dueAt || dueAt <= now) continue
    if (next === null || dueAt < next) next = dueAt
  }
  return next
}

export function delayUntil(at, now = Date.now()) {
  if (!at || at <= now) return null
  return Math.min(at - now, MAX_TIMEOUT_MS)
}

export function activitySequencesStorageKey(userId) {
  return userId ? `${HOME_ACTIVITY_SEQUENCES_KEY}:${userId}` : HOME_ACTIVITY_SEQUENCES_KEY
}

export function parseActivitySequenceCache(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const row of raw) {
    if (!row || typeof row.id !== 'string' || !row.id) continue
    const created = toEpochMs(row.created) || toEpochMs(row.updated)
    if (!created) continue
    out.push({
      id: row.id,
      name: typeof row.name === 'string' ? row.name : '',
      created,
    })
  }
  return out
}

export function readLocalJson(key, parse = v => v) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return parse(null)
    return parse(JSON.parse(raw))
  } catch {
    return parse(null)
  }
}

export function writeLocalJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* quota / private mode */ }
}

export function newestByCreated(rows, limit = ACTIVITY_PREFETCH_LIMIT) {
  return [...(rows || [])]
    .sort((a, b) => (toEpochMs(b.created) || toEpochMs(b.updated)) - (toEpochMs(a.created) || toEpochMs(a.updated)))
    .slice(0, limit)
}

export function scheduleIdle(fn, timeout = ACTIVITY_IDLE_TIMEOUT_MS) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(() => fn(), { timeout })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(fn, 0)
  return () => clearTimeout(id)
}

export async function mapPool(items, concurrency, fn) {
  const list = [...(items || [])]
  if (!list.length) return []
  const n = Math.max(1, Number(concurrency) || 1)
  const out = new Array(list.length)
  let next = 0
  async function worker() {
    while (next < list.length) {
      const i = next++
      out[i] = await fn(list[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, () => worker()))
  return out
}

function assignmentStatus(row, now) {
  if (row?.status) return row.status
  return effectiveAssignmentStatus(row, {
    hasAssignedGroups: (row?.groupCount || 0) > 0,
    now,
  })
}

function pushCandidate(list, item) {
  if (!item?.id || !item.at) return
  list.push(item)
}

/**
 * Derived recency feed — not an append-only activity log.
 * Merges current snapshots of assignments, class groups, sequences, and
 * passed assignment deadlines, then takes the latest `limit` items.
 */
export function buildRecentActivity({
  assignments = [],
  groups = [],
  sequences = [],
  now = Date.now(),
  t,
  limit = RECENT_ACTIVITY_LIMIT,
} = {}) {
  if (!t) throw new Error('buildRecentActivity requires t()')
  const candidates = []

  for (const row of assignments || []) {
    if (!row?.id) continue
    const name = row.name || t('untitled')
    const created = toEpochMs(row.created)
    const updated = toEpochMs(row.updated)
    const dueAt = toEpochMs(row.dueAt) || getAssignmentDueAt(row)
    const status = assignmentStatus(row, now)

    if (updated && created && (updated - created > ASSIGNMENT_UPDATE_GRACE_MS)) {
      pushCandidate(candidates, {
        id: row.id,
        kind: ACTIVITY_KIND.UPDATED_ASSIGNMENT,
        at: updated,
        icon: 'upload',
        title: t('updated-assignment'),
        meta: name,
      })
    } else {
      pushCandidate(candidates, {
        id: row.id,
        kind: ACTIVITY_KIND.CREATED_ASSIGNMENT,
        at: created || updated,
        icon: 'file-plus',
        title: t('created-assignment'),
        meta: name,
      })
    }

    if (dueAt && dueAt <= now && status === ASSIGNMENT_STATUS.PUBLISHED) {
      pushCandidate(candidates, {
        id: row.id,
        kind: ACTIVITY_KIND.DEADLINE_PASSED,
        at: dueAt,
        icon: 'calendar-clock',
        title: t('deadline-passed'),
        meta: name,
      })
    }
  }

  for (const group of groups || []) {
    pushCandidate(candidates, {
      id: group.id,
      kind: ACTIVITY_KIND.CREATED_GROUP,
      at: toEpochMs(group.created) || toEpochMs(group.updated),
      icon: 'users',
      title: t('created-group'),
      meta: group.name || t('untitled'),
    })
  }

  for (const sequence of sequences || []) {
    pushCandidate(candidates, {
      id: sequence.id,
      kind: ACTIVITY_KIND.CREATED_SEQUENCE,
      at: toEpochMs(sequence.created) || toEpochMs(sequence.updated),
      icon: 'layers',
      title: t('created-sequence'),
      meta: sequence.name || t('untitled'),
    })
  }

  candidates.sort((a, b) => {
    if (b.at !== a.at) return b.at - a.at
    const pa = ACTIVITY_KIND_PRIORITY[a.kind] ?? 99
    const pb = ACTIVITY_KIND_PRIORITY[b.kind] ?? 99
    if (pa !== pb) return pa - pb
    return String(a.meta).localeCompare(String(b.meta))
  })

  return candidates.slice(0, limit).map(({ id, kind, icon, title, meta, at }) => ({
    id,
    kind,
    icon,
    title,
    meta,
    when: relativeTimeFromNow(at, now, t),
  }))
}
