import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { GEN_AI_SEQUENCES, PETHEMATICIANS_SINGLE_ITEM_IDS } from './constants.js'
import { clearCandliProgrammingChildCache } from './assignment-dashboards.js'
import { KL_SEQUENCE_PLAYER_HOST, SEQUENCE_ACTIVE_TYPE } from './sequence-items.js'
import { shouldPlaySameHostSequence } from './same-host-sequence.js'
import {
  applyAssignmentKlWrapper,
  klWrapperDashboardGroup,
  prepareAssignmentKlWrapper,
  resetAssignmentKlWrapperFlight,
  syncAssignmentKlWrapper,
} from './assignment-kl-wrapper.js'

const HOST = 'f74e9cb3-2b53-4c85-9b0c-f1d61b032b3f.localhost:9898'
const USER = 'teacher-1'
const LEAF = '11111111-1111-4111-8111-111111111111'
const LEAF_B = '22222222-2222-4222-8222-222222222222'
const SEQ = '33333333-3333-4333-8333-333333333333'
const PET = [...PETHEMATICIANS_SINGLE_ITEM_IDS][0]
const GEN = Object.keys(GEN_AI_SEQUENCES)[0]

function mockAgent() {
  const created = []
  const states = {}
  const metaById = {}
  let synced = 0
  globalThis.Agent = {
    environment: async () => ({ auth: { user: USER } }),
    metadata: async (id) => {
      if (metaById[id]) return metaById[id]
      if (id.startsWith('wrap-') || id.startsWith('asg-')) {
        return { domain: HOST, owner: USER, active_type: 'application/json' }
      }
      if (id === SEQ) {
        return { domain: HOST, owner: USER, active_type: SEQUENCE_ACTIVE_TYPE }
      }
      return {
        domain: KL_SEQUENCE_PLAYER_HOST,
        owner: 'someone-else',
        active_type: 'application/json;type=multiple-choice',
      }
    },
    state: async (id) => {
      if (!states[id]) states[id] = {}
      return states[id]
    },
    create: async (payload) => {
      created.push(payload)
      const id = `wrap-${created.length}`
      states[id] = { ...(payload.active || {}) }
      return id
    },
    synced: async () => {
      synced += 1
    },
  }
  return {
    created,
    states,
    metaById,
    synced: () => synced,
  }
}

beforeEach(() => {
  clearCandliProgrammingChildCache()
  resetAssignmentKlWrapperFlight()
  globalThis.window = { location: { host: HOST } }
  mockAgent()
})

afterEach(() => {
  delete globalThis.window
})

const wrapOpts = { teacherToStudent: true, name: 'Homework' }

