import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isSequenceMetadata, sequenceCountsAuthoritative } from './teacher-home.js'
import { shownAsSequence } from './sequence-items.js'

describe('isSequenceMetadata (UIUX-294)', () => {
  const sequence = { active_type: 'application/json;type=sequence' }

  it('matches shownAsSequence for count 1, empty, unknown, and multi-item', () => {
    for (const count of [0, 1, 2, '1', null, undefined, '']) {
      assert.equal(
        isSequenceMetadata(sequence, count),
        shownAsSequence(true, count),
        String(count),
      )
    }
    assert.equal(isSequenceMetadata({ active_type: 'application/json' }, 2), false)
    assert.equal(isSequenceMetadata(null), false)
  })

  it('keeps an unknown count as a sequence until a count arrives', () => {
    assert.equal(isSequenceMetadata(sequence), true)
    assert.equal(isSequenceMetadata(sequence, 1), false)
  })
})

describe('sequenceCountsAuthoritative (UIUX-294)', () => {
  it('is authoritative only when every id has a count', () => {
    const ids = ['multi', 'missed']
    assert.equal(sequenceCountsAuthoritative(ids, new Map([['multi', 3]])), false)
    assert.equal(
      sequenceCountsAuthoritative(ids, new Map([['multi', 3], ['missed', 1]])),
      true,
    )
  })

  it('treats an empty id list as a complete count', () => {
    assert.equal(sequenceCountsAuthoritative([], new Map()), true)
  })

  it('refuses to persist when the count map is missing', () => {
    assert.equal(sequenceCountsAuthoritative(['multi'], null), false)
  })
})
