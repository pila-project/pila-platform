import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { GEN_AI_SEQUENCES, PETHEMATICIANS_SINGLE_ITEM_IDS } from './constants.js'
import { CANDLI_PROGRAMMING_CONTENT_IDS } from './assignment-dashboards.js'
import { KL_SEQUENCE_PLAYER_HOST } from './sequence-items.js'
import {
  CUSTOM_DASHBOARD_APP_HOSTS,
  KL_DENY_RULES,
  classifyLeafDetailed,
  classifyLeaves,
  isKlPlayableShape,
  sequenceLeaves,
} from './kl-playability.js'

const LEAF = '11111111-1111-4111-8111-111111111111'
const LEAF_B = '22222222-2222-4222-8222-222222222222'
const LEAF_C = '44444444-4444-4444-8444-444444444444'
const SEQ = '33333333-3333-4333-8333-333333333333'
const DATAWISE = '55555555-5555-4555-8555-555555555555'
const PET = [...PETHEMATICIANS_SINGLE_ITEM_IDS][0]
const GEN = Object.keys(GEN_AI_SEQUENCES)[0]
const PROGRAMMING = CANDLI_PROGRAMMING_CONTENT_IDS.find((id) => id !== PET && id !== GEN)
const KL = KL_SEQUENCE_PLAYER_HOST
const PLAIN_URL = 'https://example.com/a'
const DATAWISE_URL = 'https://datawise.accingo.co/activity/demo'
const RCT_URL = 'https://rct-problem-creator.pilaproject.org/problem/1'
const BETTY_URL = 'https://bettysbrain.knowlearning.systems/bb/climate-change?oecd=true&disable-guide=true'

function question(id, extra = {}) {
  return {
    domain: KL,
    active_type: 'application/json;type=multiple-choice',
    state: {},
    ...extra,
    id,
  }
}

function install({ docs = {}, metadataThrow, stateThrow, timeout } = {}) {
  const calls = { metadata: 0, state: 0 }
  globalThis.Agent = {
    metadata: (id) => {
      calls.metadata += 1
      const throwThis = metadataThrow === true || (typeof metadataThrow === 'function' && metadataThrow(id))
      if (throwThis) return Promise.reject(new Error('metadata down'))
      if (timeout) return new Promise(() => {})
      const doc = docs[id] || question(id)
      return Promise.resolve({ domain: doc.domain, active_type: doc.active_type })
    },
    state: (id) => {
      calls.state += 1
      if (stateThrow && stateThrow(id)) return Promise.reject(new Error('state down'))
      if (timeout) return new Promise(() => {})
      const doc = docs[id] || question(id)
      return Promise.resolve(doc.state || {})
    },
  }
  return calls
}

describe('kl playable shape', () => {
  it('requires a non-empty array of objects with string ids', () => {
    assert.equal(isKlPlayableShape({ items: [{ id: LEAF }, { id: LEAF_B }] }), true)
    assert.equal(isKlPlayableShape({ items: [] }), false)
    assert.equal(isKlPlayableShape({ items: { 0: { id: LEAF } } }), false)
    assert.equal(isKlPlayableShape({ items: [{ id: '' }] }), false)
    assert.equal(isKlPlayableShape({ items: [LEAF] }), false)
    assert.equal(isKlPlayableShape(null), false)
  })

  it('reads items, and content only when items is missing', () => {
    assert.deepEqual(sequenceLeaves({ items: [{ id: LEAF }], content: [LEAF_B] }), [LEAF])
    assert.deepEqual(sequenceLeaves({ items: null, content: [LEAF, LEAF_B] }), [LEAF, LEAF_B])
    assert.deepEqual(sequenceLeaves({ content: { 0: { id: LEAF } } }), [LEAF])
  })
})

