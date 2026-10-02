/**
 * Shared assignment dashboard classification (UIUX-231 + UIUX-237).
 *
 * App-specific (231): Betty, Datawise / reference.dashboard, or a Candli
 * programming sequence (trunk allowlist + UIUX-288).
 * Live-monitoring (237): any non-Datawise content (not Datawise-only).
 * Mixed Datawise + other → BOTH app and live. Betty-only → BOTH (not mutex).
 * Candli programming sequences use the app card, not the competency card.
 */

import { candliGamesForSequenceItems } from '../candli-games.js'
import { CANDLI_SEQUENCES, GEN_AI_SEQUENCES } from './constants.js'
import { normalizeAssignmentContent } from './assignment-content.js'
import { normalizeSequenceItems } from './sequence-items.js'

export const BETTY_PLAYER_PREFIX = 'https://bettysbrain.knowlearning.systems/'
export const DATAWISE_DOMAIN = 'datawise.accingo.co'
export const DATAWISE_DASHBOARD_URL = 'https://datawise.accingo.co/dashboard'
export const TEACHER_TO_STUDENT = 'teacher-to-student'

/** Cap nested Agent.state probes when hunting a Betty player URL. */
const MAX_NESTED_BETTY_PROBES = 16

/**
 * Trunk `dashboard/index.vue` allowlist. These open
 * pila.cand.li `?dashboard&dashboard-config=`, not the competency dashboard.
 * The two UIUX-288 expert sequences are included. Their direct children
 * (and one nested sequence level) use the same dashboard.
 */
export const CANDLI_PROGRAMMING_CONTENT_IDS = [
  // '881f5110-a910-11f0-92ae-3f96e8a36c18'
  'e6b4b836-c4b9-46b7-b4bd-6da86d4d6b21',
  '2711888d-177e-4284-aa35-304275a487c5',
  'bb1e41e0-082b-4488-b03e-1a3829094bce',
  '68175e10-b26c-11f1-b7bc-a54c511d7554',
  '67b6f920-b26d-11f1-b7bd-a54c511d7554',
]

/** Only the UIUX-288 sequences match assigned sub-items. Trunk ids stay exact. */
const CANDLI_PROGRAMMING_CHILD_ROOTS = [
  '68175e10-b26c-11f1-b7bc-a54c511d7554',
  '67b6f920-b26d-11f1-b7bd-a54c511d7554',
]

const MAX_PROGRAMMING_CHILD_PROBES = 32

let programmingChildIndex = null

export function clearCandliProgrammingChildCache() {
  programmingChildIndex = null
}

export function candliProgrammingDashboardUrl(configId) {
  return `https://pila.cand.li/pila.html?dashboard&dashboard-config=${configId}`
}

async function programmingChildIdSet(agent) {
  if (!programmingChildIndex) {
    programmingChildIndex = loadProgrammingChildIds(agent).catch((error) => {
      programmingChildIndex = null
      throw error
    })
  }
  return programmingChildIndex
}

async function loadProgrammingChildIds(agent) {
  const ids = new Set()
  let loaded = false
  for (const rootId of CANDLI_PROGRAMMING_CHILD_ROOTS) {
    let rootState = null
    try {
      rootState = await agent.state(rootId)
      loaded = true
    } catch {
      rootState = null
    }
    const children = normalizeSequenceItems(rootState?.items)
    let probes = 0
    for (const childId of children) {
      if (!childId || childId === rootId) continue
      ids.add(childId)
      if (probes >= MAX_PROGRAMMING_CHILD_PROBES) continue
      probes += 1
      try {
        const childState = await agent.state(childId)
        for (const nestedId of normalizeSequenceItems(childState?.items)) {
          if (nestedId && nestedId !== rootId) ids.add(nestedId)
        }
      } catch {
        /* a leaf with no state still counts */
      }
    }
  }
  if (!loaded) throw new Error('Candli programming child index unavailable')
  return ids
}

