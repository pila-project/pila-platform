import { ASSIGNMENT_STATUS, effectiveAssignmentStatus } from './assignment-status.js'

export const LEARN_ABOUT_PILA_URL = 'https://pilaproject.org'
export const HOME_BANNER_DISMISSED_KEY = 'pila-home-banner-dismissed'
export const HOME_LAYOUT_KEY = 'pila-home-layout'
export const CURRENT_ASSIGNMENTS_PREVIEW_LIMIT = 3
export const RECENT_ACTIVITY_LIMIT = 4

/** Banner shows on every visit until the user presses X (persisted). */
export function workspaceBannerVisible({ dismissed = false } = {}) {
  return !dismissed
}

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

/**
 * Recent-activity cards from assignment snapshots (UIUX-121: based on recent actions).
 * @param {Array<{ id: string, updated: number, data?: object, groupCount?: number }>} rows
 */
export function buildRecentActivity(rows, { t, now = Date.now() } = {}) {
  if (!t) throw new Error('buildRecentActivity requires t()')
  const items = []
  for (const row of rows || []) {
    const data = row.data
    if (!data) continue
    const status = effectiveAssignmentStatus(data, {
      hasAssignedGroups: (row.groupCount || 0) > 0,
      now,
    })
    const when = relativeTimeFromNow(row.updated, now, t)
    const name = data.name || t('untitled')
    if (status === ASSIGNMENT_STATUS.PUBLISHED) {
      items.push({
        id: row.id,
        kind: 'published',
        icon: 'file-text',
        title: `${t('published-assignment')}:`,
        meta: name,
        when,
      })
    } else {
      items.push({
        id: row.id,
        kind: 'updated',
        icon: 'upload',
        title: `${t('updated-assignment')}:`,
        meta: name,
        when,
      })
    }
  }
  return items.slice(0, 4)
}
