import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { invalidateAll } from './content-cache.js'
import {
  SEQUENCE_ACTIVE_TYPE,
  partitionSequenceMemberIds,
  persistSequenceItems,
  withTimeout,
} from './sequence-items.js'

const LEAF = 'leaf-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const SEQ = 'seq-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const HOST = 'host-cccccccccccccccccccccccccccccccccccc'
const HUNG_LEAF = 'hung-leaf-dddddddd-dddd-dddd-dddd-dddddddddddd'
const PERSIST_HUNG_LEAF = 'persist-hung-eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'

function never() {
  return new Promise(() => {})
}

beforeEach(() => {
  invalidateAll()
  globalThis.Agent = {
    metadata: async () => ({ active_type: 'application/json' }),
    state: async () => ({ items: {} }),
    synced: async () => {},
  }
})

describe('withTimeout (UIUX-229)', () => {
  it('resolves when the promise finishes in time', async () => {
    const value = await withTimeout(Promise.resolve(7), 50, 'timed out')
    assert.equal(value, 7)
  })

  it('rejects hung promises so Update cannot spin forever', async () => {
    await assert.rejects(
      () => withTimeout(never(), 20, 'Sequence metadata timed out'),
      { message: 'Sequence metadata timed out' },
    )
  })
})

describe('partitionSequenceMemberIds metadata timeout (UIUX-229)', () => {
  it('rejects known sequence ids without calling metadata', async () => {
    let metaCalls = 0
    globalThis.Agent.metadata = async () => {
      metaCalls++
      return { active_type: 'application/json' }
    }
    const result = await partitionSequenceMemberIds([SEQ, LEAF], {
      knownSequenceIds: [SEQ],
      timeoutMs: 50,
    })
    assert.deepEqual(result.rejectedSequences, [SEQ])
    assert.deepEqual(result.allowed, [LEAF])
    assert.equal(metaCalls, 1)
  })

  it('rejects proven nested sequences from metadata active_type', async () => {
    globalThis.Agent.metadata = async (id) => ({
      active_type: id === SEQ ? SEQUENCE_ACTIVE_TYPE : 'application/json',
    })
    const result = await partitionSequenceMemberIds([SEQ, LEAF], { timeoutMs: 50 })
    assert.deepEqual(result.rejectedSequences, [SEQ])
    assert.deepEqual(result.allowed, [LEAF])
  })

  it('fail-opens and returns within timeout when Agent.metadata hangs', async () => {
    globalThis.Agent.metadata = () => never()
    const started = Date.now()
    const result = await partitionSequenceMemberIds([HUNG_LEAF], { timeoutMs: 30 })
    const elapsed = Date.now() - started
    assert.deepEqual(result.allowed, [HUNG_LEAF])
    assert.deepEqual(result.rejectedSequences, [])
    assert.ok(elapsed < 200, `hung metadata took ${elapsed}ms`)
  })
})

describe('persistSequenceItems Update path (UIUX-229)', () => {
  it('still persists when remaining-item metadata hangs (fail-open + timeout)', async () => {
    const items = { 0: { id: PERSIST_HUNG_LEAF } }
    globalThis.Agent.metadata = () => never()
    globalThis.Agent.state = async (id) => {
      if (id === HOST) return { items }
      return {}
    }
    const next = await persistSequenceItems(HOST, [PERSIST_HUNG_LEAF], { timeoutMs: 30 })
    assert.deepEqual(next, [PERSIST_HUNG_LEAF])
  })

  it('persists an empty list after deleting the last item without metadata', async () => {
    let metaCalls = 0
    globalThis.Agent.metadata = async () => {
      metaCalls++
      return never()
    }
    globalThis.Agent.state = async (id) => {
      if (id === HOST) return { items: {} }
      return {}
    }
    const next = await persistSequenceItems(HOST, [], { timeoutMs: 30 })
    assert.deepEqual(next, [])
    assert.equal(metaCalls, 0)
  })
})
