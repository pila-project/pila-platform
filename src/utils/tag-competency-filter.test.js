import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { competencyIdsForCategory } from './tag-competency-filter.js'

const CATEGORY = 'achievement-level'
const EMERGING = 'emerging'
const MASTERING = 'mastering'
const SAME_NAME = 'achievement-level-child'

describe('competencyIdsForCategory', () => {
  it('drops the category id and a same-named child', () => {
    const names = new Map([
      [CATEGORY, 'Achievement Level'],
      [EMERGING, 'Emerging'],
      [MASTERING, 'Mastering'],
      [SAME_NAME, ' achievement level '],
    ])
    assert.deepEqual(
      competencyIdsForCategory(
        CATEGORY,
        [EMERGING, CATEGORY, MASTERING, SAME_NAME],
        names,
      ),
      [EMERGING, MASTERING],
    )
  })

  it('keeps a child whose name has not resolved', () => {
    const names = new Map([[CATEGORY, 'Achievement Level'], [EMERGING, 'Emerging']])
    assert.deepEqual(
      competencyIdsForCategory(CATEGORY, [EMERGING, 'unresolved'], names),
      [EMERGING, 'unresolved'],
    )
  })

  it('still drops a self-tag when the category name is missing', () => {
    assert.deepEqual(
      competencyIdsForCategory(CATEGORY, [CATEGORY, EMERGING], new Map()),
      [EMERGING],
    )
  })
})
