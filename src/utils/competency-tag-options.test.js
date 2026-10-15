import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { competencyTagOptions } from './competency-tag-options.js'

const INTERPRET = 'leaf-interpret'
const APPLY = 'leaf-apply'
const MODEL = 'leaf-model'

const labels = new Map([
  [INTERPRET, 'Interpret and evaluate'],
  [APPLY, 'Apply'],
  [MODEL, 'Model'],
])

function labelFor(id) {
  return labels.get(id) || id
}

describe('competencyTagOptions', () => {
  it('lists every leaf at count 0 when the index is complete but empty', () => {
    assert.deepEqual(
      competencyTagOptions(
        [MODEL, INTERPRET, APPLY],
        {},
        true,
        labelFor,
      ),
      [
        { value: APPLY, label: 'Apply', count: 0 },
        { value: INTERPRET, label: 'Interpret and evaluate', count: 0 },
        { value: MODEL, label: 'Model', count: 0 },
      ],
    )
  })

  it('keeps a zero next to leaves that have catalog hits', () => {
    assert.deepEqual(
      competencyTagOptions(
        [MODEL, APPLY],
        { [MODEL]: 3 },
        true,
        labelFor,
      ),
      [
        { value: APPLY, label: 'Apply', count: 0 },
        { value: MODEL, label: 'Model', count: 3 },
      ],
    )
  })

  it('omits counts until the catalog index is complete', () => {
    assert.deepEqual(
      competencyTagOptions(
        [MODEL, APPLY],
        { [MODEL]: 3 },
        false,
        labelFor,
      ),
      [
        { value: APPLY, label: 'Apply', count: null },
        { value: MODEL, label: 'Model', count: null },
      ],
    )
  })

  it('does not invent options from counts outside the taxonomy', () => {
    const options = competencyTagOptions(
      [APPLY],
      { [APPLY]: 1, 'orphan-leaf': 9 },
      true,
      labelFor,
    )
    assert.deepEqual(options, [{ value: APPLY, label: 'Apply', count: 1 }])
  })

  it('returns an empty list when the category has no leaves', () => {
    assert.deepEqual(competencyTagOptions(undefined, { x: 1 }, true, labelFor), [])
    assert.deepEqual(competencyTagOptions([], null, true, labelFor), [])
  })
})
