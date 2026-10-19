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

  it('includes a kl wrapper group even when its items differ from content', async () => {
    mockAgent({
      states: {
        'leaf-a': { items: {} },
      },
    })
    const { items, groups } = await loadAssignmentDashboardSequenceItems({
      content: ['leaf-a'],
      klWrapper: { id: 'wrap-1', items: ['leaf-b', 'leaf-a'] },
    })
    assert.deepEqual(items, ['leaf-a'])
    assert.equal(groups[0].klWrapper, true)
    assert.equal(groups[0].sequenceId, 'wrap-1')
    assert.deepEqual(groups[0].itemIds, ['leaf-b', 'leaf-a'])
    assert.deepEqual(groups[1], { sequenceId: 'leaf-a', itemIds: ['leaf-a'] })
  })

  it('puts a matching kl wrapper group first and keeps per-leaf groups', async () => {
    mockAgent({
      states: {
        'leaf-a': { items: {} },
        'leaf-b': { items: {} },
      },
    })
    const { items, groups } = await loadAssignmentDashboardSequenceItems({
      content: ['leaf-a', 'leaf-b'],
      klWrapper: { id: 'wrap-1', items: ['leaf-a', 'leaf-b'] },
    })
    assert.deepEqual(items, ['leaf-a', 'leaf-b'])
    assert.deepEqual(groups, [
      { sequenceId: 'wrap-1', itemIds: ['leaf-a', 'leaf-b'], klWrapper: true },
      { sequenceId: 'leaf-a', itemIds: ['leaf-a'] },
      { sequenceId: 'leaf-b', itemIds: ['leaf-b'] },
    ])
  })
})
