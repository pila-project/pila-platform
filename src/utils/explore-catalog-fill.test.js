import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  EXPLORE_FILL_CONCURRENCY,
  catalogTagIndexComplete,
  exploreSlot,
  fetchTagFilterMatch,
  selectedFilterGroups,
} from './explore-catalog-fill.js'

describe('selectedFilterGroups', () => {
  it('drops empty categories and keeps one group per active category', () => {
    assert.deepEqual(
      selectedFilterGroups({
        grade: ['g3', 'g4'],
        subject: [],
        competency: ['math'],
        empty: null,
      }),
      [['g3', 'g4'], ['math']],
    )
    assert.deepEqual(selectedFilterGroups({}), [])
    assert.deepEqual(selectedFilterGroups(null), [])
  })
})

describe('catalogTagIndexComplete', () => {
  it('is true only when every catalog id has a tagCache entry', () => {
    const cache = new Map([['a', {}], ['b', {}]])
    assert.equal(catalogTagIndexComplete(cache, ['a', 'b']), true)
    assert.equal(catalogTagIndexComplete(cache, ['a', 'c']), false)
    assert.equal(catalogTagIndexComplete(cache, []), false)
  })
})

describe('exploreSlot', () => {
  it('keeps overlapping work inside the shared cap', async () => {
    let active = 0
    let max = 0
    const tasks = Array.from({ length: 20 }, () => exploreSlot(async () => {
      active += 1
      max = Math.max(max, active)
      await new Promise(resolve => { setTimeout(resolve, 8) })
      active -= 1
    }))
    await Promise.all(tasks)
    assert.equal(max, EXPLORE_FILL_CONCURRENCY)
  })
})

describe('fetchTagFilterMatch', () => {
  it('uses one taggings-intersection when each category has a single leaf', async () => {
    const calls = []
    const query = async (name, params, domain) => {
      calls.push({ name, params, domain })
      assert.equal(name, 'taggings-intersection')
      assert.equal(domain, 'tags.knowlearning.systems')
      return [{ target: 'item-a' }, { target: 'item-b' }]
    }
    const match = await fetchTagFilterMatch(
      'PILA Tag Hierarchy',
      [['math'], ['g3']],
      query,
    )
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0].params, ['PILA Tag Hierarchy', ['math', 'g3']])
    assert.deepEqual([...match], ['item-a', 'item-b'])
  })

  it('unions leaves inside a category, then intersects categories', async () => {
    const calls = []
    const byLeaf = {
      g3: ['a', 'b'],
      g4: ['b', 'c'],
      math: ['a', 'c', 'd'],
    }
    const query = async (name, params) => {
      calls.push(params[1])
      const leaf = params[1][0]
      return byLeaf[leaf].map(target => ({ target }))
    }
    const match = await fetchTagFilterMatch(
      'PILA Tag Hierarchy',
      [['g3', 'g4'], ['math']],
      query,
    )
    assert.equal(calls.length, 3)
    assert.deepEqual(calls.map(tags => tags[0]).sort(), ['g3', 'g4', 'math'])
    assert.deepEqual([...match].sort(), ['a', 'c'])
    assert.ok(EXPLORE_FILL_CONCURRENCY >= 4 && EXPLORE_FILL_CONCURRENCY <= 8)
  })
})