/** True for the trunk allowlist, the two expert sequences, and their sub-items. */
export async function isCandliProgrammingContent(contentId, agent = globalThis.Agent) {
  if (!contentId || typeof contentId !== 'string') return false
  if (CANDLI_PROGRAMMING_CONTENT_IDS.includes(contentId)) return true
  try {
    const children = await programmingChildIdSet(agent)
    return children.has(contentId)
  } catch {
    return false
  }
}

export function isBettyPlayerUrl(value) {
  return typeof value === 'string' && value.startsWith(BETTY_PLAYER_PREFIX)
}

/** Trunk/ui-dev label detector: content id contains "betty". */
export function idLooksLikeBetty(value) {
  return typeof value === 'string' && value.includes('betty')
}

export function bettyModuleIdFromUrl(url) {
  if (!isBettyPlayerUrl(url)) return null
  try {
    return new URL(url).pathname.split('/')[2] || null
  } catch {
    return null
  }
}

export function findBettyPlayerUrl(candidates) {
  for (const value of candidates || []) {
    if (isBettyPlayerUrl(value)) return value
  }
  return null
}

export function looksLikeBettyContent({ contentId, contentStateId, sequenceItemIds } = {}) {
  if (isBettyPlayerUrl(contentId) || idLooksLikeBetty(contentId)) return true
  if (isBettyPlayerUrl(contentStateId) || idLooksLikeBetty(contentStateId)) return true
  return (sequenceItemIds || []).some(id => isBettyPlayerUrl(id) || idLooksLikeBetty(id))
}

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

function isDatawiseHost(value) {
  return normalizedHost(value) === DATAWISE_DOMAIN
}

/**
 * Datawise's dashboard shell calls Agent.state(game) and requires that
 * document's appId. A sequence id has no appId, so the game is the Datawise
 * activity. A direct activity is already that id.
 */
export async function datawiseDashboardGameId(contentId, contentState) {
  if (!contentId) return null
  const ownUrl = await dashboardUrlForRecord(contentId, contentState)
  if (ownUrl === DATAWISE_DASHBOARD_URL) return contentId
  for (const itemId of normalizeSequenceItems(contentState?.items)) {
    if (!itemId || itemId === contentId) continue
    let itemState = null
    try {
      itemState = await Agent.state(itemId)
    } catch {
      itemState = null
    }
    const childUrl = await dashboardUrlForRecord(itemId, itemState)
    if (childUrl === DATAWISE_DASHBOARD_URL) return itemId
  }
  return contentId
}

export function appDashboardUrlFromProbe({ domain, referenceDashboard, contentId } = {}) {
  if (isDatawiseHost(domain) || isDatawiseHost(contentId) || isDatawiseHost(referenceDashboard)) {
    return DATAWISE_DASHBOARD_URL
  }
  if (!referenceDashboard) return null
  const host = String(referenceDashboard)
  if (host.startsWith('https://') || host.startsWith('http://')) return host
  return `https://${host}`
}

export function resultsDashboardTitleSlug(type) {
  if (type === 'app' || type === 'app-specific') return 'app-specific-dashboard'
  if (type === 'activity' || type === 'generative-ai-module') return 'activity-dashboard'
  return 'live-monitoring-dashboard'
}

export function primaryDashboardTypeFromFlags({ isApp, isGenAI } = {}) {
  if (isApp) return 'app'
  if (isGenAI) return 'activity'
  return 'live-monitoring'
}

/** True when the shared Dashboard modal must render the HTML live table (not Url/Betty/RCT). */
export function isLiveDashboardMode(modeOrType) {
  return modeOrType === 'live' || modeOrType === 'live-monitoring'
}

/** Live open must not pass a Datawise / reference.dashboard URL. */
export function resultsDashboardUrlForType(type, dashboardUrl) {
  if (isLiveDashboardMode(type)) return null
  return dashboardUrl ?? null
}

