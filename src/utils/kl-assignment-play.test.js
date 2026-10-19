import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { GEN_AI_SEQUENCES, PETHEMATICIANS_SINGLE_ITEM_IDS } from './constants.js'
import { clearCandliProgrammingChildCache } from './assignment-dashboards.js'
import { KL_SEQUENCE_PLAYER_HOST } from './sequence-items.js'
import { leafPerformancePath } from './leaf-performance.js'
import { planKlAssignmentPlay } from './kl-assignment-play.js'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const SEQ = '33333333-3333-4333-8333-333333333333'
const PET = [...PETHEMATICIANS_SINGLE_ITEM_IDS][0]
const GEN = Object.keys(GEN_AI_SEQUENCES)[0]
const HOST = 'thailand.pilaproject.org'

function install(docs = {}) {
  const calls = { metadata: [], state: [], synced: 0 }
  globalThis.Agent = {
    metadata: async (id) => {
      calls.metadata.push(id)
      return docs[id]?.meta || { domain: HOST, active_type: 'application/json' }
    },
    state: async (id) => {
      calls.state.push(id)
      if (!docs[id]) docs[id] = { state: {} }
      if (!docs[id].state) docs[id].state = {}
      return docs[id].state
    },
    synced: async () => {
      calls.synced += 1
    },
  }
  return { calls, docs }
}

beforeEach(() => {
  clearCandliProgrammingChildCache()
})

