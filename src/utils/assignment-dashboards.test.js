import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  BETTY_PLAYER_PREFIX,
  DATAWISE_DASHBOARD_URL,
  appDashboardUrlFromProbe,
  assessAssignmentDashboards,
  datawiseDashboardGameId,
  assignedStudentsForAssignment,
  bettyModuleIdFromUrl,
  candliProgrammingDashboardUrl,
  clearCandliProgrammingChildCache,
  isCandliProgrammingContent,
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

const PROGRAMMING_EXPERT = '68175e10-b26c-11f1-b7bc-a54c511d7554'
const PROGRAMMING_EXPERT_2 = '67b6f920-b26d-11f1-b7bd-a54c511d7554'
const PROGRAMMING_TRUNK = 'e6b4b836-c4b9-46b7-b4bd-6da86d4d6b21'

beforeEach(() => {
  clearCandliProgrammingChildCache()
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

describe('assessAssignmentDashboards Candli competency detection', () => {
  const gameIds = ['candli-custom', 'candli-embed']
  const gameItems = gameIds.map(id => ({ id }))
  const gameStates = {
    'candli-custom': {},
    'candli-embed': { id: 'https://pila.cand.li/pila-play.html?game=embedded-game' },
  }
  const gameMetadata = {
    'candli-custom': { domain: 'customize-candli.pilaproject.org' },
    'candli-embed': { domain: 'embed.knowlearning.systems' },
  }

  for (const [label, sequenceState] of [
    ['ui-dev items map', { items: { 0: gameItems[0], 1: gameItems[1] } }],
    ['legacy items ID array', { items: gameIds }],
    ['legacy items object array', { items: gameItems }],
    ['legacy content ID array', { content: gameIds }],
    ['legacy content object array', { content: gameItems }],
  ]) {
    it(`detects customized and embedded Candli games in a ${label}`, async () => {
      mockAgent({
        states: {
          'asg-candli': { content: ['seq-candli'] },
          'seq-candli': sequenceState,
          ...gameStates,
        },
        metadata: gameMetadata,
      })
      const flags = await assessAssignmentDashboards('asg-candli')
      assert.equal(flags.isCandli, true)
      assert.deepEqual(flags.candliGames, ['candli-custom', 'embedded-game'])
    })
  }

  it('detects directly assigned customized and embedded Candli games', async () => {
    mockAgent({
      states: {
        'asg-candli': { content: gameIds },
        ...gameStates,
      },
      metadata: gameMetadata,
    })
    const flags = await assessAssignmentDashboards('asg-candli')
    assert.equal(flags.isCandli, true)
    assert.deepEqual(flags.candliGames, ['candli-custom', 'embedded-game'])
  })

  it('detects the reported sequence containing a legacy-host customized Candli game', async () => {
    const sequenceId = '4fbb4830-bb69-11f1-9b16-dffaae0e7166'
    const customizedGameId = '1237f3b0-c406-11f0-b5c9-cfa2201501c5'
    mockAgent({
      states: {
        'asg-reported': { content: [sequenceId] },
        [sequenceId]: { items: [{ id: customizedGameId }] },
        [customizedGameId]: {
          game: '25a6ac35e1c25713b5fedd0008599a52',
          configuration: {},
        },
      },
      metadata: {
        [sequenceId]: {
          domain: 'create.pilaproject.org',
          active_type: 'application/json;type=sequence',
        },
        [customizedGameId]: {
          domain: 'customize-candli.netlify.app',
          active_type: 'application/json',
        },
      },
    })
    const flags = await assessAssignmentDashboards('asg-reported')
    assert.equal(flags.isCandli, true)
    assert.deepEqual(flags.candliGames, [customizedGameId])
  })

  it('keeps legacy and current customized game IDs in assignment order instead of their shared base game', async () => {
    const legacyGameId = '1237f3b0-c406-11f0-b5c9-cfa2201501c5'
    const currentGameId = 'candli-current-custom'
    const customizedState = {
      game: '25a6ac35e1c25713b5fedd0008599a52',
      configuration: {},
    }
    mockAgent({
      states: {
        'asg-customized': { content: [legacyGameId, currentGameId, legacyGameId] },
        [legacyGameId]: customizedState,
        [currentGameId]: customizedState,
      },
      metadata: {
        [legacyGameId]: { domain: 'customize-candli.netlify.app' },
        [currentGameId]: { domain: 'customize-candli.pilaproject.org' },
      },
    })
    const flags = await assessAssignmentDashboards('asg-customized')
    assert.equal(flags.isCandli, true)
    assert.deepEqual(flags.candliGames, [legacyGameId, currentGameId])
  })

  for (const [label, legacyContent, innerItems] of [
    ['array', ['inner-sequence'], gameItems],
    ['single ID', 'inner-sequence', { 0: gameItems[0], 1: gameItems[1] }],
  ]) {
    it(`finds games through a first assignment item's legacy content ${label}`, async () => {
      mockAgent({
        states: {
          'asg-nested': { content: ['legacy-wrapper', 'ordinary-content'] },
          'legacy-wrapper': { content: legacyContent },
          'inner-sequence': { items: innerItems },
          ...gameStates,
        },
        metadata: gameMetadata,
      })
      const flags = await assessAssignmentDashboards('asg-nested')
      assert.equal(flags.isCandli, true)
      assert.deepEqual(flags.candliGames, ['candli-custom', 'embedded-game'])
    })
  }

  it('recognizes hardcoded Candli sequences nested inside a legacy wrapper', async () => {
    mockAgent({
      states: {
        'asg-nested': { content: ['legacy-wrapper'] },
        'legacy-wrapper': { content: [CANDLI_ID] },
        [CANDLI_ID]: { items: gameItems },
        ...gameStates,
      },
      metadata: gameMetadata,
    })
    const flags = await assessAssignmentDashboards('asg-nested')
    assert.equal(flags.isCandli, true)
    assert.deepEqual(flags.candliGames, CANDLI_SEQUENCES[CANDLI_ID])
  })

  it('preserves nested and direct game order and deduplicates across assignment items', async () => {
    mockAgent({
      states: {
        'asg-mixed': { content: ['legacy-wrapper', 'candli-custom', 'candli-extra'] },
        'legacy-wrapper': { content: ['inner-sequence', 'candli-embed'] },
        'inner-sequence': { items: gameItems },
        ...gameStates,
      },
      metadata: {
        ...gameMetadata,
        'candli-extra': { domain: 'customize-candli.pilaproject.org' },
      },
    })
    const flags = await assessAssignmentDashboards('asg-mixed')
    assert.equal(flags.isCandli, true)
    assert.deepEqual(flags.candliGames, ['candli-custom', 'embedded-game', 'candli-extra'])
  })

  it('terminates sequence cycles while collecting reachable games', { timeout: 1000 }, async () => {
    mockAgent({
      states: {
        'asg-cycle': { content: ['legacy-wrapper'] },
        'legacy-wrapper': { content: ['inner-sequence', 'candli-embed'] },
        'inner-sequence': { items: ['legacy-wrapper', 'candli-custom'] },
        ...gameStates,
      },
      metadata: gameMetadata,
    })
    const flags = await assessAssignmentDashboards('asg-cycle')
    assert.equal(flags.isCandli, true)
    assert.deepEqual(flags.candliGames, ['candli-custom', 'embedded-game'])
  })

  it('keeps games in valid nested siblings when a child cannot load', async () => {
    mockAgent({
      states: {
        'asg-nested': { content: ['legacy-wrapper'] },
        'legacy-wrapper': { content: ['unavailable-child', 'inner-sequence'] },
        'inner-sequence': { items: gameItems },
        ...gameStates,
      },
      metadata: gameMetadata,
    })
    const loadState = globalThis.Agent.state
    globalThis.Agent.state = async id => {
      if (id === 'unavailable-child') throw new Error('Unavailable content')
      return loadState(id)
    }
    const flags = await assessAssignmentDashboards('asg-nested')
    assert.equal(flags.isCandli, true)
    assert.deepEqual(flags.candliGames, ['candli-custom', 'embedded-game'])
  })

  it('preserves hardcoded Candli sequence mappings', async () => {
    mockAgent({
      states: {
        'asg-candli': { content: [CANDLI_ID] },
        [CANDLI_ID]: { items: gameItems },
        ...gameStates,
      },
      metadata: gameMetadata,
    })
    const flags = await assessAssignmentDashboards('asg-candli')
    assert.equal(flags.isCandli, true)
    assert.deepEqual(flags.candliGames, CANDLI_SEQUENCES[CANDLI_ID])
  })

  it('prefers an empty items map over legacy content', async () => {
    mockAgent({
      states: {
        'asg-empty': { content: ['seq-empty'] },
        'seq-empty': { items: {}, content: gameIds },
        ...gameStates,
      },
      metadata: gameMetadata,
    })
    const flags = await assessAssignmentDashboards('asg-empty')
    assert.equal(flags.isCandli, false)
    assert.deepEqual(flags.candliGames, [])
  })

  it('does not classify ordinary standalone embeds as Candli', async () => {
    mockAgent({
      states: {
        'asg-ordinary': { content: ['ordinary-embed'] },
        'ordinary-embed': { id: 'https://example.org/game' },
      },
      metadata: {
        'ordinary-embed': { domain: 'embed.knowlearning.systems' },
      },
    })
    const flags = await assessAssignmentDashboards('asg-ordinary')
    assert.equal(flags.isCandli, false)
    assert.deepEqual(flags.candliGames, [])
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

  it('Datawise dashboard game is the activity, not the sequence that contains it', async () => {
    mockAgent({
      states: {
        'seq-dw': { items: [{ id: 'dw-child' }, { id: 'dw-other' }] },
        'dw-child': {},
        'dw-other': {},
        'dw-direct': {},
        'seq-ord': { items: [{ id: 'leaf-a' }] },
      },
      metadata: {
        'seq-dw': { domain: 'thailand.pilaproject.org' },
        'dw-child': { domain: 'datawise.accingo.co' },
        'dw-other': { domain: 'datawise.accingo.co' },
        'dw-direct': { domain: 'datawise.accingo.co' },
        'seq-ord': { domain: 'thailand.pilaproject.org' },
        'leaf-a': { domain: 'example.org' },
      },
    })
    assert.equal(await datawiseDashboardGameId('dw-direct', {}), 'dw-direct')
    assert.equal(
      await datawiseDashboardGameId('seq-dw', { items: [{ id: 'dw-child' }, { id: 'dw-other' }] }),
      'dw-child',
    )
    assert.equal(
      await datawiseDashboardGameId('seq-ord', { items: [{ id: 'leaf-a' }] }),
      'seq-ord',
    )
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

  it('Candli programming sequences use the app card, not competency (UIUX-288)', async () => {
    mockAgent({
      states: {
        'asg-prog': { content: PROGRAMMING_EXPERT },
        [PROGRAMMING_EXPERT]: {
          items: { 0: { id: 'embed-1' } },
        },
        'embed-1': { id: 'https://pila.cand.li/pila.html?game=level-a' },
      },
      metadata: {
        'embed-1': { domain: 'embed.knowlearning.systems' },
      },
    })
    const flags = await assessAssignmentDashboards('asg-prog')
    assert.equal(flags.isProgramming, true)
    assert.equal(flags.isApp, true)
    assert.equal(flags.isCandli, false)
    assert.equal(flags.candliGames.length, 0)
    assert.equal(flags.dashboardUrl, null)
    assert.equal(flags.hasLive, true)
    assert.equal(primaryDashboardTypeFromFlags(flags), 'app')
    assert.equal(
      candliProgrammingDashboardUrl('config-1'),
      'https://pila.cand.li/pila.html?dashboard&dashboard-config=config-1',
    )
  })

  it('a sub-item or nested level of an expert sequence is programming content', async () => {
    mockAgent({
      states: {
        'asg-child': { content: 'level-1' },
        'asg-nested': { content: 'level-2' },
        [PROGRAMMING_EXPERT]: { items: { 0: { id: 'level-1' }, 1: { id: 'inner-seq' } } },
        'inner-seq': { items: { 0: { id: 'level-2' } } },
        [PROGRAMMING_EXPERT_2]: { items: {} },
      },
    })
    const child = await assessAssignmentDashboards('asg-child')
    assert.equal(child.isProgramming, true)
    assert.equal(child.isApp, true)
    assert.equal(child.isCandli, false)
    clearCandliProgrammingChildCache()
    const nested = await assessAssignmentDashboards('asg-nested')
    assert.equal(nested.isProgramming, true)
    assert.equal(nested.isApp, true)
    assert.equal(await isCandliProgrammingContent(PROGRAMMING_EXPERT_2), true)
    assert.equal(await isCandliProgrammingContent('not-a-level'), false)
  })

  it('trunk programming ids stay exact and older competency sequences stay competency', async () => {
    mockAgent({
      states: {
        'asg-trunk': { content: PROGRAMMING_TRUNK },
        'asg-child': { content: 'trunk-child' },
        'asg-chirpy': { content: CANDLI_ID },
        'asg-mix': { content: [CANDLI_ID, PROGRAMMING_EXPERT] },
        [PROGRAMMING_TRUNK]: { items: { 0: { id: 'trunk-child' } } },
        'trunk-child': { id: 'https://pila.cand.li/pila.html?game=old' },
        [CANDLI_ID]: { items: {} },
        [PROGRAMMING_EXPERT]: { items: {} },
        [PROGRAMMING_EXPERT_2]: { items: {} },
      },
      metadata: {
        'trunk-child': { domain: 'embed.knowlearning.systems' },
      },
    })
    const trunk = await assessAssignmentDashboards('asg-trunk')
    assert.equal(trunk.isProgramming, true)
    assert.equal(trunk.isApp, true)
    assert.equal(trunk.isCandli, false)

    clearCandliProgrammingChildCache()
    const trunkChild = await assessAssignmentDashboards('asg-child')
    assert.equal(trunkChild.isProgramming, false)
    assert.equal(trunkChild.isApp, false)

    const chirpy = await assessAssignmentDashboards('asg-chirpy')
    assert.equal(chirpy.isCandli, true)
    assert.equal(chirpy.isProgramming, false)
    assert.equal(chirpy.isApp, false)
    assert.ok(chirpy.candliGames.length > 0)

    const mix = await assessAssignmentDashboards('asg-mix')
    assert.equal(mix.isApp, true)
    assert.equal(mix.isProgramming, true)
    assert.equal(mix.isCandli, true)
    assert.ok(mix.candliGames.length > 0)
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