/**
 * Live card = hasNonDatawise content, not !isApp.
 * Mixed Datawise + other and Betty-only both show live. Do not fall back to !isApp.
 */
export function hasLiveMonitoringCard(flags = {}) {
  if (typeof flags.hasLive === 'boolean') return flags.hasLive
  if (typeof flags.hasNonDatawiseContent === 'boolean') return flags.hasNonDatawiseContent
  return false
}

export function assignedStudentsForAssignment(store, assignmentId) {
  if (!store?.getters || !assignmentId) return []
  return store.getters['assignments/assignedStudents'](assignmentId, TEACHER_TO_STUDENT) || []
}

export function usersForDashboardEmbed(propUsers, store, assignmentId) {
  if (Array.isArray(propUsers) && propUsers.length) return propUsers
  return assignedStudentsForAssignment(store, assignmentId)
}

export function emptyDashboardAssessment() {
  return {
    isBetty: false,
    bettyLink: null,
    bettyModuleId: null,
    dashboardUrl: null,
    isApp: false,
    isGenAI: false,
    isCandli: false,
    isProgramming: false,
    candliGames: [],
    hasDatawise: false,
    hasNonDatawiseContent: false,
    hasLive: false,
  }
}

/** A probe is Datawise / custom-dashboard when it produced an app dashboard URL. */
function probeHasDatawise(probe) {
  return Boolean(probe?.dashboardUrl)
}

/**
 * Non-Datawise: Betty, Candli, GenAI, ordinary, or anything without a Datawise URL.
 * A Datawise probe that is also Betty/Candli/GenAI is mixed within one content id.
 */
function probeHasNonDatawiseContent(probe) {
  if (!probe) return false
  if (probe.isBetty || probe.isGenAI || probe.candliGames?.length) return true
  if (typeof probe.hasOther === 'boolean') return probe.hasOther
  return !probeHasDatawise(probe)
}

async function dashboardUrlForRecord(id, contentState) {
  let domain = null
  try {
    domain = (await Agent.metadata(id))?.domain || null
  } catch {
    domain = null
  }
  return appDashboardUrlFromProbe({
    domain,
    contentId: contentState?.id || id,
    referenceDashboard: contentState?.reference?.dashboard,
  })
}

