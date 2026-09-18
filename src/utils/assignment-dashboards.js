/**
 * Shared assignment dashboard classification (UIUX-231 + UIUX-237).
 *
 * App-specific (231): Betty or Datawise / reference.dashboard.
 * Live-monitoring (237): any non-Datawise content (not Datawise-only).
 * Mixed Datawise + other → BOTH app and live. Betty-only → BOTH (not mutex).
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

export function appDashboardUrlFromProbe({ domain, referenceDashboard } = {}) {
  if (domain === DATAWISE_DOMAIN) return DATAWISE_DASHBOARD_URL
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
  return !probeHasDatawise(probe)
}

function sequenceItemsForCandliScan(contentState) {
  const rawItems = contentState?.items
  if (Array.isArray(rawItems)) return rawItems
  return normalizeSequenceItems(rawItems).map(id => ({ id }))
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

export async function probeContentDashboards(contentId) {
  const result = {
    isBetty: false,
    bettyLink: null,
    bettyModuleId: null,
    dashboardUrl: null,
    isGenAI: Boolean(contentId && GEN_AI_SEQUENCES[contentId]),
    candliGames: [],
  }
  if (!contentId) return result

  if (CANDLI_SEQUENCES[contentId]) {
    result.candliGames = [...CANDLI_SEQUENCES[contentId]]
  }

  let contentState = null
  try {
    contentState = await Agent.state(contentId)
  } catch {
    contentState = null
  }

  const sequenceItemIds = normalizeSequenceItems(contentState?.items)

  if (!result.candliGames.length) {
    try {
      result.candliGames = await candliGamesForSequenceItems(
        sequenceItemsForCandliScan(contentState),
      )
    } catch {
      result.candliGames = []
    }
  }

  const betty = await resolveBettyDashboard({ contentId, contentState, sequenceItemIds })
  result.isBetty = betty.isBetty
  result.bettyLink = betty.bettyLink
  result.bettyModuleId = betty.bettyModuleId

  let domain = null
  try {
    const meta = await Agent.metadata(contentId)
    domain = meta?.domain
  } catch {
    domain = null
  }
  result.dashboardUrl = appDashboardUrlFromProbe({
    domain,
    referenceDashboard: contentState?.reference?.dashboard,
  })

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
    if (probe.candliGames?.length) {
      assessment.isCandli = true
      allGames.push(...probe.candliGames)
    }
  }

  assessment.candliGames = [...new Set(allGames.filter(Boolean))]
  assessment.isApp = assessment.isBetty || Boolean(assessment.dashboardUrl)
  assessment.hasLive = assessment.hasNonDatawiseContent
  return assessment
}
