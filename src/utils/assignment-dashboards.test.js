import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  BETTY_PLAYER_PREFIX,
  DATAWISE_DASHBOARD_URL,
  appDashboardUrlFromProbe,
  assessAssignmentDashboards,
  assignedStudentsForAssignment,
  bettyModuleIdFromUrl,
  findBettyPlayerUrl,
  hasLiveMonitoringCard,
  idLooksLikeBetty,
  isBettyPlayerUrl,
  isLiveDashboardMode,
  looksLikeBettyContent,
  primaryDashboardTypeFromFlags,
  resolveBettyDashboard,
  resultsDashboardTitleSlug,
  resultsDashboardUrlForType,
  usersForDashboardEmbed,
} from './assignment-dashboards.js'
import { CANDLI_SEQUENCES } from './constants.js'

const CANDLI_ID = Object.keys(CANDLI_SEQUENCES)[0]

const BETTY_URL = `${BETTY_PLAYER_PREFIX}bb/practice?oecd=true&disable-guide=true`
const BETTY_CLIMATE = `${BETTY_PLAYER_PREFIX}bb/climate-change?oecd=true`

function mockAgent({ states = {}, metadata = {} } = {}) {
  globalThis.Agent = {
    state: async (id) => {
      if (Object.prototype.hasOwnProperty.call(states, id)) return states[id]
      return { items: {} }
    },
    metadata: async (id) => {
      if (Object.prototype.hasOwnProperty.call(metadata, id)) return metadata[id]
      return { domain: 'example.org' }
    },
  }
}

beforeEach(() => {
  mockAgent()
})

describe('Betty URL helpers (trunk player prefix + module path)', () => {
  it('detects the Betty player origin and extracts module id', () => {
    assert.equal(isBettyPlayerUrl(BETTY_URL), true)
    assert.equal(isBettyPlayerUrl('https://other.example/bb/practice'), false)
    assert.equal(bettyModuleIdFromUrl(BETTY_URL), 'practice')
    assert.equal(bettyModuleIdFromUrl('not-a-url'), null)
  })

  it('matches trunk id.includes("betty") labeling', () => {
    assert.equal(idLooksLikeBetty('https://bettysbrain.knowlearning.systems/bb/practice'), true)
    assert.equal(idLooksLikeBetty('betty-wrapper-seq'), true)
    assert.equal(idLooksLikeBetty('ordinary-sequence'), false)
  })

  it('finds the first player URL among candidates', () => {
    assert.equal(findBettyPlayerUrl(['seq-1', BETTY_URL, BETTY_CLIMATE]), BETTY_URL)
    assert.equal(findBettyPlayerUrl(['seq-1', 'leaf-2']), null)
  })

  it('looksLikeBettyContent covers id, state.id, and nested item ids', () => {
    assert.equal(looksLikeBettyContent({ contentId: BETTY_URL }), true)
    assert.equal(looksLikeBettyContent({ contentStateId: 'betty-wrap' }), true)
    assert.equal(looksLikeBettyContent({ sequenceItemIds: [BETTY_CLIMATE] }), true)
    assert.equal(looksLikeBettyContent({ contentId: 'seq-1', sequenceItemIds: ['leaf'] }), false)
  })
})

