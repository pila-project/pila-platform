import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { invalidateAll } from './content-cache.js'
import { SEQUENCE_ACTIVE_TYPE, partitionSequenceMemberIds } from './sequence-items.js'
import staticTranslations from '../store/staticTranslations.js'
import {
  ASSIGNMENT_SCOPE_MIXED,
  ASSIGNMENT_SCOPE_MIXED_KEY,
  ASSIGNMENT_SCOPE_MULTIPLE_SEQUENCES,
  ASSIGNMENT_SCOPE_OK,
  ASSIGNMENT_SCOPE_ONE_SEQUENCE_KEY,
  assessAssignmentContentScope,
  assignmentScopeAlertKey,
  assignmentScopeFromMembers,
} from './assignment-scope.js'

const LEAF_A = 'leaf-a'
const LEAF_B = 'leaf-b'
const SEQ_A = 'seq-a'
const SEQ_B = 'seq-b'
const LANGS = ['de', 'en', 'es', 'fr', 'km', 'lv', 'nl', 'pl', 'pt', 'sk', 'th']

beforeEach(() => {
  invalidateAll()
  globalThis.Agent = {
    metadata: async (id) => ({
      active_type: String(id).startsWith('seq-') ? SEQUENCE_ACTIVE_TYPE : 'application/json',
    }),
    state: async () => ({}),
    synced: async () => {},
  }
})

describe('assignmentScopeFromMembers', () => {
  it('allows empty, one sequence, or several activities', () => {
    assert.equal(assignmentScopeFromMembers([], []).reason, ASSIGNMENT_SCOPE_OK)
    assert.equal(assignmentScopeFromMembers([SEQ_A], []).ok, true)
    assert.equal(assignmentScopeFromMembers([], [LEAF_A, LEAF_B]).ok, true)
  })

  it('rejects a second sequence', () => {
    const scope = assignmentScopeFromMembers([SEQ_A, SEQ_B], [])
    assert.equal(scope.ok, false)
    assert.equal(scope.reason, ASSIGNMENT_SCOPE_MULTIPLE_SEQUENCES)
    assert.deepEqual(scope.sequences, [SEQ_A, SEQ_B])
  })

  it('rejects a sequence mixed with activities', () => {
    const scope = assignmentScopeFromMembers([SEQ_A], [LEAF_A])
    assert.equal(scope.reason, ASSIGNMENT_SCOPE_MIXED)
    assert.equal(assignmentScopeFromMembers([SEQ_A, SEQ_B], [LEAF_A]).reason, ASSIGNMENT_SCOPE_MIXED)
  })

  it('does not drop duplicate ids when classifying', () => {
    const scope = assignmentScopeFromMembers([SEQ_A, SEQ_A], [LEAF_A, LEAF_A])
    assert.deepEqual(scope.sequences, [SEQ_A])
    assert.deepEqual(scope.items, [LEAF_A])
    assert.equal(scope.reason, ASSIGNMENT_SCOPE_MIXED)
  })

  it('counts a one-item sequence as an item and keeps an unknown count as a sequence', () => {
    const one = assignmentScopeFromMembers([SEQ_A], [LEAF_A], { [SEQ_A]: 1 })
    assert.equal(one.ok, true)
    assert.deepEqual(one.sequences, [])
    assert.deepEqual(one.items, [SEQ_A, LEAF_A])

    const both = assignmentScopeFromMembers([SEQ_A, SEQ_B], [], { [SEQ_A]: 1, [SEQ_B]: '1' })
    assert.equal(both.ok, true)
    assert.deepEqual(both.items, [SEQ_A, SEQ_B])

    const unknown = assignmentScopeFromMembers([SEQ_A], [LEAF_A], {})
    assert.equal(unknown.reason, ASSIGNMENT_SCOPE_MIXED)
    assert.deepEqual(unknown.sequences, [SEQ_A])
    assert.deepEqual(unknown.items, [LEAF_A])

    const failed = assignmentScopeFromMembers([SEQ_A], [], { [SEQ_A]: null })
    assert.deepEqual(failed.sequences, [SEQ_A])

    const empty = assignmentScopeFromMembers([SEQ_A], [], { [SEQ_A]: 0 })
    assert.deepEqual(empty.sequences, [SEQ_A])
    assert.equal(empty.ok, true)

    const mixed = assignmentScopeFromMembers([SEQ_A, SEQ_B], [], { [SEQ_A]: 2, [SEQ_B]: 1 })
    assert.equal(mixed.reason, ASSIGNMENT_SCOPE_MIXED)
    assert.deepEqual(mixed.sequences, [SEQ_A])
    assert.deepEqual(mixed.items, [SEQ_B])
  })
})

