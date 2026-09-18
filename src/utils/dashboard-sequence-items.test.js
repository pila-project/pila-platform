import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  loadAssignmentDashboardSequenceItems,
  loadDashboardSequenceItems,
  primaryAssignmentContentId,
} from './dashboard-sequence-items.js'

function mockAgent({ states = {} } = {}) {
  globalThis.Agent = {
    state: async (id) => {
      if (Object.prototype.hasOwnProperty.call(states, id)) return states[id]
      return { items: {} }
    },
  }
}

beforeEach(() => {
  mockAgent()
})

describe('primaryAssignmentContentId', () => {
  it('returns the first assignment content id', () => {
    assert.equal(primaryAssignmentContentId({ content: ['a', 'b'] }), 'a')
    assert.equal(primaryAssignmentContentId({ content: 'only' }), 'only')
    assert.equal(primaryAssignmentContentId({}), null)
  })
})

describe('loadAssignmentDashboardSequenceItems (UIUX-237 union)', () => {
  it('unions items across all assignment content ids, not content[0] only', async () => {
    mockAgent({
      states: {
        'seq-a': { items: { 0: { id: 'leaf-1' }, 1: { id: 'leaf-2' } } },
        'seq-b': { items: { 0: { id: 'leaf-3' } } },
      },
    })
    const { items, groups } = await loadAssignmentDashboardSequenceItems({
      content: ['seq-a', 'seq-b'],
    })
    assert.deepEqual(items, ['leaf-1', 'leaf-2', 'leaf-3'])
    assert.deepEqual(groups, [
      { sequenceId: 'seq-a', itemIds: ['leaf-1', 'leaf-2'] },
      { sequenceId: 'seq-b', itemIds: ['leaf-3'] },
    ])
    assert.deepEqual(await loadDashboardSequenceItems('seq-a'), ['leaf-1', 'leaf-2'])
  })

  it('treats a playable leaf with no items as its own column', async () => {
    mockAgent({
      states: {
        'dw-1': { items: {} },
        'seq-ord': { items: { 0: { id: 'leaf-a' } } },
      },
    })
    const { items, groups } = await loadAssignmentDashboardSequenceItems({
      content: ['dw-1', 'seq-ord'],
    })
    assert.deepEqual(items, ['dw-1', 'leaf-a'])
    assert.deepEqual(groups, [
      { sequenceId: 'dw-1', itemIds: ['dw-1'] },
      { sequenceId: 'seq-ord', itemIds: ['leaf-a'] },
    ])
  })

  it('dedupes item ids while keeping per-content groups for performance merge', async () => {
    mockAgent({
      states: {
        'seq-a': { items: { 0: { id: 'shared' }, 1: { id: 'only-a' } } },
        'seq-b': { items: { 0: { id: 'shared' }, 1: { id: 'only-b' } } },
      },
    })
    const { items, groups } = await loadAssignmentDashboardSequenceItems({
      content: ['seq-a', 'seq-b'],
    })
    assert.deepEqual(items, ['shared', 'only-a', 'only-b'])
    assert.deepEqual(groups[1].itemIds, ['shared', 'only-b'])
  })
})
