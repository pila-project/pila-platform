import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { invalidateAll, metadataCache } from './content-cache.js'
import { CANDLI_SEQUENCES, PETHEMATICIANS_SINGLE_ITEM_IDS } from './constants.js'
import {
  SEQUENCE_ACTIVE_TYPE,
  SEQUENCE_DRAG_MIME,
  applyNestedSequenceDragReject,
  createNestedSequenceRejectToast,
  partitionSequenceMemberIds,
  appendItemsToSequence,
  isValidSequenceAgentState,
  persistSequenceItems,
  readSequenceItemIds,
  shownAsSequence,
  listedAsSequence,
  filterSequenceIdsForList,
  sequenceTypedIdsSeen,
  cachedSequenceTypedIds,
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

function fakeDragEvent(types, { dropEffect = 'copy' } = {}) {
  return {
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true },
    dataTransfer: { types, dropEffect },
  }
}

/** Parent.contains is true for itself and for `child`. */
function fakeParent(child) {
  return {
    contains(node) { return node === child || node === this },
  }
}

describe('nested sequence drag reject (UIUX-222)', () => {
  it('sets dropEffect none for a sequence drag and ignores a leaf drag', () => {
    const sequenceDrag = fakeDragEvent([SEQUENCE_DRAG_MIME, 'text/plain'])
    assert.equal(applyNestedSequenceDragReject(sequenceDrag), true)
    assert.equal(sequenceDrag.defaultPrevented, true)
    assert.equal(sequenceDrag.dataTransfer.dropEffect, 'none')

    const leafDrag = fakeDragEvent(['text/plain'])
    assert.equal(applyNestedSequenceDragReject(leafDrag), false)
    assert.equal(leafDrag.defaultPrevented, false)
    assert.equal(leafDrag.dataTransfer.dropEffect, 'copy')
    assert.equal(applyNestedSequenceDragReject(null), false)
  })

  it('toasts once per hover, not while moving across children, and again after leaving', () => {
    const messages = []
    const toast = createNestedSequenceRejectToast(
      (message) => messages.push(message),
      (slug) => `translated:${slug}`,
    )
    const child = {}
    const parent = fakeParent(child)
    const outside = {}

    const first = fakeDragEvent(['Text/Plain', SEQUENCE_DRAG_MIME.toUpperCase()])
    const second = fakeDragEvent([SEQUENCE_DRAG_MIME])
    assert.equal(toast.onDragOver(first), true)
    assert.equal(toast.onDragOver(second), true)
    assert.equal(first.dataTransfer.dropEffect, 'none')
    assert.equal(second.dataTransfer.dropEffect, 'none')
    assert.deepEqual(messages, ['translated:sequences-cannot-be-nested'])

    toast.onDragLeave({ currentTarget: parent, relatedTarget: child })
    toast.onDragOver(fakeDragEvent([SEQUENCE_DRAG_MIME]))
    assert.equal(messages.length, 1)

    toast.onDragLeave({ currentTarget: parent, relatedTarget: outside })
    toast.onDragOver(fakeDragEvent([SEQUENCE_DRAG_MIME]))
    // Null relatedTarget (pointer left the window) is a real leave.
    toast.onDragLeave({ currentTarget: parent, relatedTarget: null })
    toast.onDragOver(fakeDragEvent([SEQUENCE_DRAG_MIME]))
    assert.deepEqual(messages, [
      'translated:sequences-cannot-be-nested',
      'translated:sequences-cannot-be-nested',
      'translated:sequences-cannot-be-nested',
    ])

    const leafMessages = []
    const leafToast = createNestedSequenceRejectToast(
      (message) => leafMessages.push(message),
      (slug) => slug,
    )
    assert.equal(leafToast.onDragOver(fakeDragEvent(['text/plain', 'text'])), false)
    assert.deepEqual(leafMessages, [])
    // A separate target does not inherit the first hover's toasted flag.
    assert.equal(messages.length, 3)
  })

  it('keeps one toast when a null relatedTarget leave is followed by dragover', () => {
    const messages = []
    const toast = createNestedSequenceRejectToast(
      (message) => messages.push(message),
      (slug) => slug,
    )
    const boundary = {
      contains() { return false },
      getBoundingClientRect() { return { left: 0, top: 0, right: 100, bottom: 80 } },
    }
    const over = () => fakeDragEvent([SEQUENCE_DRAG_MIME])
    assert.equal(toast.onDragOver(over()), true)
    // Safari child-enter: relatedTarget null, pointer still inside, dragover follows.
    toast.onDragLeave({ currentTarget: boundary, relatedTarget: null, clientX: 40, clientY: 20 })
    toast.onDragOver(over())
    assert.deepEqual(messages, ['sequences-cannot-be-nested'])
    toast.onDragLeave({ currentTarget: boundary, relatedTarget: null, clientX: 180, clientY: 20 }, boundary)
    toast.onDragOver(over())
    assert.equal(messages.length, 2)
  })

  it('toasts again after a drag-end leave with the pointer still inside', async () => {
    const messages = []
    const toast = createNestedSequenceRejectToast(
      (message) => messages.push(message),
      (slug) => slug,
    )
    const boundary = {
      contains() { return false },
      getBoundingClientRect() { return { left: 0, top: 0, right: 100, bottom: 80 } },
    }
    const over = () => fakeDragEvent([SEQUENCE_DRAG_MIME])
    assert.equal(toast.onDragOver(over()), true)
    // Spec: operation "none" fires dragleave with no related target, then dragend.
    // No dragover follows. The next gesture must toast.
    toast.onDragLeave({ currentTarget: boundary, relatedTarget: null, clientX: 40, clientY: 20 })
    await new Promise((resolve) => queueMicrotask(resolve))
    toast.onDragOver(over())
    assert.deepEqual(messages, [
      'sequences-cannot-be-nested',
      'sequences-cannot-be-nested',
    ])
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

describe('player item shape', () => {
  it('rewrites a saved map as an array on teacher save and keeps extra fields', async () => {
    const doc = {
      items: {
        0: { id: LEAF, note: 'keep' },
        1: { id: 'other-leaf' },
      },
    }
    globalThis.Agent.metadata = async () => ({ active_type: 'application/json' })
    globalThis.Agent.state = async (id) => (id === HOST ? doc : {})
    const next = await persistSequenceItems(HOST, [LEAF])
    assert.deepEqual(next, [LEAF])
    assert.deepEqual(doc.items, [{ id: LEAF, note: 'keep' }])
  })

  it('appends onto an array-shaped sequence without turning it into a map', async () => {
    const doc = { items: [{ id: LEAF }] }
    globalThis.Agent.metadata = async () => ({ active_type: 'application/json' })
    globalThis.Agent.state = async (id) => (id === HOST ? doc : {})
    const result = await appendItemsToSequence(HOST, ['leaf-2'])
    assert.equal(result.added, 1)
    assert.deepEqual(doc.items, [{ id: LEAF }, { id: 'leaf-2' }])
    assert.equal(isValidSequenceAgentState(doc), true)
  })

  it('refuses the whole append when any selected id is a sequence', async () => {
    const doc = { items: [{ id: LEAF }] }
    let synced = 0
    let stateReads = 0
    globalThis.Agent.metadata = async (id) => ({
      active_type: id === SEQ ? SEQUENCE_ACTIVE_TYPE : 'application/json',
    })
    globalThis.Agent.state = async (id) => {
      stateReads++
      return id === HOST ? doc : {}
    }
    globalThis.Agent.synced = async () => { synced++ }
    const result = await appendItemsToSequence(HOST, ['leaf-2', SEQ])
    assert.equal(result.added, 0)
    assert.deepEqual(result.rejectedSequences, [SEQ])
    assert.deepEqual(doc.items, [{ id: LEAF }])
    assert.equal(synced, 0)
    assert.equal(stateReads, 0)
  })

  it('refuses a known one-item sequence without a metadata read', async () => {
    const one = 'one-item'
    const doc = { items: [{ id: LEAF }] }
    let metaCalls = 0
    globalThis.Agent.metadata = async () => {
      metaCalls++
      return never()
    }
    globalThis.Agent.state = async (id) => (id === HOST ? doc : {})
    const result = await appendItemsToSequence(HOST, [one], {
      knownSequenceIds: [one],
    })
    assert.deepEqual(result.rejectedSequences, [one])
    assert.equal(result.added, 0)
    assert.equal(metaCalls, 0)
    assert.deepEqual(doc.items, [{ id: LEAF }])
  })

  it('does not rewrite a map when the sequence is only read', async () => {
    const items = { 0: { id: LEAF } }
    const doc = { items }
    globalThis.Agent.state = async () => doc
    const ids = await readSequenceItemIds(HOST)
    assert.deepEqual(ids, [LEAF])
    assert.equal(doc.items, items)
  })
})

describe('shownAsSequence', () => {
  it('treats a one-item sequence as a single activity', () => {
    assert.equal(shownAsSequence(true, 1), false)
    assert.equal(shownAsSequence(true, '1'), false)
  })

  it('keeps a real sequence, an empty sequence, and an unknown count', () => {
    assert.equal(shownAsSequence(true, 2), true)
    assert.equal(shownAsSequence(true, 0), true)
    assert.equal(shownAsSequence(true, null), true)
    assert.equal(shownAsSequence(true, undefined), true)
    assert.equal(shownAsSequence(false, 3), false)
  })
})

describe('listedAsSequence (UIUX-294)', () => {
  const SEQUENCE = 'application/json;type=sequence'
  const pet = '7f7e8490-7e99-11f1-aeea-6d97e63b96db'

  it('treats only Pethematicians ids as single items', () => {
    assert.equal(PETHEMATICIANS_SINGLE_ITEM_IDS.size, 3)
    for (const id of PETHEMATICIANS_SINGLE_ITEM_IDS) {
      assert.ok(CANDLI_SEQUENCES[id], id)
      assert.equal(listedAsSequence(id, SEQUENCE), false)
      assert.equal(listedAsSequence(id, SEQUENCE, { assumeSequence: true }), false)
    }
    const one = 'one-item-seq'
    assert.equal(listedAsSequence(one, SEQUENCE), true)
    assert.equal(listedAsSequence(one, SEQUENCE, { assumeSequence: true }), true)
    assert.equal(listedAsSequence('leaf', 'application/json'), false)
    assert.equal(listedAsSequence(undefined, SEQUENCE), true)
    assert.deepEqual(filterSequenceIdsForList(['', one], { assumeSequence: true }), [one])
  })

  it('keeps a one-item sequence in lists and still leaves nesting to active_type', async () => {
    const one = 'one-item'
    const empty = 'empty-seq'
    const multi = 'multi-seq'
    const leaf = 'leaf-item'
    const ids = filterSequenceIdsForList([one, pet, empty, multi, leaf, ''], {
      activeType: {
        [one]: SEQUENCE,
        [pet]: SEQUENCE,
        [empty]: SEQUENCE,
        [multi]: SEQUENCE,
        [leaf]: 'application/json',
      },
    })
    assert.deepEqual(ids, [one, empty, multi])

    const assumed = filterSequenceIdsForList([one, pet, multi], { assumeSequence: true })
    assert.deepEqual(assumed, [one, multi])

    globalThis.Agent.metadata = async (id) => ({
      active_type: id === one || id === pet ? SEQUENCE : 'application/json',
    })
    const nested = await partitionSequenceMemberIds([one, pet, leaf], { timeoutMs: 50 })
    assert.deepEqual(nested.rejectedSequences, [one, pet])
    assert.deepEqual(nested.allowed, [leaf])

    const seen = sequenceTypedIdsSeen([one, pet, empty, multi, leaf], {
      [one]: SEQUENCE,
      [pet]: SEQUENCE,
      [empty]: SEQUENCE,
      [multi]: SEQUENCE,
      [leaf]: 'application/json',
    })
    assert.deepEqual(seen, [one, pet, empty, multi])
  })

  it('keeps a cached one-item sequence in the nesting id set', () => {
    metadataCache.set('one-item', { active_type: SEQUENCE })
    metadataCache.set(pet, { active_type: SEQUENCE })
    metadataCache.set('multi', { active_type: SEQUENCE })
    metadataCache.set('leaf', { active_type: 'application/json' })
    const ids = cachedSequenceTypedIds()
    assert.deepEqual(
      ids.filter(id => id === 'one-item' || id === pet || id === 'multi' || id === 'leaf').sort(),
      [pet, 'multi', 'one-item'].sort(),
    )
    assert.deepEqual(
      filterSequenceIdsForList(['one-item', pet, 'multi'], { assumeSequence: true }),
      ['one-item', 'multi'],
    )
  })
})
