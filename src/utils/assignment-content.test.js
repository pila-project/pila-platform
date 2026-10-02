import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assignmentContentEndAction,
  normalizeAssignmentContent,
} from './assignment-content.js'

describe('assignmentContentEndAction', () => {
  it('closes an assignment that has one piece of content', () => {
    assert.equal(assignmentContentEndAction(1, 0), 'close')
  })

  it('asks before the next sequence and closes after the last one', () => {
    assert.equal(assignmentContentEndAction(2, 0), 'choose')
    assert.equal(assignmentContentEndAction(2, 1), 'close')
    assert.equal(assignmentContentEndAction(3, 1), 'choose')
    assert.equal(assignmentContentEndAction(3, 2), 'close')
  })

  it('closes when the index is missing or past the list', () => {
    assert.equal(assignmentContentEndAction(0, 0), 'close')
    assert.equal(assignmentContentEndAction(2, -1), 'close')
    assert.equal(assignmentContentEndAction(2, 2), 'close')
    assert.equal(assignmentContentEndAction(null, null), 'close')
    assert.equal(assignmentContentEndAction(2.5, 0), 'close')
  })
})

describe('normalizeAssignmentContent', () => {
  it('keeps every id, in order, from an array or a single id', () => {
    assert.deepEqual(normalizeAssignmentContent(['chirpy', 'karel']), ['chirpy', 'karel'])
    assert.deepEqual(normalizeAssignmentContent('only'), ['only'])
    assert.deepEqual(normalizeAssignmentContent(null), [])
  })
})
