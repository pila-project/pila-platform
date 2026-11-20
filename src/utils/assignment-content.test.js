import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assignmentContentEndAction,
  closePayload,
  isLastSequenceItem,
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

describe('isLastSequenceItem', () => {
  it('is true only for the last in-range item', () => {
    assert.equal(isLastSequenceItem(1, 0), true)
    assert.equal(isLastSequenceItem(2, 0), false)
    assert.equal(isLastSequenceItem(2, 1), true)
    assert.equal(isLastSequenceItem(0, 0), false)
    assert.equal(isLastSequenceItem(2, 2), false)
  })
})

describe('closePayload', () => {
  it('unwraps the embed close message and leaves a plain payload alone', () => {
    const plain = { success: true, competencies: { 'compute:addition': [1, 3] } }
    assert.equal(closePayload(plain), plain)
    assert.deepEqual(
      closePayload({ type: 'close', info: plain }).competencies['compute:addition'],
      [1, 3],
    )
  })
})

describe('sequence then another assignment content', () => {
  it('asks to continue after the last sequence activity of the first piece', () => {
    assert.equal(isLastSequenceItem(2, 1), true)
    assert.equal(assignmentContentEndAction(2, 0), 'choose')
  })

  it('closes the assignment after the last sequence of a one-piece assignment', () => {
    assert.equal(isLastSequenceItem(3, 2), true)
    assert.equal(assignmentContentEndAction(1, 0), 'close')
  })
})
