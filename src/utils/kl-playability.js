import { validate as isUuid } from 'uuid'
import { GEN_AI_SEQUENCES, PETHEMATICIANS_SINGLE_ITEM_IDS } from './constants.js'
import {
  SEQUENCE_SYNC_TIMEOUT_MS,
  isSequenceActiveType,
  normalizeSequenceItems,
  withTimeout,
} from './sequence-items.js'

/**
 * Apps with their own custom PILA teacher dashboard. Content from these hosts stays on
 * the original player. Their dashboards read the student's app data under the
 * assignment, but Know Learning's sequence player saves each item's data under
 * `sequence-{id}-item-{i}/`, so the dashboard would show no students. Verified live
 * for Datawise and Betty's Brain (2026-10-19). RCT has the same kind of dashboard.
 */
export const CUSTOM_DASHBOARD_APP_HOSTS = Object.freeze({
  'datawise.accingo.co': 'Datawise',
  'bettysbrain.knowlearning.systems': "Betty's Brain",
  'rct-problem-creator.pilaproject.org': 'RCT',
})

/** Why a leaf cannot play inside Know Learning's sequence player. */
export const KL_DENY_RULES = Object.freeze([
  'custom-dashboard',
  'nested-sequence',
  'not-embeddable',
])

/**
 * Leaf ids for a sequence document.
 * A missing `items` field falls back to `content` (assignment-shaped state).
 */
export function sequenceLeaves(state) {
  if (!state || typeof state !== 'object') return []
  const raw = state.items == null ? state.content : state.items
  return normalizeSequenceItems(raw)
}

/** Know Learning's player requires a non-empty array of `{ id: string }`. */
export function isKlPlayableShape(state) {
  const items = state?.items
  if (!Array.isArray(items) || items.length === 0) return false
  return items.every((entry) => (
    !!entry
    && typeof entry === 'object'
    && !Array.isArray(entry)
    && typeof entry.id === 'string'
    && entry.id.length > 0
  ))
}

function leafList(ids) {
  if (!Array.isArray(ids)) return []
  return ids.filter((id) => typeof id === 'string' && id)
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

/** Host key: lowercase, no trailing dot, no leading www. */
function normalizedHost(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const url = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`)
    return url.hostname.replace(/\.$/, '').replace(/^www\./i, '').toLowerCase()
  } catch {
    return ''
  }
}

function denied(rule) {
  return { verdict: 'deny', rule }
}

function allowed() {
  return { verdict: 'kl', rule: null }
}

function unknown() {
  return { verdict: 'unknown', rule: null }
}

// The leaf id (a URL), its domain, an embed's wrapped URL, or its reference dashboard.
function isCustomDashboardApp(...values) {
  return values.some((value) => Object.hasOwn(CUSTOM_DASHBOARD_APP_HOSTS, normalizedHost(value)))
}

// Emma's structural rule: one sequence, or several items, never a sequence inside the
// wrapper. A Pethematicians sequence has one item and counts as one item (UIUX-294).
function nestedSequenceDenied(id, activeType) {
  if (PETHEMATICIANS_SINGLE_ITEM_IDS.has(id)) return false
  return isSequenceActiveType(activeType) || Boolean(GEN_AI_SEQUENCES[id])
}

/** True when the only content is a Pethematicians sequence. It is never wrapped and plays as today. */
export function isSinglePethematiciansAssignment(contentIds) {
  return Array.isArray(contentIds)
    && contentIds.length === 1
    && PETHEMATICIANS_SINGLE_ITEM_IDS.has(contentIds[0])
}

/**
 * Classify assignment or sequence leaves for Know Learning's player.
 * Default is 'kl'. A leaf is denied only by KL_DENY_RULES.
 * 'kl' — every leaf is allowed.
 * 'fallback' — at least one leaf must stay on today's player. Deny wins over allow.
 * 'unknown' — a read threw or timed out, and no leaf was denied.
 * Deny plus a sibling timeout is 'fallback'. A lone failure, with no deny, stays 'unknown'.
 *
 * @param {string[]} ids
 * @param {{ timeoutMs?: number, agent?: object }} [opts]
 * @returns {Promise<'kl'|'fallback'|'unknown'>}
 */
export function classifyLeaves(ids, opts = {}) {
  const list = leafList(ids)
  if (!list.length) return Promise.resolve('fallback')
  return classifyLeafList(list, opts)
}

async function classifyLeafList(list, opts) {
  const results = await Promise.all(list.map((id) => classifyLeafDetailed(id, opts)))
  if (results.some((result) => result.verdict === 'deny')) return 'fallback'
  if (results.some((result) => result.verdict === 'unknown')) return 'unknown'
  if (results.every((result) => result.verdict === 'kl')) return 'kl'
  return 'fallback'
}

/**
 * One leaf. `rule` is a KL_DENY_RULES entry when verdict is 'deny', otherwise null.
 * A non-UUID http(s) URL is classified from the URL alone. Anything else that is
 * not a UUID is not embeddable. A UUID is read, then denied only by the rules below.
 *
 * @returns {Promise<{ verdict: 'kl'|'deny'|'unknown', rule: string|null }>}
 */
export async function classifyLeafDetailed(id, opts = {}) {
  if (!isUuid(id)) {
    // Not an embeddable id. Know Learning hosts a UUID or an http(s) URL.
    if (!isHttpUrl(id)) return denied('not-embeddable')
    if (isCustomDashboardApp(id)) return denied('custom-dashboard')
    return allowed()
  }

  const agent = opts.agent || globalThis.Agent
  const timeoutMs = opts.timeoutMs ?? SEQUENCE_SYNC_TIMEOUT_MS
  let meta = null
  let state = null
  try {
    meta = await withTimeout(
      agent.metadata(id),
      timeoutMs,
      'KL playability metadata timed out',
    )
    state = await withTimeout(
      agent.state(id),
      timeoutMs,
      'KL playability state timed out',
    )
  } catch {
    return unknown()
  }

  if (isCustomDashboardApp(meta?.domain, state?.id, state?.reference?.dashboard)) {
    return denied('custom-dashboard')
  }
  if (nestedSequenceDenied(id, meta?.active_type)) return denied('nested-sequence')
  return allowed()
}