describe('assessAssignmentContentScope', () => {
  it('uses active_type via partitionSequenceMemberIds', async () => {
    const one = await assessAssignmentContentScope([SEQ_A])
    assert.equal(one.ok, true)
    assert.deepEqual(one.sequences, [SEQ_A])

    const many = await assessAssignmentContentScope([LEAF_A, LEAF_B])
    assert.equal(many.ok, true)
    assert.deepEqual(many.items, [LEAF_A, LEAF_B])

    const mixed = await assessAssignmentContentScope([LEAF_A, SEQ_A])
    assert.equal(mixed.reason, ASSIGNMENT_SCOPE_MIXED)

    const two = await assessAssignmentContentScope([SEQ_A, SEQ_B])
    assert.equal(two.reason, ASSIGNMENT_SCOPE_MULTIPLE_SEQUENCES)
  })

  it('keeps every id in the result so a caller can refuse without dropping', async () => {
    const scope = await assessAssignmentContentScope([SEQ_A, LEAF_A, SEQ_B])
    assert.equal(scope.ok, false)
    assert.deepEqual(scope.sequences, [SEQ_A, SEQ_B])
    assert.deepEqual(scope.items, [LEAF_A])
  })

  it('honours knownSequenceIds without a metadata read', async () => {
    let calls = 0
    globalThis.Agent.metadata = async () => {
      calls++
      return { active_type: 'application/json' }
    }
    const scope = await assessAssignmentContentScope([SEQ_A, LEAF_A], {
      knownSequenceIds: [SEQ_A],
    })
    assert.equal(scope.reason, ASSIGNMENT_SCOPE_MIXED)
    assert.equal(calls, 1)
  })

  it('counts a one-item sequence as an item and does not read counts for leaves', async () => {
    const stateIds = []
    globalThis.Agent.state = async (id) => {
      stateIds.push(id)
      if (id === SEQ_A) return { items: [{ id: LEAF_A }] }
      if (id === SEQ_B) return { items: { 0: { id: 'a' }, 1: { id: 'b' } } }
      return { items: [] }
    }
    const one = await assessAssignmentContentScope([SEQ_A, LEAF_B])
    assert.equal(one.ok, true)
    assert.deepEqual(one.sequences, [])
    assert.deepEqual(one.items, [SEQ_A, LEAF_B])
    assert.deepEqual(stateIds, [SEQ_A])

    const mixed = await assessAssignmentContentScope([SEQ_A, SEQ_B])
    assert.equal(mixed.reason, ASSIGNMENT_SCOPE_MIXED)
    assert.deepEqual(mixed.sequences, [SEQ_B])
    assert.deepEqual(mixed.items, [SEQ_A])
  })

  it('keeps a sequence when the item count cannot be read', async () => {
    globalThis.Agent.state = async () => {
      throw new Error('state failed')
    }
    const failed = await assessAssignmentContentScope([SEQ_A, LEAF_A])
    assert.equal(failed.reason, ASSIGNMENT_SCOPE_MIXED)
    assert.deepEqual(failed.sequences, [SEQ_A])
    assert.deepEqual(failed.items, [LEAF_A])

    globalThis.Agent.state = () => new Promise(() => {})
    const hung = await assessAssignmentContentScope([SEQ_A], { timeoutMs: 20 })
    assert.deepEqual(hung.sequences, [SEQ_A])
    assert.deepEqual(hung.items, [])
  })

  it('does not classify a known sequence as a leaf when metadata hangs', async () => {
    const stateIds = []
    globalThis.Agent.metadata = () => new Promise(() => {})
    globalThis.Agent.state = async (id) => {
      stateIds.push(id)
      return { items: [{ id: 'a' }, { id: 'b' }] }
    }
    const hungLeaf = 'hung-leaf'
    const scope = await assessAssignmentContentScope([SEQ_A, hungLeaf], {
      knownSequenceIds: [SEQ_A],
      timeoutMs: 30,
    })
    assert.equal(scope.reason, ASSIGNMENT_SCOPE_MIXED)
    assert.deepEqual(scope.sequences, [SEQ_A])
    assert.deepEqual(scope.items, [hungLeaf])
    assert.deepEqual(stateIds, [SEQ_A])
  })

  it('leaves nesting on active_type for a one-item sequence', async () => {
    globalThis.Agent.state = async () => ({ items: [{ id: LEAF_A }] })
    const nested = await partitionSequenceMemberIds([SEQ_A, LEAF_A])
    assert.deepEqual(nested.rejectedSequences, [SEQ_A])
    assert.deepEqual(nested.allowed, [LEAF_A])
    const scope = await assessAssignmentContentScope([SEQ_A, LEAF_A])
    assert.equal(scope.ok, true)
    assert.deepEqual(scope.items, [SEQ_A, LEAF_A])
  })
})

describe('assignment scope copy', () => {
  it('maps reasons to translation keys present in every locale', () => {
    assert.equal(assignmentScopeAlertKey(ASSIGNMENT_SCOPE_OK), null)
    assert.equal(assignmentScopeAlertKey(ASSIGNMENT_SCOPE_MIXED), ASSIGNMENT_SCOPE_MIXED_KEY)
    assert.equal(
      assignmentScopeAlertKey(ASSIGNMENT_SCOPE_MULTIPLE_SEQUENCES),
      ASSIGNMENT_SCOPE_ONE_SEQUENCE_KEY,
    )
    assert.equal(
      staticTranslations[ASSIGNMENT_SCOPE_MIXED_KEY].en,
      'An assignment can include one sequence, or several single activities, but not both.',
    )
    assert.equal(
      staticTranslations[ASSIGNMENT_SCOPE_ONE_SEQUENCE_KEY].en,
      'You can only add one sequence to an assignment.',
    )
    for (const slug of [ASSIGNMENT_SCOPE_MIXED_KEY, ASSIGNMENT_SCOPE_ONE_SEQUENCE_KEY]) {
      for (const lang of LANGS) {
        assert.equal(typeof staticTranslations[slug][lang], 'string', `${slug}.${lang}`)
        assert.ok(staticTranslations[slug][lang].trim().length > 0, `${slug}.${lang} empty`)
      }
      assert.equal(staticTranslations[slug].th.endsWith('.'), true, `${slug}.th`)
    }
  })
})