describe('classifyLeaves', () => {
  it('lists the deny rules and falls back when there are no ids', async () => {
    assert.deepEqual(KL_DENY_RULES, ['custom-dashboard', 'nested-sequence', 'not-embeddable'])
    assert.deepEqual(Object.keys(CUSTOM_DASHBOARD_APP_HOSTS), [
      'datawise.accingo.co',
      'bettysbrain.knowlearning.systems',
      'rct-problem-creator.pilaproject.org',
    ])
    const calls = install()
    assert.equal(await classifyLeaves([]), 'fallback')
    assert.equal(await classifyLeaves(null), 'fallback')
    assert.equal(calls.metadata, 0)
  })

  it('denies Datawise by domain, by URL content id, and by reference.dashboard', async () => {
    install({
      docs: {
        [LEAF]: question(LEAF, { domain: 'datawise.accingo.co' }),
      },
    })
    assert.deepEqual(await classifyLeafDetailed(LEAF), { verdict: 'deny', rule: 'custom-dashboard' })
    assert.equal(await classifyLeaves([LEAF]), 'fallback')

    const urlCalls = install()
    assert.deepEqual(await classifyLeafDetailed(DATAWISE_URL), { verdict: 'deny', rule: 'custom-dashboard' })
    assert.equal(await classifyLeaves([DATAWISE_URL]), 'fallback')
    assert.equal(urlCalls.metadata, 0)

    install({
      docs: {
        [LEAF]: question(LEAF, {
          state: { reference: { dashboard: 'https://datawise.accingo.co/dashboard' } },
        }),
      },
    })
    assert.equal(await classifyLeaves([LEAF]), 'fallback')
    assert.equal((await classifyLeafDetailed(LEAF)).rule, 'custom-dashboard')
  })

  it('denies Betty, RCT, and an RCT URL', async () => {
    install({
      docs: {
        [LEAF]: question(LEAF, { state: { id: BETTY_URL } }),
      },
    })
    assert.deepEqual(await classifyLeafDetailed(LEAF), { verdict: 'deny', rule: 'custom-dashboard' })
    assert.equal(await classifyLeaves([LEAF]), 'fallback')

    install({
      docs: {
        [LEAF]: question(LEAF, { domain: 'rct-problem-creator.pilaproject.org' }),
      },
    })
    assert.deepEqual(await classifyLeafDetailed(LEAF), { verdict: 'deny', rule: 'custom-dashboard' })
    assert.equal(await classifyLeaves([LEAF]), 'fallback')

    const urlCalls = install()
    assert.equal(await classifyLeaves([RCT_URL]), 'fallback')
    assert.equal((await classifyLeafDetailed(RCT_URL)).rule, 'custom-dashboard')
    assert.equal(urlCalls.metadata, 0)
  })

  it('denies a raw Betty player URL, including as a sequence leaf', async () => {
    const calls = install()
    assert.deepEqual(await classifyLeafDetailed(BETTY_URL), { verdict: 'deny', rule: 'custom-dashboard' })
    assert.equal(await classifyLeaves([BETTY_URL]), 'fallback')
    assert.equal(calls.metadata, 0)
    assert.equal(calls.state, 0)

    const leaves = sequenceLeaves({ items: [{ id: BETTY_URL }] })
    assert.deepEqual(leaves, [BETTY_URL])
    assert.equal(await classifyLeaves(leaves), 'fallback')
    assert.equal((await classifyLeafDetailed(leaves[0])).rule, 'custom-dashboard')
  })

  it('denies www.rct-problem-creator.pilaproject.org after host normalisation', async () => {
    const calls = install()
    const url = 'https://www.rct-problem-creator.pilaproject.org/problem/1'
    assert.equal((await classifyLeafDetailed(url)).rule, 'custom-dashboard')
    assert.equal(await classifyLeaves([url]), 'fallback')
    assert.equal(calls.metadata, 0)

    install({
      docs: {
        [LEAF]: question(LEAF, { domain: 'WWW.rct-problem-creator.pilaproject.org.' }),
      },
    })
    assert.equal((await classifyLeafDetailed(LEAF)).rule, 'custom-dashboard')
    assert.equal(await classifyLeaves([LEAF]), 'fallback')
  })

  it('denies an embed that wraps Datawise or RCT and allows one that wraps Candli', async () => {
    install({
      docs: {
        [LEAF]: {
          domain: 'embed.knowlearning.systems',
          active_type: 'application/json',
          state: { id: DATAWISE_URL },
        },
      },
    })
    assert.equal((await classifyLeafDetailed(LEAF)).rule, 'custom-dashboard')
    assert.equal(await classifyLeaves([LEAF]), 'fallback')

    const leaves = sequenceLeaves({ items: [{ id: LEAF }] })
    assert.deepEqual(leaves, [LEAF])
    assert.equal(await classifyLeaves(leaves), 'fallback')

    install({
      docs: {
        [LEAF_B]: {
          domain: 'embed.knowlearning.systems',
          active_type: 'application/json',
          state: { id: RCT_URL },
        },
      },
    })
    assert.equal((await classifyLeafDetailed(LEAF_B)).rule, 'custom-dashboard')
    assert.equal(await classifyLeaves([LEAF_B]), 'fallback')

    install({
      docs: {
        [LEAF_C]: {
          domain: 'embed.knowlearning.systems',
          active_type: 'application/json',
          state: { id: 'https://pila.cand.li/pila.html?game=mixology' },
        },
      },
    })
    assert.equal(await classifyLeaves([LEAF_C]), 'kl')
    assert.equal((await classifyLeafDetailed(LEAF_C)).verdict, 'kl')
  })

  it('denies a nested sequence, a gen-AI sequence id, and a non-embeddable string', async () => {
    install({
      docs: {
        [SEQ]: question(SEQ, { active_type: 'application/json;type=sequence' }),
      },
    })
    assert.deepEqual(await classifyLeafDetailed(SEQ), { verdict: 'deny', rule: 'nested-sequence' })
    assert.equal(await classifyLeaves([SEQ]), 'fallback')

    install()
    assert.equal((await classifyLeafDetailed(GEN)).rule, 'nested-sequence')
    assert.equal(await classifyLeaves([GEN]), 'fallback')

    const calls = install()
    assert.deepEqual(await classifyLeafDetailed('not-an-id'), { verdict: 'deny', rule: 'not-embeddable' })
    assert.equal(await classifyLeaves(['candli_editor/incredible_machine0']), 'fallback')
    assert.equal(calls.metadata, 0)
  })

  it('denies an embed doc that wraps the Betty player, with or without a scheme', async () => {
    install({
      docs: {
        [LEAF]: { domain: 'embed.knowlearning.systems', active_type: 'application/json', state: { id: BETTY_URL } },
        [LEAF_B]: { domain: 'embed.knowlearning.systems', active_type: 'application/json', state: { id: 'bettysbrain.knowlearning.systems/bb/climate-change' } },
      },
    })
    assert.deepEqual(await classifyLeafDetailed(LEAF), { verdict: 'deny', rule: 'custom-dashboard' })
    assert.equal((await classifyLeafDetailed(LEAF_B)).rule, 'custom-dashboard')
  })

  it('allows a Pethematicians single-item sequence as one item (UIUX-294)', async () => {
    install({
      docs: {
        [PET]: question(PET, { active_type: 'application/json;type=sequence' }),
      },
    })
    assert.deepEqual(await classifyLeafDetailed(PET), { verdict: 'kl', rule: null })
    assert.equal(await classifyLeaves([LEAF, PET]), 'kl')
  })

  it('allows karel, kl-json-form, Candli programming, an embed-host item, and an unknown host', async () => {
    install({
      docs: {
        [LEAF]: question(LEAF, { active_type: 'application/json;type=karel-task&version=1.0.1' }),
        [LEAF_B]: question(LEAF_B, { active_type: 'application/json;type=kl-json-form&version=1.0.1' }),
        [PROGRAMMING]: question(PROGRAMMING),
        [LEAF_C]: question(LEAF_C, {
          domain: 'embed.knowlearning.systems',
          active_type: 'application/json',
        }),
        [SEQ]: question(SEQ, {
          domain: 'widgets.example.org',
          active_type: 'application/json;type=widget',
        }),
      },
    })
    assert.equal(await classifyLeaves([LEAF]), 'kl')
    assert.equal(await classifyLeaves([LEAF_B]), 'kl')
    assert.equal(await classifyLeaves([PROGRAMMING]), 'kl')
    assert.notEqual(LEAF_C, GEN)
    assert.equal(await classifyLeaves([LEAF_C]), 'kl')
    assert.equal(await classifyLeaves([SEQ]), 'kl')
    assert.equal((await classifyLeafDetailed(LEAF)).rule, null)
  })

  it('allows a plain https URL without reading metadata, a KL question, and a Candli game', async () => {
    const calls = install()
    assert.deepEqual(await classifyLeafDetailed(PLAIN_URL), { verdict: 'kl', rule: null })
    assert.equal(await classifyLeaves([PLAIN_URL]), 'kl')
    assert.equal(calls.metadata, 0)
    assert.equal(calls.state, 0)

    install({
      docs: {
        [LEAF]: question(LEAF, { active_type: 'application/json;type=likert' }),
        [LEAF_B]: {
          domain: 'embed.knowlearning.systems',
          active_type: 'application/json',
          state: { id: 'https://pila.cand.li/pila.html?game=mixology' },
        },
      },
    })
    assert.equal(await classifyLeaves([LEAF]), 'kl')
    assert.equal(await classifyLeaves([LEAF_B]), 'kl')
  })

  it('allows a reference.dashboard on a host that is not a custom-dashboard app', async () => {
    install({
      docs: {
        [LEAF]: question(LEAF, {
          state: { reference: { dashboard: 'https://games.example/dash' } },
        }),
      },
    })
    assert.equal(await classifyLeaves([LEAF]), 'kl')
    assert.equal((await classifyLeafDetailed(LEAF)).verdict, 'kl')
  })

  it('aggregates mixed leaves with deny winning', async () => {
    install({
      docs: {
        [LEAF]: question(LEAF, { active_type: 'application/json;type=likert' }),
        [LEAF_B]: question(LEAF_B, { active_type: 'application/json;type=karel-task&version=1.0.1' }),
      },
    })
    assert.equal(await classifyLeaves([LEAF, LEAF_B, PLAIN_URL]), 'kl')

    install({
      docs: {
        [LEAF]: question(LEAF),
        [DATAWISE]: question(DATAWISE, { domain: 'datawise.accingo.co' }),
      },
    })
    assert.equal(await classifyLeaves([LEAF, DATAWISE]), 'fallback')

    install({
      docs: {
        [LEAF]: {
          domain: 'embed.knowlearning.systems',
          active_type: 'application/json',
          state: { id: 'https://pila.cand.li/pila.html?game=mixology' },
        },
        [LEAF_B]: question(LEAF_B, { state: { id: BETTY_URL } }),
        [LEAF_C]: question(LEAF_C, { active_type: 'application/json;type=karel-task&version=1.0.1' }),
      },
    })
    assert.equal(await classifyLeaves([LEAF, LEAF_B, LEAF_C]), 'fallback')

    install({
      docs: {
        [LEAF]: question(LEAF),
        [SEQ]: question(SEQ, { active_type: 'application/json;type=sequence' }),
      },
    })
    assert.equal(await classifyLeaves([LEAF, SEQ]), 'fallback')
  })

  it('classifies the leaves of a PILA sequence', async () => {
    const denied = sequenceLeaves({ items: [{ id: LEAF }, { id: DATAWISE }] })
    install({
      docs: {
        [LEAF]: question(LEAF),
        [DATAWISE]: question(DATAWISE, { domain: 'datawise.accingo.co' }),
      },
    })
    assert.deepEqual(denied, [LEAF, DATAWISE])
    assert.equal(await classifyLeaves(denied), 'fallback')

    const safe = sequenceLeaves({ items: [{ id: LEAF }, { id: LEAF_B }] })
    install({
      docs: {
        [LEAF]: question(LEAF, { active_type: 'application/json;type=matching' }),
        [LEAF_B]: question(LEAF_B, { active_type: 'application/json;type=karel-task&version=1.0.1' }),
      },
    })
    assert.equal(await classifyLeaves(safe), 'kl')
  })

  it('returns unknown when a read throws or times out and no leaf is denied', async () => {
    install({ metadataThrow: true })
    assert.equal(await classifyLeaves([LEAF]), 'unknown')
    assert.equal((await classifyLeafDetailed(LEAF)).verdict, 'unknown')

    install({ timeout: true })
    assert.equal(await classifyLeaves([LEAF], { timeoutMs: 20 }), 'unknown')
  })

  it('still falls back when a denied leaf has a sibling read that fails', async () => {
    install({
      docs: {
        [DATAWISE]: question(DATAWISE, { domain: 'datawise.accingo.co' }),
      },
      metadataThrow: (id) => id === LEAF,
    })
    assert.equal(await classifyLeaves([LEAF, DATAWISE], { timeoutMs: 50 }), 'fallback')
  })
})
