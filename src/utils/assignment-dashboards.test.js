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
  looksLikeBettyContent,
  primaryDashboardTypeFromFlags,
  resolveBettyDashboard,
  resultsDashboardTitleSlug,
  usersForDashboardEmbed,
} from './assignment-dashboards.js'

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

describe('app dashboard URL + titles + exclusive live card', () => {
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

  it('Betty-only / Datawise-only hide live; ordinary keeps live', () => {
    assert.equal(hasLiveMonitoringCard({ isApp: true }), false)
    assert.equal(hasLiveMonitoringCard({ isApp: false }), true)
    assert.equal(primaryDashboardTypeFromFlags({ isApp: true }), 'app')
    assert.equal(primaryDashboardTypeFromFlags({ isGenAI: true }), 'activity')
    assert.equal(primaryDashboardTypeFromFlags({}), 'live-monitoring')
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

describe('assessAssignmentDashboards (Betty-only / Datawise-only / ordinary)', () => {
  it('Betty-only → app, no dashboardUrl (open must not require URL)', async () => {
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
    assert.equal(hasLiveMonitoringCard(flags), false)
  })

  it('Datawise-only → app + Datawise dashboard URL', async () => {
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
    assert.equal(hasLiveMonitoringCard(flags), false)
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
    assert.equal(hasLiveMonitoringCard(flags), true)
    assert.equal(primaryDashboardTypeFromFlags(flags), 'live-monitoring')
  })

  it('assignment content that is itself a Betty player URL is app-specific', async () => {
    mockAgent({
      states: {
        'asg-url': { content: BETTY_URL },
      },
    })
    const flags = await assessAssignmentDashboards('asg-url')
    assert.equal(flags.isApp, true)
    assert.equal(flags.isBetty, true)
    assert.equal(flags.bettyModuleId, 'practice')
  })
})
