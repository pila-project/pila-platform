import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  addMembershipPair,
  belongsInIndex,
  createMembershipIndex,
  membersInIndex,
  rebuildMembershipIndex,
  removeMembershipPair,
} from './membership-index.js'

describe('rebuildMembershipIndex', () => {
  it('belongs true/false for non-archived records', () => {
    const { byUser } = rebuildMembershipIndex([
      { id: 'm1', user_id: 's1', group_id: 'g1', archived: false },
      { id: 'm2', user_id: 's2', group_id: 'g1', archived: false },
    ])
    assert.equal(belongsInIndex(byUser, 's1', 'g1'), true)
    assert.equal(belongsInIndex(byUser, 's2', 'g1'), true)
    assert.equal(belongsInIndex(byUser, 's1', 'g2'), false)
    assert.equal(belongsInIndex(byUser, 's3', 'g1'), false)
  })

  it('excludes archived memberships', () => {
    const { byGroup, byUser } = rebuildMembershipIndex([
      { id: 'm1', user_id: 's1', group_id: 'g1', archived: true },
      { id: 'm2', user_id: 's2', group_id: 'g1', archived: false },
    ])
    assert.equal(belongsInIndex(byUser, 's1', 'g1'), false)
    assert.equal(belongsInIndex(byUser, 's2', 'g1'), true)
    assert.deepEqual(membersInIndex(byGroup, 'g1'), ['s2'])
  })

  it('members(gid) is unique even with duplicate records', () => {
    const { byGroup } = rebuildMembershipIndex([
      { id: 'm1', user_id: 's1', group_id: 'g1', archived: false },
      { id: 'm2', user_id: 's1', group_id: 'g1', archived: false },
      { id: 'm3', user_id: 's2', group_id: 'g1', archived: false },
    ])
    assert.deepEqual(membersInIndex(byGroup, 'g1'), ['s1', 's2'])
  })

  it('rebuilds after a setMembers-style replace', () => {
    let index = rebuildMembershipIndex([
      { id: 'm1', user_id: 's1', group_id: 'g1', archived: false },
    ])
    assert.equal(belongsInIndex(index.byUser, 's1', 'g1'), true)

    index = rebuildMembershipIndex({
      m2: { user_id: 's9', group_id: 'g9', archived: false },
    })
    assert.equal(belongsInIndex(index.byUser, 's1', 'g1'), false)
    assert.equal(belongsInIndex(index.byUser, 's9', 'g9'), true)
    assert.deepEqual(membersInIndex(index.byGroup, 'g9'), ['s9'])
    assert.deepEqual(membersInIndex(index.byGroup, 'g1'), [])
  })

  it('empty members yields empty indexes', () => {
    const emptyList = rebuildMembershipIndex([])
    const emptyObj = rebuildMembershipIndex({})
    const missing = rebuildMembershipIndex(null)
    assert.equal(emptyList.byGroup.size, 0)
    assert.equal(emptyList.byUser.size, 0)
    assert.equal(emptyObj.byGroup.size, 0)
    assert.equal(missing.byUser.size, 0)
    assert.deepEqual(membersInIndex(emptyList.byGroup, 'g1'), [])
    assert.equal(belongsInIndex(emptyObj.byUser, 's1', 'g1'), false)
  })
})

describe('incremental membership index', () => {
  it('add / remove / unarchive a pair', () => {
    const { byGroup, byUser } = createMembershipIndex()

    addMembershipPair(byGroup, byUser, 's1', 'g1')
    assert.equal(belongsInIndex(byUser, 's1', 'g1'), true)
    assert.deepEqual(membersInIndex(byGroup, 'g1'), ['s1'])

    removeMembershipPair(byGroup, byUser, 's1', 'g1')
    assert.equal(belongsInIndex(byUser, 's1', 'g1'), false)
    assert.deepEqual(membersInIndex(byGroup, 'g1'), [])

    // unarchive = add the pair again
    addMembershipPair(byGroup, byUser, 's1', 'g1')
    assert.equal(belongsInIndex(byUser, 's1', 'g1'), true)
    assert.deepEqual(membersInIndex(byGroup, 'g1'), ['s1'])
  })

  it('add is idempotent; remove of a missing pair is a no-op', () => {
    const { byGroup, byUser } = createMembershipIndex()
    addMembershipPair(byGroup, byUser, 's1', 'g1')
    addMembershipPair(byGroup, byUser, 's1', 'g1')
    assert.deepEqual(membersInIndex(byGroup, 'g1'), ['s1'])
    removeMembershipPair(byGroup, byUser, 's9', 'g9')
    assert.equal(belongsInIndex(byUser, 's1', 'g1'), true)
  })
})
