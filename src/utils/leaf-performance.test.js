import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  contentOwnsSequencePerformance,
  ensureLeafPerformance,
  ensureSequencePerformance,
  finishLeafPerformance,
  finishSequenceItemPerformance,
  leafPerformanceItemKey,
  leafPerformancePath,
  sequencePerformanceItemKey,
  tickLeafPerformance,
  tickSequencePerformance,
} from './leaf-performance.js'

describe('leaf performance state for teacher dashboards', () => {
  it('uses the assignment sequence path and the leaf cell key', () => {
    assert.equal(leafPerformancePath('asg-1', 'game-1'), 'asg-1/sequence-game-1')
    assert.equal(leafPerformanceItemKey('game-1'), '0/game-1')
  })

  it('leaves sequence content to the matching player', () => {
    assert.equal(contentOwnsSequencePerformance({ items: { 0: { id: 'q1' } } }), true)
    assert.equal(contentOwnsSequencePerformance({ items: {} }), false)
    assert.equal(contentOwnsSequencePerformance({}), false)
    assert.equal(contentOwnsSequencePerformance(null), false)
  })

  it('ticks time in the shape In Progress and the live table read', () => {
    const state = {}
    tickLeafPerformance(state, 'game-1')
    assert.equal(state.totalTime, 1)
    assert.equal(state.activeItemIndex, 0)
    assert.deepEqual(state.itemInfo['0/game-1'], { time: 1, correct: null })
    tickLeafPerformance(state, 'game-1')
    assert.equal(state.totalTime, 2)
    assert.equal(state.itemInfo['0/game-1'].time, 2)
  })

  it('records a plain close and a Candli competency close', () => {
    const plain = {}
    finishLeafPerformance(plain, 'game-1', { success: true })
    assert.equal(plain.itemInfo['0/game-1'].correct, true)

    const candli = ensureLeafPerformance({}, 'game-1')
    finishLeafPerformance(candli, 'game-1', {
      competencies: { 'skill:a': [9, 10], 'general:attempts': [3, 3] },
    })
    assert.equal(candli.itemInfo['0/game-1'].correct, true)

    const miss = {}
    finishLeafPerformance(miss, 'game-1', {
      competencies: { 'skill:a': [1, 10] },
    })
    assert.equal(miss.itemInfo['0/game-1'].correct, null)
  })

  it('does not clear an existing result when close has no score', () => {
    const state = ensureLeafPerformance({}, 'game-1')
    state.itemInfo['0/game-1'].correct = true
    finishLeafPerformance(state, 'game-1', {})
    assert.equal(state.itemInfo['0/game-1'].correct, true)
  })
})

describe('sequence performance state for same-host sequences', () => {
  it('uses the dashboard cell key for each member', () => {
    assert.equal(sequencePerformanceItemKey(0, 'leaf-a'), '0/leaf-a')
    assert.equal(sequencePerformanceItemKey(1, 'leaf-b'), '1/leaf-b')
    assert.equal(leafPerformancePath('asg-1', 'sequence-1'), 'asg-1/sequence-sequence-1')
  })

  it('fills missing cells without resetting time already recorded', () => {
    const state = {
      totalTime: 4,
      activeItemIndex: 1,
      itemInfo: { '1/leaf-b': { time: 4, correct: true } },
    }
    ensureSequencePerformance(state, ['leaf-a', 'leaf-b'])
    assert.equal(state.totalTime, 4)
    assert.equal(state.activeItemIndex, 1)
    assert.deepEqual(state.itemInfo['0/leaf-a'], { time: 0, correct: null })
    assert.deepEqual(state.itemInfo['1/leaf-b'], { time: 4, correct: true })
  })

  it('ticks the active member and records its close', () => {
    const state = ensureSequencePerformance({}, ['leaf-a', 'leaf-b'])
    tickSequencePerformance(state, 1, 'leaf-b')
    assert.equal(state.totalTime, 1)
    assert.equal(state.activeItemIndex, 1)
    assert.equal(state.itemInfo['1/leaf-b'].time, 1)
    assert.equal(state.itemInfo['0/leaf-a'].time, 0)
    finishSequenceItemPerformance(state, 1, 'leaf-b', { success: true })
    assert.equal(state.itemInfo['1/leaf-b'].correct, true)
    finishSequenceItemPerformance(state, 0, 'leaf-a', {})
    assert.equal(state.itemInfo['0/leaf-a'].correct, null)
  })
})