describe('app dashboard URL + titles + live card (not mutex with app)', () => {
  it('maps Datawise domain and reference.dashboard the way trunk all.vue does', () => {
    assert.equal(
      appDashboardUrlFromProbe({ domain: 'datawise.accingo.co' }),
      DATAWISE_DASHBOARD_URL,
    )
    assert.equal(
      appDashboardUrlFromProbe({ referenceDashboard: 'games.example/dash' }),
      'https://games.example/dash',
    )
    assert.equal(
      appDashboardUrlFromProbe({ referenceDashboard: 'https://already.full/dash' }),
      'https://already.full/dash',
    )
    assert.equal(appDashboardUrlFromProbe({}), null)
  })

  it('titles follow the opened type, not the Betty/GenAI ternary', () => {
    assert.equal(resultsDashboardTitleSlug('app'), 'app-specific-dashboard')
    assert.equal(resultsDashboardTitleSlug('app-specific'), 'app-specific-dashboard')
    assert.equal(resultsDashboardTitleSlug('live-monitoring'), 'live-monitoring-dashboard')
    assert.equal(resultsDashboardTitleSlug('activity'), 'activity-dashboard')
    assert.equal(resultsDashboardTitleSlug('generative-ai-module'), 'activity-dashboard')
  })

  it('live card follows hasLive / hasNonDatawiseContent, not !isApp', () => {
    assert.equal(hasLiveMonitoringCard({ isApp: true, hasLive: true }), true)
    assert.equal(hasLiveMonitoringCard({ isApp: true, hasLive: false }), false)
    assert.equal(hasLiveMonitoringCard({ isApp: false, hasLive: true }), true)
    assert.equal(hasLiveMonitoringCard({ hasNonDatawiseContent: true }), true)
    assert.equal(hasLiveMonitoringCard({ hasNonDatawiseContent: false }), false)
    // No !isApp fallback — mixed must not regress if a caller only passes isApp.
    assert.equal(hasLiveMonitoringCard({ isApp: true }), false)
    assert.equal(hasLiveMonitoringCard({ isApp: false }), false)
    assert.equal(primaryDashboardTypeFromFlags({ isApp: true }), 'app')
    assert.equal(primaryDashboardTypeFromFlags({ isGenAI: true }), 'activity')
    assert.equal(primaryDashboardTypeFromFlags({}), 'live-monitoring')
  })

  it('live open drops Datawise url; app keeps it', () => {
    assert.equal(isLiveDashboardMode('live'), true)
    assert.equal(isLiveDashboardMode('live-monitoring'), true)
    assert.equal(isLiveDashboardMode('app'), false)
    assert.equal(resultsDashboardUrlForType('live-monitoring', DATAWISE_DASHBOARD_URL), null)
    assert.equal(resultsDashboardUrlForType('live', DATAWISE_DASHBOARD_URL), null)
    assert.equal(resultsDashboardUrlForType('app', DATAWISE_DASHBOARD_URL), DATAWISE_DASHBOARD_URL)
    assert.equal(resultsDashboardUrlForType('app', null), null)
  })
})

describe('usersForDashboardEmbed honors props.users', () => {
  it('prefers a non-empty props list over the store getter', () => {
    const store = {
      getters: {
        'assignments/assignedStudents': () => ['from-store'],
      },
    }
    assert.deepEqual(
      usersForDashboardEmbed(['a', 'b'], store, 'assign-1'),
      ['a', 'b'],
    )
    assert.deepEqual(
      usersForDashboardEmbed([], store, 'assign-1'),
      ['from-store'],
    )
    assert.deepEqual(
      assignedStudentsForAssignment(store, 'assign-1'),
      ['from-store'],
    )
  })
})

describe('resolveBettyDashboard walks nested sequence items', () => {
  it('uses a direct player URL on content state.id', async () => {
    const result = await resolveBettyDashboard({
      contentId: 'seq-1',
      contentState: { id: BETTY_URL, items: {} },
    })
    assert.equal(result.isBetty, true)
    assert.equal(result.bettyLink, BETTY_URL)
    assert.equal(result.bettyModuleId, 'practice')
  })

  it('finds a Betty URL on sequence items without extra fetches', async () => {
    const result = await resolveBettyDashboard({
      contentId: 'betty-wrap',
      contentState: { id: 'betty-wrap', items: { 0: { id: BETTY_CLIMATE } } },
    })
    assert.equal(result.isBetty, true)
    assert.equal(result.bettyLink, BETTY_CLIMATE)
    assert.equal(result.bettyModuleId, 'climate-change')
  })

  it('loads nested item state.id when the wrapper only looks like Betty', async () => {
    mockAgent({
      states: {
        'leaf-1': { id: BETTY_URL },
      },
    })
    const result = await resolveBettyDashboard({
      contentId: 'betty-wrap',
      contentState: { id: 'betty-wrap', items: { 0: { id: 'leaf-1' } } },
    })
    assert.equal(result.isBetty, true)
    assert.equal(result.bettyLink, BETTY_URL)
    assert.equal(result.bettyModuleId, 'practice')
  })
})