async function innerIdsFromSequenceItems(itemIds) {
  const extra = []
  let probes = 0
  for (const itemId of itemIds || []) {
    if (probes >= MAX_NESTED_BETTY_PROBES) break
    if (!itemId || isBettyPlayerUrl(itemId) || /^https?:\/\//.test(itemId)) continue
    probes += 1
    try {
      const itemState = await Agent.state(itemId)
      if (itemState?.id) {
        extra.push(itemState.id)
        if (isBettyPlayerUrl(itemState.id)) break
      }
    } catch {
      /* ignore per-item probe */
    }
  }
  return extra
}

/**
 * Betty iframe needs the player URL (module id from pathname).
 * Detect URL prefix, id includes "betty", and one-level nested sequence items.
 */
export async function resolveBettyDashboard({ contentId, contentState, sequenceItemIds } = {}) {
  const items = sequenceItemIds || normalizeSequenceItems(contentState?.items)
  const looksBetty = looksLikeBettyContent({
    contentId,
    contentStateId: contentState?.id,
    sequenceItemIds: items,
  })
  let bettyLink = findBettyPlayerUrl([contentState?.id, contentId, ...items])
  if (!bettyLink && looksBetty) {
    const nested = await innerIdsFromSequenceItems(items)
    bettyLink = findBettyPlayerUrl(nested)
  }
  return {
    isBetty: Boolean(bettyLink) || looksBetty,
    bettyLink: bettyLink || null,
    bettyModuleId: bettyModuleIdFromUrl(bettyLink),
  }
}

async function candliGamesForContent(contentId, contentState, visited = new Set()) {
  if (!contentId || visited.has(contentId)) return []
  visited.add(contentId)

  if (CANDLI_SEQUENCES[contentId]) return [...CANDLI_SEQUENCES[contentId]]

  if (contentState === undefined) {
    try {
      contentState = await Agent.state(contentId)
    } catch {
      contentState = null
    }
  }

  const childIds = contentState?.items != null
    ? normalizeSequenceItems(contentState.items)
    : normalizeAssignmentContent(contentState?.content)

  if (!childIds.length) {
    return candliGamesForSequenceItems([{ id: contentId }])
  }

  const games = []
  for (const childId of childIds) {
    games.push(...await candliGamesForContent(childId, undefined, visited))
  }
  return games
}

export async function probeContentDashboards(contentId) {
  const result = {
    isBetty: false,
    bettyLink: null,
    bettyModuleId: null,
    dashboardUrl: null,
    isGenAI: Boolean(contentId && GEN_AI_SEQUENCES[contentId]),
    isProgramming: false,
    candliGames: [],
  }
  if (!contentId) return result

  result.isProgramming = await isCandliProgrammingContent(contentId)

  let contentState = null
  try {
    contentState = await Agent.state(contentId)
  } catch {
    contentState = null
  }

  const sequenceItemIds = normalizeSequenceItems(
    contentState?.items ?? contentState?.content,
  )

  // Programming sequences use the app dashboard, not the competency card.
  if (!result.isProgramming) {
    result.candliGames = await candliGamesForContent(contentId, contentState)
  }

  const betty = await resolveBettyDashboard({ contentId, contentState, sequenceItemIds })
  result.isBetty = betty.isBetty
  result.bettyLink = betty.bettyLink
  result.bettyModuleId = betty.bettyModuleId

  const ownUrl = await dashboardUrlForRecord(contentId, contentState)
  const childIds = sequenceItemIds.filter(id => id && id !== contentId)
  let anyDatawise = Boolean(ownUrl)
  let anyOther = childIds.length ? false : !ownUrl
  let dashboardUrl = ownUrl
  for (const itemId of childIds) {
    let itemState = null
    try {
      itemState = await Agent.state(itemId)
    } catch {
      itemState = null
    }
    const childUrl = await dashboardUrlForRecord(itemId, itemState)
    if (childUrl) {
      anyDatawise = true
      if (!dashboardUrl) dashboardUrl = childUrl
    } else {
      anyOther = true
    }
  }
  result.dashboardUrl = dashboardUrl
  result.hasOther = anyDatawise ? anyOther : true

  return result
}

export async function assessAssignmentDashboards(assignmentId) {
  const assessment = emptyDashboardAssessment()
  if (!assignmentId) return assessment

  let stateData
  try {
    stateData = await Agent.state(assignmentId)
  } catch {
    return assessment
  }

  const contentIds = normalizeAssignmentContent(stateData?.content)
  const allGames = []

  for (const contentId of contentIds) {
    const probe = await probeContentDashboards(contentId)
    if (probe.isBetty) {
      assessment.isBetty = true
      if (!assessment.bettyLink && probe.bettyLink) {
        assessment.bettyLink = probe.bettyLink
        assessment.bettyModuleId = probe.bettyModuleId
      }
    }
    if (probe.dashboardUrl && !assessment.dashboardUrl) {
      assessment.dashboardUrl = probe.dashboardUrl
    }
    if (probeHasDatawise(probe)) assessment.hasDatawise = true
    if (probeHasNonDatawiseContent(probe)) assessment.hasNonDatawiseContent = true
    if (probe.isGenAI) assessment.isGenAI = true
    if (probe.isProgramming) assessment.isProgramming = true
    if (probe.candliGames?.length) {
      assessment.isCandli = true
      allGames.push(...probe.candliGames)
    }
  }

  assessment.candliGames = [...new Set(allGames.filter(Boolean))]
  assessment.isApp = assessment.isBetty || Boolean(assessment.dashboardUrl) || assessment.isProgramming
  assessment.hasLive = assessment.hasNonDatawiseContent
  return assessment
}
