import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  competencyScoreLabel,
  competencyScoreSections,
} from './competency-score-label.js'

describe('competency score labels', () => {
  it('drops the compute prefix and a trailing operator', () => {
    assert.equal(competencyScoreLabel('compute:addition'), 'Addition')
    assert.equal(competencyScoreLabel('compute:addition +'), 'Addition')
    assert.equal(competencyScoreLabel('compute:subtraction -'), 'Subtraction')
    assert.equal(competencyScoreLabel('math_reasoning'), 'Math Reasoning')
  })

  it('uses the Thai skill name when the page language is Thai', () => {
    assert.equal(competencyScoreLabel('compute:addition', 'th'), 'บวก')
    assert.equal(competencyScoreLabel('compute:division', 'th-TH'), 'หาร')
    assert.equal(competencyScoreLabel('compute:addition', 'en'), 'Addition')
  })

  it('splits a score into completed and empty sections', () => {
    assert.deepEqual(competencyScoreSections([1, 3]), { filled: 1, total: 3 })
    assert.deepEqual(competencyScoreSections([3, 3]), { filled: 3, total: 3 })
    assert.deepEqual(competencyScoreSections([4, 3]), { filled: 3, total: 3 })
  })
})