describe('assessAssignmentDashboards (Betty-only / Datawise-only / mixed / ordinary)', () => {
  it('Betty-only → app AND live (237 union; open must not require URL)', async () => {
    mockAgent({
      states: {
        'asg-betty': { content: 'seq-betty' },
        'seq-betty': { id: 'betty-wrap', items: { 0: { id: BETTY_URL } } },
      },
    })
    const flags = await assessAssignmentDashboards('asg-betty')
    assert.equal(flags.isBetty, true)
    assert.equal(flags.isApp, true)
    assert.equal(flags.dashboardUrl, null)
    assert.equal(flags.bettyModuleId, 'practice')
    assert.equal(flags.hasLive, true)
    assert.equal(hasLiveMonitoringCard(flags), true)
  })

  it('Datawise-only → app + Datawise URL, no live card', async () => {
    mockAgent({
      states: {
        'asg-dw': { content: 'dw-1' },
        'dw-1': { items: {} },
      },
      metadata: {
        'dw-1': { domain: 'datawise.accingo.co' },
      },
    })
    const flags = await assessAssignmentDashboards('asg-dw')
    assert.equal(flags.isBetty, false)
    assert.equal(flags.isApp, true)
    assert.equal(flags.dashboardUrl, DATAWISE_DASHBOARD_URL)
    assert.equal(flags.hasLive, false)
    assert.equal(hasLiveMonitoringCard(flags), false)
  })

  it('mixed Datawise + ordinary → app AND live (UIUX-237 regression)', async () => {
    mockAgent({
      states: {
        'asg-mix': { content: ['dw-1', 'seq-ord'] },
        'dw-1': { items: {} },
        'seq-ord': { id: 'ordinary', items: { 0: { id: 'leaf-a' } } },
      },
      metadata: {
        'dw-1': { domain: 'datawise.accingo.co' },
      },
    })
    const flags = await assessAssignmentDashboards('asg-mix')
    assert.equal(flags.isApp, true)
    assert.equal(flags.dashboardUrl, DATAWISE_DASHBOARD_URL)
    assert.equal(flags.hasLive, true)
    assert.equal(hasLiveMonitoringCard(flags), true)
    assert.equal(primaryDashboardTypeFromFlags(flags), 'app')
  })

  it('mixed Datawise + Candli → app AND live AND competency', async () => {
    mockAgent({
      states: {
        'asg-candli-mix': { content: ['dw-1', CANDLI_ID] },
        'dw-1': { items: {} },
        [CANDLI_ID]: { items: {} },
      },
      metadata: {
        'dw-1': { domain: 'datawise.accingo.co' },
      },
    })
    const flags = await assessAssignmentDashboards('asg-candli-mix')
    assert.equal(flags.isApp, true)
    assert.equal(flags.isCandli, true)
    assert.equal(flags.hasLive, true)
    assert.equal(hasLiveMonitoringCard(flags), true)
  })

  it('Datawise host variant and a nested Datawise child stay app-only', async () => {
    mockAgent({
      states: {
        'asg-host': { content: 'dw-host' },
        'dw-host': { items: {} },
        'asg-child': { content: 'seq-dw' },
        'seq-dw': { id: 'wrapper', items: { 0: { id: 'dw-child' } } },
        'dw-child': { items: {} },
      },
      metadata: {
        'dw-host': { domain: 'https://www.datawise.accingo.co/player' },
        'seq-dw': { domain: 'example.org' },
        'dw-child': { domain: 'datawise.accingo.co' },
      },
    })
    const host = await assessAssignmentDashboards('asg-host')
    assert.equal(host.dashboardUrl, DATAWISE_DASHBOARD_URL)
    assert.equal(host.hasLive, false)
    const nested = await assessAssignmentDashboards('asg-child')
    assert.equal(nested.dashboardUrl, DATAWISE_DASHBOARD_URL)
    assert.equal(nested.hasLive, false)
  })

  it('ordinary sequence → not app, live card stays', async () => {
    mockAgent({
      states: {
        'asg-ord': { content: 'seq-ord' },
        'seq-ord': { id: 'ordinary', items: { 0: { id: 'leaf-a' } } },
      },
    })
    const flags = await assessAssignmentDashboards('asg-ord')
    assert.equal(flags.isApp, false)
    assert.equal(flags.isBetty, false)
    assert.equal(flags.dashboardUrl, null)
    assert.equal(flags.hasLive, true)
    assert.equal(hasLiveMonitoringCard(flags), true)
    assert.equal(primaryDashboardTypeFromFlags(flags), 'live-monitoring')
  })

  it('assignment content that is itself a Betty player URL is app-specific and live', async () => {
    mockAgent({
      states: {
        'asg-url': { content: BETTY_URL },
      },
    })
    const flags = await assessAssignmentDashboards('asg-url')
    assert.equal(flags.isApp, true)
    assert.equal(flags.isBetty, true)
    assert.equal(flags.bettyModuleId, 'practice')
    assert.equal(flags.hasLive, true)
  })
})