describe('planKlAssignmentPlay', () => {
  it('embeds the wrapper URL when the doc, the field, and the content match', async () => {
    install({
      'wrap-1': { state: { items: [{ id: A }, { id: B }] } },
    })
    const plan = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: {
        content: [A, B],
        klWrapper: { id: 'wrap-1', items: [A, B] },
      },
    })
    assert.deepEqual(plan, {
      kind: 'kl',
      playableId: `https://${KL_SEQUENCE_PLAYER_HOST}/wrap-1`,
    })
  })

  it('rechecks a stored wrapper and plays KL only when every leaf is still allowed', async () => {
    const safeState = {
      content: [A, B],
      klWrapper: { id: 'wrap-1', items: [A, B] },
    }
    install({
      'wrap-1': { state: { items: [{ id: A }, { id: B }] } },
      [A]: {
        meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json;type=matching' },
        state: {},
      },
      [B]: {
        meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json;type=true-false' },
        state: {},
      },
    })
    const safe = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: safeState,
    })
    assert.equal(safe.kind, 'kl')
    assert.deepEqual(safeState.klWrapper, { id: 'wrap-1', items: [A, B] })

    const deniedState = {
      content: [A],
      klWrapper: { id: 'wrap-1', items: [A] },
    }
    install({
      'wrap-1': { state: { items: [{ id: A }] } },
      [A]: {
        meta: { domain: 'datawise.accingo.co', active_type: 'application/json' },
        state: {},
      },
    })
    const denied = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: deniedState,
    })
    assert.deepEqual(denied, { kind: 'today' })
    assert.deepEqual(deniedState.klWrapper, { id: 'wrap-1', items: [A] })

    const unreadState = {
      content: [A],
      klWrapper: { id: 'wrap-1', items: [A] },
    }
    install({
      'wrap-1': { state: { items: [{ id: A }] } },
    })
    globalThis.Agent.metadata = async (id) => {
      if (id === A) throw new Error('metadata down')
      return { domain: HOST, active_type: 'application/json' }
    }
    const unread = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: unreadState,
    })
    assert.deepEqual(unread, { kind: 'today' })
    assert.deepEqual(unreadState.klWrapper, { id: 'wrap-1', items: [A] })
  })

  it('uses today when the wrapper doc does not match, or legacy progress is the only real progress', async () => {
    install({
      'wrap-1': { state: { items: [{ id: B }, { id: A }] } },
    })
    const mismatch = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [A, B], klWrapper: { id: 'wrap-1', items: [A, B] } },
    })
    assert.equal(mismatch.kind, 'today')

    const docs = {
      'wrap-1': { state: { items: [{ id: A }] } },
      [leafPerformancePath('asg-1', 'wrap-1')]: {
        state: { itemInfo: { [`0/${A}`]: { time: 0, correct: null } } },
      },
      [leafPerformancePath('asg-1', A)]: {
        state: { itemInfo: { [`0/${A}`]: { time: 0, correct: 'completed' } } },
      },
    }
    install(docs)
    const legacy = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [A], klWrapper: { id: 'wrap-1', items: [A] } },
    })
    assert.equal(legacy.kind, 'today')

    docs[leafPerformancePath('asg-1', 'wrap-1')].state.itemInfo[`0/${A}`] = { time: 2, correct: true }
    const both = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [A], klWrapper: { id: 'wrap-1', items: [A] } },
    })
    assert.equal(both.kind, 'kl')
  })

  it('embeds a single PILA sequence and leaves a missing itemInfo for Know Learning', async () => {
    const { docs, calls } = install({
      [SEQ]: {
        meta: { domain: HOST, active_type: 'application/json;type=sequence' },
        state: { items: [{ id: A }, { id: B }] },
      },
      [A]: {
        meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json;type=matching' },
        state: {},
      },
      [B]: {
        meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json;type=true-false' },
        state: {},
      },
    })
    const plan = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [SEQ] },
    })
    assert.equal(plan.kind, 'kl')
    assert.equal(plan.playableId, `https://${KL_SEQUENCE_PLAYER_HOST}/${SEQ}`)
    const perf = docs[leafPerformancePath('asg-1', SEQ)].state
    assert.equal(perf.itemInfo, undefined)
    assert.equal(perf.sequenceXapiLogMirror, undefined)
    assert.equal(perf.activeItemIndex, undefined)
    assert.equal(calls.synced, 0)
  })

  it('fills only missing keys on an existing sequence or wrapper progress doc', async () => {
    const seqPath = leafPerformancePath('asg-1', SEQ)
    const { docs, calls } = install({
      [SEQ]: {
        meta: { domain: HOST, active_type: 'application/json;type=sequence' },
        state: {
          items: [{ id: A }, { id: B }],
          reference: { player: `https://${KL_SEQUENCE_PLAYER_HOST}/` },
        },
      },
      [A]: {
        meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json;type=matching' },
        state: {},
      },
      [B]: {
        meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json;type=true-false' },
        state: {},
      },
      [seqPath]: {
        state: {
          itemInfo: { [`0/${A}`]: { time: 4, correct: true } },
          activeItemIndex: null,
          sequenceXapiLogMirror: ['keep'],
        },
      },
    })
    const plan = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [SEQ] },
    })
    assert.equal(plan.kind, 'kl')
    const perf = docs[seqPath].state
    assert.deepEqual(perf.itemInfo[`0/${A}`], { time: 4, correct: true })
    assert.deepEqual(perf.itemInfo[`1/${B}`], { time: 0, correct: null })
    assert.equal(perf.activeItemIndex, null)
    assert.deepEqual(perf.sequenceXapiLogMirror, ['keep'])
    assert.equal(calls.synced, 1)

    docs[seqPath].state.activeItemIndex = 9
    docs[seqPath].state.sequenceXapiLogMirror = null
    docs[seqPath].state.itemInfo[`1/${B}`] = 'not-a-cell'
    const clamped = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [SEQ] },
    })
    assert.equal(clamped.kind, 'kl')
    assert.equal(docs[seqPath].state.activeItemIndex, 0)
    assert.deepEqual(docs[seqPath].state.sequenceXapiLogMirror, [])
    assert.deepEqual(docs[seqPath].state.itemInfo[`1/${B}`], { time: 0, correct: null })

    docs[seqPath].state.activeItemIndex = '2'
    await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [SEQ] },
    })
    assert.equal(docs[seqPath].state.activeItemIndex, 0)

    const wrapPath = leafPerformancePath('asg-1', 'wrap-1')
    const wrapDocs = {
      'wrap-1': { state: { items: [{ id: A }, { id: B }] } },
      [wrapPath]: {
        state: {
          itemInfo: {},
          activeItemIndex: 1.5,
        },
      },
    }
    install(wrapDocs)
    const wrapped = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: {
        content: [A, B],
        klWrapper: { id: 'wrap-1', items: [A, B] },
      },
    })
    assert.equal(wrapped.kind, 'kl')
    const wrapPerf = wrapDocs[wrapPath].state
    assert.deepEqual(wrapPerf.itemInfo[`0/${A}`], { time: 0, correct: null })
    assert.deepEqual(wrapPerf.itemInfo[`1/${B}`], { time: 0, correct: null })
    assert.equal(wrapPerf.activeItemIndex, 0)
    assert.deepEqual(wrapPerf.sequenceXapiLogMirror, [])
  })

  it('keeps today for a KL-made sequence, a legacy map, a denied leaf, pets, and gen-ai', async () => {
    install({
      [SEQ]: {
        meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json;type=sequence' },
        state: { items: [{ id: A }] },
      },
    })
    assert.equal((await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [SEQ] },
    })).kind, 'today')

    install({
      [SEQ]: {
        meta: { domain: HOST, active_type: 'application/json;type=sequence' },
        state: { items: { 0: { id: A } } },
      },
    })
    assert.equal((await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [SEQ] },
    })).kind, 'today')

    install({
      [SEQ]: {
        meta: { domain: HOST, active_type: 'application/json;type=sequence' },
        state: { items: [{ id: A }] },
      },
      [A]: {
        meta: { domain: 'datawise.accingo.co', active_type: 'application/json' },
        state: {},
      },
    })
    assert.equal((await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [SEQ] },
    })).kind, 'today')

    const { calls } = install()
    assert.equal((await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [PET] },
    })).kind, 'today')
    assert.equal((await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [GEN] },
    })).kind, 'today')
    assert.equal(calls.metadata.length, 0)

    install()
    assert.equal((await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [A, B] },
    })).kind, 'today')
  })

  it('uses today for a non-sequence, a foreign player, or an unusable wrapper id', async () => {
    const { calls } = install({
      [SEQ]: {
        meta: { domain: HOST, active_type: 'application/json;type=multiple-choice' },
        state: { items: [{ id: A }] },
      },
      [A]: {
        meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json;type=matching' },
        state: {},
      },
    })
    assert.equal((await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [SEQ] },
    })).kind, 'today')
    assert.equal(calls.state.includes(A), false)

    install({
      [SEQ]: {
        meta: { domain: HOST, active_type: 'application/json;type=sequence' },
        state: {
          items: [{ id: A }],
          reference: { player: 'expert.example.org' },
        },
      },
      [A]: {
        meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json;type=matching' },
        state: {},
      },
    })
    assert.equal((await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [SEQ] },
    })).kind, 'today')

    const playable = install({
      'wrap-1': { state: { items: [{ id: B }] } },
      [SEQ]: {
        meta: { domain: HOST, active_type: 'application/json;type=sequence' },
        state: { items: [{ id: A }] },
      },
      [A]: {
        meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json;type=matching' },
        state: {},
      },
    })
    assert.equal((await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [SEQ], klWrapper: { id: 'wrap-1', items: [SEQ] } },
    })).kind, 'today')
    assert.equal(playable.calls.metadata.includes(SEQ), false)

    globalThis.Agent.state = async (id) => {
      if (id === 'wrap-1') throw new Error('wrapper down')
      return {}
    }
    assert.equal((await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [SEQ], klWrapper: { id: 'wrap-1', items: [A] } },
    })).kind, 'today')

    install({
      [SEQ]: {
        meta: { domain: HOST, active_type: 'application/json;type=sequence' },
        state: { items: [{ id: A }] },
      },
      [A]: {
        meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json;type=matching' },
        state: {},
      },
    })
    const inactive = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: {
        content: [SEQ],
        klWrapper: { id: 'wrap-1', items: [SEQ], inactive: true },
      },
    })
    assert.equal(inactive.kind, 'kl')
    assert.equal(inactive.playableId, `https://${KL_SEQUENCE_PLAYER_HOST}/${SEQ}`)
  })

  it('uses today when the whole play decision times out', async () => {
    install()
    globalThis.Agent.state = () => new Promise(() => {})
    globalThis.Agent.metadata = () => new Promise(() => {})
    const plan = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [A, B], klWrapper: { id: 'wrap-1', items: [A, B] } },
      timeoutMs: 80,
      decisionTimeoutMs: 30,
    })
    assert.deepEqual(plan, { kind: 'today' })
  })

  it('keeps today for trunk-era string content and does not read metadata', async () => {
    const { calls } = install({
      [SEQ]: {
        meta: { domain: HOST, active_type: 'application/json;type=sequence' },
        state: { items: [{ id: A }] },
      },
      [A]: {
        meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json;type=matching' },
        state: {},
      },
    })
    const plan = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: SEQ },
    })
    assert.deepEqual(plan, { kind: 'today' })
    assert.equal(calls.metadata.length, 0)
    assert.equal(calls.state.length, 0)
  })

  it('uses today for a single raw URL and does not read metadata', async () => {
    const { calls } = install()
    const plan = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: ['https://example.com/activity'] },
    })
    assert.deepEqual(plan, { kind: 'today' })
    assert.equal(calls.metadata.length, 0)
    assert.equal(calls.state.length, 0)
  })

  it('embeds a PILA sequence whose leaves include karel', async () => {
    install({
      [SEQ]: {
        meta: { domain: HOST, active_type: 'application/json;type=sequence' },
        state: { items: [{ id: A }, { id: B }] },
      },
      [A]: {
        meta: {
          domain: KL_SEQUENCE_PLAYER_HOST,
          active_type: 'application/json;type=karel-task&version=1.0.1',
        },
        state: {},
      },
      [B]: {
        meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json;type=matching' },
        state: {},
      },
    })
    const plan = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [SEQ] },
    })
    assert.equal(plan.kind, 'kl')
    assert.equal(plan.playableId, `https://${KL_SEQUENCE_PLAYER_HOST}/${SEQ}`)
  })

  it('uses today when a PILA sequence has a Betty leaf', async () => {
    install({
      [SEQ]: {
        meta: { domain: HOST, active_type: 'application/json;type=sequence' },
        state: { items: [{ id: A }] },
      },
      [A]: {
        meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json' },
        state: { id: 'https://bettysbrain.knowlearning.systems/player/mod/1' },
      },
    })
    assert.equal((await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [SEQ] },
    })).kind, 'today')
  })

  it('keeps a lone Pethematicians on today even with a stored wrapper, and wraps one beside other items', async () => {
    const { calls } = install({ 'wrap-pet': { state: { items: [{ id: PET }] } } })
    assert.equal((await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [PET], klWrapper: { id: 'wrap-pet', items: [PET] } },
    })).kind, 'today')
    assert.equal(calls.state.length, 0)

    install({
      'wrap-2': { state: { items: [{ id: A }, { id: PET }] } },
      [PET]: { meta: { domain: KL_SEQUENCE_PLAYER_HOST, active_type: 'application/json;type=sequence' }, state: {} },
    })
    const plan = await planKlAssignmentPlay({
      assignmentId: 'asg-1',
      assignmentState: { content: [A, PET], klWrapper: { id: 'wrap-2', items: [A, PET] } },
    })
    assert.deepEqual(plan, { kind: 'kl', playableId: `https://${KL_SEQUENCE_PLAYER_HOST}/wrap-2` })
  })
})

