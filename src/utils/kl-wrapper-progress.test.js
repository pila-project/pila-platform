import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isRealItemInfoCell,
  mergeLiveMonitoringPerformance,
  overlayRealItemInfo,
} from './kl-wrapper-progress.js'

const LEAF_A = 'leaf-a'
const LEAF_B = 'leaf-b'

describe('kl wrapper progress cells', () => {
  it('treats a cell as real when time is spent or correct is true, false, or completed', () => {
    assert.equal(isRealItemInfoCell({ time: 0, correct: null }), false)
    assert.equal(isRealItemInfoCell({ time: 0, correct: true }), true)
    assert.equal(isRealItemInfoCell({ time: 0, correct: false }), true)
    assert.equal(isRealItemInfoCell({ time: 2, correct: null }), true)
    assert.equal(isRealItemInfoCell({ time: 0, correct: 'completed' }), true)
    assert.equal(isRealItemInfoCell(null), false)
  })

  it('ignores placeholder cells and does not double-count totalTime', () => {
    const groups = [
      { sequenceId: 'wrap-1', itemIds: [LEAF_A, LEAF_B], klWrapper: true },
      { sequenceId: LEAF_A, itemIds: [LEAF_A] },
      { sequenceId: LEAF_B, itemIds: [LEAF_B] },
    ]
    const opened = mergeLiveMonitoringPerformance({
      groups,
      sequenceItems: [LEAF_A, LEAF_B],
      performanceBySeq: {
        'wrap-1': {
          totalTime: 8,
          activeItemIndex: 0,
          itemInfo: {
            [`0/${LEAF_A}`]: { time: 0, correct: null },
            [`1/${LEAF_B}`]: { time: 0, correct: null },
          },
        },
        [LEAF_A]: {
          totalTime: 4,
          itemInfo: { [`0/${LEAF_A}`]: { time: 4, correct: true } },
        },
        [LEAF_B]: {
          totalTime: 5,
          itemInfo: { [`0/${LEAF_B}`]: { time: 5, correct: false } },
        },
      },
    })
    assert.equal(opened.totalTime, 9)
    assert.deepEqual(opened.activeItemInfoArray.map(cell => cell.correct), [true, false])
    assert.deepEqual(opened.activeItemInfoArray.map(cell => cell.time), [4, 5])

    const played = mergeLiveMonitoringPerformance({
      groups,
      sequenceItems: [LEAF_A, LEAF_B],
      performanceBySeq: {
        'wrap-1': {
          totalTime: 6,
          itemInfo: {
            [`0/${LEAF_A}`]: { time: 6, correct: true },
            [`1/${LEAF_B}`]: { time: 0, correct: null },
          },
        },
        [LEAF_A]: {
          totalTime: 4,
          itemInfo: { [`0/${LEAF_A}`]: { time: 4, correct: true } },
        },
        [LEAF_B]: {
          totalTime: 5,
          itemInfo: { [`0/${LEAF_B}`]: { time: 5, correct: false } },
        },
      },
    })
    assert.equal(played.totalTime, 6)
    assert.equal(played.activeItemInfoArray[0].time, 6)
    assert.equal(played.activeItemInfoArray[1].time, 5)
    assert.equal(played.activeItemInfoArray[1].correct, false)
  })

  it('keeps summing every group totalTime when no klWrapper group is present', () => {
    const oneSequence = mergeLiveMonitoringPerformance({
      groups: [{ sequenceId: 'seq-1', itemIds: [LEAF_A, LEAF_B] }],
      sequenceItems: [LEAF_A, LEAF_B],
      performanceBySeq: {
        'seq-1': {
          totalTime: 3,
          itemInfo: {
            [`0/${LEAF_A}`]: { time: 0, correct: null },
            [`1/${LEAF_B}`]: { time: 0, correct: null },
          },
        },
      },
    })
    assert.equal(oneSequence.totalTime, 3)

    const twoContents = mergeLiveMonitoringPerformance({
      groups: [
        { sequenceId: 'seq-a', itemIds: [LEAF_A] },
        { sequenceId: 'seq-b', itemIds: [LEAF_B] },
      ],
      sequenceItems: [LEAF_A, LEAF_B],
      performanceBySeq: {
        'seq-a': {
          totalTime: 2,
          itemInfo: { [`0/${LEAF_A}`]: { time: 0, correct: null } },
        },
        'seq-b': {
          totalTime: 5,
          itemInfo: { [`0/${LEAF_B}`]: { time: 5, correct: true } },
        },
      },
    })
    assert.equal(twoContents.totalTime, 7)

    // No wrapper group: the first existing `{index}/{id}` cell wins, placeholder included.
    // A later real cell, and a same-id cell at another index, are not consulted.
    const placeholderWins = mergeLiveMonitoringPerformance({
      groups: [
        { sequenceId: 'seq-a', itemIds: [LEAF_A] },
        { sequenceId: 'seq-b', itemIds: [LEAF_A] },
      ],
      sequenceItems: [LEAF_A],
      performanceBySeq: {
        'seq-a': {
          totalTime: 1,
          itemInfo: {
            [`0/${LEAF_A}`]: { time: 0, correct: null },
            [`4/${LEAF_A}`]: { time: 9, correct: true },
          },
        },
        'seq-b': {
          totalTime: 6,
          itemInfo: { [`0/${LEAF_A}`]: { time: 6, correct: true } },
        },
      },
    })
    assert.equal(placeholderWins.activeItemInfoArray[0].time, 0)
    assert.equal(placeholderWins.activeItemInfoArray[0].correct, null)

    const exactKeyOnly = mergeLiveMonitoringPerformance({
      groups: [
        { sequenceId: 'seq-a', itemIds: [LEAF_A] },
        { sequenceId: 'seq-b', itemIds: [LEAF_A] },
      ],
      sequenceItems: [LEAF_A],
      performanceBySeq: {
        'seq-a': {
          itemInfo: { [`4/${LEAF_A}`]: { time: 9, correct: true } },
        },
        'seq-b': {
          itemInfo: { [`0/${LEAF_A}`]: { time: 2, correct: false } },
        },
      },
    })
    assert.equal(exactKeyOnly.activeItemInfoArray[0].time, 2)
    assert.equal(exactKeyOnly.activeItemInfoArray[0].correct, false)
  })

  it('does not let wrapper placeholders overwrite legacy submission cells', () => {
    const itemInfo = overlayRealItemInfo(
      {
        [`0/${LEAF_A}`]: { time: 4, correct: true },
        [`1/${LEAF_B}`]: { time: 2, correct: false },
      },
      {
        [`0/${LEAF_A}`]: { time: 0, correct: null },
        [`1/${LEAF_B}`]: { time: 1, correct: true },
      },
      [LEAF_A, LEAF_B],
    )
    assert.deepEqual(itemInfo[`0/${LEAF_A}`], { time: 4, correct: true })
    assert.deepEqual(itemInfo[`1/${LEAF_B}`], { time: 1, correct: true })
  })

  it('merges a wrapper cell by item id when the wrapper index differs', () => {
    const played = mergeLiveMonitoringPerformance({
      groups: [
        { sequenceId: 'wrap-1', itemIds: [LEAF_B, LEAF_A], klWrapper: true },
        { sequenceId: LEAF_A, itemIds: [LEAF_A] },
        { sequenceId: LEAF_B, itemIds: [LEAF_B] },
      ],
      sequenceItems: [LEAF_A, LEAF_B],
      performanceBySeq: {
        'wrap-1': {
          totalTime: 6,
          itemInfo: {
            [`0/${LEAF_B}`]: { time: 0, correct: null },
            [`1/${LEAF_A}`]: { time: 6, correct: 'completed' },
          },
        },
        [LEAF_A]: {
          totalTime: 4,
          itemInfo: { [`0/${LEAF_A}`]: { time: 4, correct: true } },
        },
        [LEAF_B]: {
          totalTime: 5,
          itemInfo: { [`0/${LEAF_B}`]: { time: 5, correct: false } },
        },
      },
    })
    assert.equal(played.totalTime, 6)
    assert.equal(played.activeItemInfoArray[0].time, 6)
    assert.equal(played.activeItemInfoArray[0].correct, 'completed')
    assert.equal(played.activeItemInfoArray[1].time, 5)
    assert.equal(played.activeItemInfoArray[1].correct, false)

    const overlaid = overlayRealItemInfo(
      { [`0/${LEAF_A}`]: { time: 4, correct: true } },
      { [`5/${LEAF_A}`]: { time: 9, correct: true } },
      [LEAF_A],
    )
    assert.deepEqual(overlaid[`0/${LEAF_A}`], { time: 9, correct: true })
  })
})
