import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assignmentContentEndAction,
  competencyCardDismissFollowUp,
  isLastSequenceItem,
  normalizeAssignmentContent,
  sequenceItemCloseFollowUp,
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

describe('sequenceItemCloseFollowUp', () => {
  it('shows a competency card before ending the last item', () => {
    assert.equal(sequenceItemCloseFollowUp({
      itemCount: 2,
      itemIndex: 1,
      hasCompetencies: true,
    }), 'card')
  })

  it('ends this assignment piece after the last activity without scores', () => {
    assert.equal(sequenceItemCloseFollowUp({
      itemCount: 2,
      itemIndex: 1,
      hasCompetencies: false,
    }), 'end-content')
    assert.equal(sequenceItemCloseFollowUp({
      itemCount: 1,
      itemIndex: 0,
      hasCompetencies: false,
    }), 'end-content')
  })

  it('stays on an earlier activity so Next still works', () => {
    assert.equal(sequenceItemCloseFollowUp({
      itemCount: 2,
      itemIndex: 0,
      hasCompetencies: false,
    }), 'stay')
  })
})

describe('competencyCardDismissFollowUp', () => {
  it('advances inside the sequence when Next is offered', () => {
    assert.equal(competencyCardDismissFollowUp({
      itemCount: 2,
      itemIndex: 0,
      advance: true,
    }), 'next-item')
  })

  it('ends this assignment piece after the last item card', () => {
    assert.equal(competencyCardDismissFollowUp({
      itemCount: 2,
      itemIndex: 1,
      advance: false,
    }), 'end-content')
    assert.equal(competencyCardDismissFollowUp({
      itemCount: 1,
      itemIndex: 0,
      advance: false,
    }), 'end-content')
  })

  it('stays after an earlier item that did not earn Next', () => {
    assert.equal(competencyCardDismissFollowUp({
      itemCount: 2,
      itemIndex: 0,
      advance: false,
    }), 'stay')
  })
})

describe('sequence then another assignment content', () => {
  it('asks to continue after the last sequence activity of the first piece', () => {
    assert.equal(sequenceItemCloseFollowUp({
      itemCount: 2,
      itemIndex: 1,
      hasCompetencies: false,
    }), 'end-content')
    assert.equal(assignmentContentEndAction(2, 0), 'choose')
  })

  it('closes the assignment after the last sequence of a one-piece assignment', () => {
    assert.equal(sequenceItemCloseFollowUp({
      itemCount: 3,
      itemIndex: 2,
      hasCompetencies: false,
    }), 'end-content')
    assert.equal(assignmentContentEndAction(1, 0), 'close')
  })
})