describe('assignment kl wrapper', { concurrency: false }, () => {
  it('does nothing for a non teacher-to-student save', () => {
    const prepared = prepareAssignmentKlWrapper('asg-1', [LEAF], null, { teacherToStudent: false })
    assert.equal(prepared instanceof Promise, false)
    assert.equal(prepared.keep, true)
  })

  it('creates an untagged wrapper without reference.player and reuses one we own on this host', async () => {
    const agent = mockAgent()
    const assignment = { content: [LEAF], name: 'Homework' }
    const saved = await syncAssignmentKlWrapper('asg-1', assignment, wrapOpts)
    assert.equal(saved.id, 'wrap-1')
    assert.deepEqual(saved.items, [LEAF])
    assert.deepEqual(assignment.klWrapper, { id: 'wrap-1', items: [LEAF] })
    assert.equal(agent.created.length, 1)
    assert.equal(agent.created[0].active_type, SEQUENCE_ACTIVE_TYPE)
    assert.equal(agent.created[0].active.name, 'Homework')
    assert.equal(agent.created[0].active.assignmentWrapper, 'asg-1')
    assert.deepEqual(agent.created[0].active.items, [{ id: LEAF }])
    assert.equal(agent.created[0].active.reference, undefined)
    assert.equal(agent.created[0].name, 'Homework')
    assert.equal(agent.synced(), 1)

    assignment.content = [LEAF, LEAF_B]
    const again = await syncAssignmentKlWrapper('asg-1', assignment, { ...wrapOpts, name: 'Homework 2' })
    assert.equal(again.id, 'wrap-1')
    assert.deepEqual(again.items, [LEAF, LEAF_B])
    assert.equal(agent.created.length, 1)
    assert.deepEqual(agent.states['wrap-1'].items, [{ id: LEAF }, { id: LEAF_B }])
    assert.equal(agent.states['wrap-1'].name, 'Homework 2')
    assert.equal(agent.states['wrap-1'].reference, undefined)

    agent.states['wrap-1'].reference = {
      player: KL_SEQUENCE_PLAYER_HOST,
      dashboard: 'https://example.test/dash',
    }
    assignment.content = [LEAF_B, LEAF]
    await syncAssignmentKlWrapper('asg-1', assignment, wrapOpts)
    assert.equal(agent.states['wrap-1'].reference.player, undefined)
    assert.equal(agent.states['wrap-1'].reference.dashboard, 'https://example.test/dash')
    assert.equal(agent.created.length, 1)

    agent.states['wrap-1'].reference = { player: KL_SEQUENCE_PLAYER_HOST }
    assignment.content = [LEAF]
    await syncAssignmentKlWrapper('asg-1', assignment, wrapOpts)
    assert.equal(agent.states['wrap-1'].reference, undefined)
    assert.equal(agent.created.length, 1)
  })

  it('creates a wrapper when the owner matches on any domain, and skips someone else', async () => {
    const agent = mockAgent()
    agent.metaById['asg-1'] = { domain: 'app.pilaproject.org', owner: USER }
    const assignment = { content: [LEAF], klWrapper: { id: 'keep-me', items: [LEAF] } }
    const saved = await syncAssignmentKlWrapper('asg-1', assignment, wrapOpts)
    assert.equal(saved.id, 'wrap-1')
    assert.deepEqual(saved.items, [LEAF])
    assert.equal(agent.created.length, 1)

    agent.metaById['asg-2'] = { domain: HOST, owner: 'other-teacher' }
    const other = { content: [LEAF], klWrapper: { id: 'keep-me', items: [LEAF] } }
    const still = await syncAssignmentKlWrapper('asg-2', other, wrapOpts)
    assert.equal(still.keep, undefined)
    assert.equal(still.id, 'keep-me')
    assert.equal(other.klWrapper.id, 'keep-me')
    assert.equal(agent.created.length, 1)
  })

  it('creates a new wrapper when the old one is not owned here', async () => {
    const agent = mockAgent()
    agent.states['wrap-old'] = {
      assignmentWrapper: 'asg-1',
      items: [{ id: LEAF }],
      reference: { player: KL_SEQUENCE_PLAYER_HOST },
    }
    agent.metaById['wrap-old'] = { domain: 'app.pilaproject.org', owner: 'other-teacher' }
    const assignment = { content: [LEAF], klWrapper: { id: 'wrap-old', items: [LEAF] } }
    const saved = await syncAssignmentKlWrapper('asg-1', assignment, wrapOpts)
    assert.equal(saved.id, 'wrap-1')
    assert.equal(agent.created.length, 1)
    assert.equal(agent.states['wrap-old'].reference.player, KL_SEQUENCE_PLAYER_HOST)
  })

  it('creates a wrapper for a karel leaf and inactivates a Datawise leaf', async () => {
    const agent = mockAgent()
    const metadata = globalThis.Agent.metadata
    globalThis.Agent.metadata = async (id) => {
      if (id === LEAF) {
        return {
          domain: KL_SEQUENCE_PLAYER_HOST,
          owner: 'someone-else',
          active_type: 'application/json;type=karel-task&version=1.0.1',
        }
      }
      if (id === LEAF_B) {
        return {
          domain: 'datawise.accingo.co',
          owner: 'someone-else',
          active_type: 'application/json',
        }
      }
      return metadata(id)
    }
    const karel = { content: [LEAF], name: 'Karel homework' }
    const saved = await syncAssignmentKlWrapper('asg-karel', karel, wrapOpts)
    assert.equal(saved.id, 'wrap-1')
    assert.equal(saved.inactive, undefined)
    assert.deepEqual(saved.items, [LEAF])
    assert.equal(agent.created.length, 1)
    assert.equal(agent.created[0].active_type, SEQUENCE_ACTIVE_TYPE)

    const datawise = {
      content: [LEAF_B],
      klWrapper: { id: 'wrap-dw', items: [LEAF_B] },
    }
    const inactive = await syncAssignmentKlWrapper('asg-dw', datawise, wrapOpts)
    assert.deepEqual(inactive, { id: 'wrap-dw', items: [LEAF_B], inactive: true })
    assert.equal(agent.created.length, 1)
  })

  it('wraps a Pethematicians sequence beside other items, but never one on its own', async () => {
    const agent = mockAgent()
    agent.metaById[PET] = { domain: KL_SEQUENCE_PLAYER_HOST, owner: 'someone-else', active_type: SEQUENCE_ACTIVE_TYPE }
    const mixed = { content: [LEAF, PET] }
    const saved = await syncAssignmentKlWrapper('asg-pet-mixed', mixed, wrapOpts)
    assert.deepEqual(saved, { id: 'wrap-1', items: [LEAF, PET] })

    const alone = { content: [PET] }
    assert.equal(await syncAssignmentKlWrapper('asg-pet-alone', alone, wrapOpts), null)
    assert.equal(alone.klWrapper, undefined)
    assert.equal(agent.created.length, 1)
  })

  it('marks an existing wrapper inactive on fallback and reactivates it when leaves are kl', async () => {
    const agent = mockAgent()
    const assignment = { content: [SEQ], klWrapper: { id: 'stale', items: [SEQ] } }
    assert.deepEqual(await syncAssignmentKlWrapper('asg-1', assignment, wrapOpts), {
      id: 'stale',
      items: [SEQ],
      inactive: true,
    })
    assert.equal(agent.created.length, 0)

    assignment.content = [PET]
    assignment.klWrapper = { id: 'stale', items: [PET] }
    assert.equal((await syncAssignmentKlWrapper('asg-1', assignment, wrapOpts)).inactive, true)
    assert.deepEqual(assignment.klWrapper.items, [PET])

    assignment.content = [GEN, LEAF]
    assignment.klWrapper = { id: 'stale', items: [GEN, LEAF] }
    assert.equal((await syncAssignmentKlWrapper('asg-1', assignment, wrapOpts)).id, 'stale')
    assert.deepEqual(assignment.klWrapper, { id: 'stale', items: [GEN, LEAF], inactive: true })

    const fresh = { content: [SEQ] }
    assert.equal(await syncAssignmentKlWrapper('asg-fresh', fresh, wrapOpts), null)
    assert.equal(fresh.klWrapper, undefined)

    const reactivate = {
      content: [LEAF],
      klWrapper: { id: 'wrap-stale', items: [SEQ], inactive: true },
    }
    const again = await syncAssignmentKlWrapper('asg-reactivate', reactivate, wrapOpts)
    assert.equal(again.inactive, undefined)
    assert.equal(again.id, 'wrap-stale')
    assert.deepEqual(again.items, [LEAF])
    assert.equal(agent.created.length, 0)
    assert.equal(agent.states['wrap-stale'].name, 'Homework')
  })

  it('keeps the existing wrapper when reuse throws, and names a new doc from the assignment', async () => {
    const agent = mockAgent()
    const assignment = { content: [LEAF], klWrapper: { id: 'wrap-old', items: [LEAF] } }
    const metadata = globalThis.Agent.metadata
    globalThis.Agent.metadata = async (id) => {
      if (id === 'wrap-old') throw new Error('metadata down')
      return metadata(id)
    }
    const saved = await syncAssignmentKlWrapper('asg-keep', assignment, wrapOpts)
    assert.equal(saved.id, 'wrap-old')
    assert.equal(assignment.klWrapper.inactive, undefined)
    assert.equal(agent.created.length, 0)

    globalThis.Agent.metadata = metadata
    globalThis.Agent.state = async (id) => {
      if (id === 'wrap-old') throw new Error('state down')
      if (!agent.states[id]) agent.states[id] = {}
      return agent.states[id]
    }
    const still = await syncAssignmentKlWrapper('asg-keep', assignment, wrapOpts)
    assert.equal(still.id, 'wrap-old')
    assert.equal(agent.created.length, 0)

    const fromState = { content: [LEAF], name: 'From state' }
    const named = await syncAssignmentKlWrapper('asg-named', fromState, { teacherToStudent: true })
    assert.equal(agent.created.at(-1).name, 'From state')
    assert.equal(agent.created.at(-1).active.name, 'From state')
    assert.equal(named.id, 'wrap-1')

    const fallback = { content: [LEAF], name: '   ' }
    await syncAssignmentKlWrapper('asg-fallback-name', fallback, { teacherToStudent: true, name: '' })
    assert.equal(agent.created.at(-1).name, 'Assignment')
    assert.equal(agent.created.at(-1).active.name, 'Assignment')
  })

  it('keeps the current wrapper when the save-side decision times out', async () => {
    globalThis.Agent.environment = () => new Promise(() => {})
    const assignment = {
      content: [LEAF],
      name: 'Homework',
      klWrapper: { id: 'keep-me', items: [LEAF] },
    }
    const saved = await syncAssignmentKlWrapper('asg-timeout', assignment, {
      ...wrapOpts,
      decisionTimeoutMs: 20,
    })
    assert.equal(saved.id, 'keep-me')
    assert.equal(saved.inactive, undefined)
    assert.deepEqual(assignment.klWrapper, { id: 'keep-me', items: [LEAF] })
  })

  it('keeps the existing field when a leaf cannot be classified', async () => {
    globalThis.Agent.metadata = async (id) => {
      if (id === 'asg-1') return { domain: HOST, owner: USER }
      throw new Error('metadata down')
    }
    const assignment = { content: [LEAF], klWrapper: { id: 'keep-me', items: [LEAF] } }
    const saved = await syncAssignmentKlWrapper('asg-1', assignment, wrapOpts)
    assert.equal(saved.id, 'keep-me')
    assert.deepEqual(assignment.klWrapper, { id: 'keep-me', items: [LEAF] })
  })

  it('does not write the assignment until apply, and apply deletes only on null', async () => {
    const agent = mockAgent()
    const assignment = { content: [LEAF], klWrapper: { id: 'stale', items: ['nope'] } }
    const prepared = await prepareAssignmentKlWrapper('asg-1', assignment.content, assignment.klWrapper, wrapOpts)
    assert.deepEqual(assignment.klWrapper, { id: 'stale', items: ['nope'] })
    assert.equal(prepared.id, 'wrap-1')
    assert.equal(agent.synced(), 1)
    assert.equal(applyAssignmentKlWrapper(assignment, prepared).id, 'wrap-1')
    assert.equal(applyAssignmentKlWrapper(assignment, { keep: true }).id, 'wrap-1')
    assert.equal(applyAssignmentKlWrapper(assignment, null), null)
    assert.equal(assignment.klWrapper, undefined)
  })

  it('runs one create when two saves overlap', async () => {
    const agent = mockAgent()
    let active = 0
    let maxActive = 0
    const metadata = globalThis.Agent.metadata
    globalThis.Agent.metadata = async (id) => {
      if (id === 'asg-1') {
        active += 1
        maxActive = Math.max(maxActive, active)
        await new Promise((resolve) => setTimeout(resolve, 30))
        active -= 1
      }
      return metadata(id)
    }
    const first = prepareAssignmentKlWrapper('asg-1', [LEAF, LEAF_B], null, wrapOpts)
    const second = prepareAssignmentKlWrapper('asg-1', [LEAF, LEAF_B], null, wrapOpts)
    const [a, b] = await Promise.all([first, second])
    assert.equal(a.id, 'wrap-1')
    assert.equal(b.id, 'wrap-1')
    assert.equal(agent.created.length, 1)
    assert.equal(maxActive, 1)
  })

  it('keeps klWrapper when the wrapper sync fails', async () => {
    const assignment = { content: [LEAF], klWrapper: { id: 'keep-me', items: [LEAF] } }
    globalThis.Agent.synced = async () => {
      throw new Error('sync failed')
    }
    const saved = await syncAssignmentKlWrapper('asg-1', assignment, wrapOpts)
    assert.equal(saved.id, 'keep-me')
    assert.deepEqual(assignment.klWrapper, { id: 'keep-me', items: [LEAF] })
  })

  it('does not treat a Know Learning player host as this app’s sequence player', () => {
    assert.equal(shouldPlaySameHostSequence({
      host: 'thailand.pilaproject.org',
      domain: 'thailand.pilaproject.org',
      player: KL_SEQUENCE_PLAYER_HOST,
      activeType: SEQUENCE_ACTIVE_TYPE,
      itemCount: 2,
    }), false)
  })

  it('dashboard group follows klWrapper.items even when they differ from content', () => {
    assert.deepEqual(klWrapperDashboardGroup({
      content: [LEAF],
      klWrapper: { id: 'wrap-9', items: [LEAF_B, LEAF] },
    }), {
      sequenceId: 'wrap-9',
      itemIds: [LEAF_B, LEAF],
    })
    assert.equal(klWrapperDashboardGroup({ content: [LEAF] }), null)
    assert.equal(klWrapperDashboardGroup({
      content: [LEAF],
      klWrapper: { id: 'wrap-9', items: [LEAF], inactive: true },
    }).sequenceId, 'wrap-9')
  })
})
