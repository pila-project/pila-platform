import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isSequenceMetadata } from './teacher-home.js'
import { PETHEMATICIANS_SINGLE_ITEM_IDS } from './constants.js'

describe('isSequenceMetadata (UIUX-294)', () => {
  const sequence = { active_type: 'application/json;type=sequence' }
  const one = 'one-item-seq'

  it('keeps a one-item sequence and drops Pethematicians ids', () => {
    assert.equal(isSequenceMetadata(sequence, one), true)
    assert.equal(isSequenceMetadata(sequence), true)
    for (const id of PETHEMATICIANS_SINGLE_ITEM_IDS) {
      assert.equal(isSequenceMetadata(sequence, id), false)
    }
    assert.equal(isSequenceMetadata({ active_type: 'application/json' }, one), false)
    assert.equal(isSequenceMetadata(null), false)
    assert.equal(isSequenceMetadata(null, one), false)
  })
})
