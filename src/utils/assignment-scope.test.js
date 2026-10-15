import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { invalidateAll } from './content-cache.js'
import { PETHEMATICIANS_SINGLE_ITEM_IDS } from './constants.js'
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
      active_type: String(id).startsWith('seq-') || PETHEMATICIANS_SINGLE_ITEM_IDS.has(id)
        ? SEQUENCE_ACTIVE_TYPE
        : 'application/json',
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

  it('counts Pethematicians ids as items and every other sequence as a sequence', () => {
    const pet = '7f7e8490-7e99-11f1-aeea-6d97e63b96db'
    const one = assignmentScopeFromMembers([pet], [LEAF_A])
    assert.equal(one.ok, true)
    assert.deepEqual(one.sequences, [])
    assert.deepEqual(one.items, [pet, LEAF_A])

    const pets = assignmentScopeFromMembers([...PETHEMATICIANS_SINGLE_ITEM_IDS], [])
    assert.equal(pets.ok, true)
    assert.deepEqual(pets.sequences, [])
    assert.equal(pets.items.length, PETHEMATICIANS_SINGLE_ITEM_IDS.size)

    const seq = assignmentScopeFromMembers([SEQ_A], [LEAF_A])
    assert.equal(seq.reason, ASSIGNMENT_SCOPE_MIXED)
    assert.deepEqual(seq.sequences, [SEQ_A])
    assert.deepEqual(seq.items, [LEAF_A])

    const mixed = assignmentScopeFromMembers([SEQ_A, pet], [])
    assert.equal(mixed.reason, ASSIGNMENT_SCOPE_MIXED)
    assert.deepEqual(mixed.sequences, [SEQ_A])
    assert.deepEqual(mixed.items, [pet])
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

  it('counts Pethematicians ids as items and does not read item counts', async () => {
    const stateIds = []
    globalThis.Agent.state = async (id) => {
      stateIds.push(id)
      return { items: [{ id: LEAF_A }] }
    }
    const pet = 'e7bd0050-1bb1-11f0-a107-d7050efaf0bb'
    const one = await assessAssignmentContentScope([SEQ_A, LEAF_B])
    assert.equal(one.reason, ASSIGNMENT_SCOPE_MIXED)
    assert.deepEqual(one.sequences, [SEQ_A])
    assert.deepEqual(one.items, [LEAF_B])

    const asItem = await assessAssignmentContentScope([pet, LEAF_B])
    assert.equal(asItem.ok, true)
    assert.deepEqual(asItem.sequences, [])
    assert.deepEqual(asItem.items, [pet, LEAF_B])

    const allPets = await assessAssignmentContentScope([...PETHEMATICIANS_SINGLE_ITEM_IDS])
    assert.equal(allPets.ok, true)
    assert.deepEqual(allPets.sequences, [])
    assert.equal(allPets.items.length, PETHEMATICIANS_SINGLE_ITEM_IDS.size)
    assert.deepEqual(stateIds, [])
  })

  it('keeps a sequence when state cannot be read', async () => {
    globalThis.Agent.state = async () => {
      throw new Error('state failed')
    }
    const failed = await assessAssignmentContentScope([SEQ_A, LEAF_A])
    assert.equal(failed.reason, ASSIGNMENT_SCOPE_MIXED)
    assert.deepEqual(failed.sequences, [SEQ_A])
    assert.deepEqual(failed.items, [LEAF_A])
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
    assert.deepEqual(stateIds, [])
  })

  it('leaves nesting on active_type and keeps a one-item sequence as a sequence', async () => {
    globalThis.Agent.state = async () => ({ items: [{ id: LEAF_A }] })
    const pet = 'f73759d0-24d1-11f0-a6bf-e576da95b533'
    const nested = await partitionSequenceMemberIds([SEQ_A, pet, LEAF_A])
    assert.deepEqual(nested.rejectedSequences, [SEQ_A, pet])
    assert.deepEqual(nested.allowed, [LEAF_A])
    const scope = await assessAssignmentContentScope([SEQ_A, LEAF_A])
    assert.equal(scope.reason, ASSIGNMENT_SCOPE_MIXED)
    assert.deepEqual(scope.sequences, [SEQ_A])
    assert.deepEqual(scope.items, [LEAF_A])
    const petScope = await assessAssignmentContentScope([pet, LEAF_A])
    assert.equal(petScope.ok, true)
    assert.deepEqual(petScope.sequences, [])
    assert.deepEqual(petScope.items, [pet, LEAF_A])
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
      assert.equal(staticTranslations[slug].th.endsWith('.'), false, `${slug}.th`)
    }
  })
})
