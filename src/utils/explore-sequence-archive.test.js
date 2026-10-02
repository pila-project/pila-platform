import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { archivableMyContentIds } from './explore-sequence-archive.js'

describe('archivableMyContentIds', () => {
  const mine = ['sequence-1', 'activity-1', 'activity-2']
  const archived = ['activity-2']

  it('keeps selected My content that is not archived', () => {
    assert.deepEqual(
      archivableMyContentIds(['sequence-1', 'activity-1', 'catalog-1', 'activity-2'], mine, archived),
      ['sequence-1', 'activity-1'],
    )
  })

  it('drops duplicates and empty ids', () => {
    assert.deepEqual(
      archivableMyContentIds(['activity-1', '', 'activity-1', null], mine, archived),
      ['activity-1'],
    )
  })

  it('returns nothing when the selection is catalog or already archived', () => {
    assert.deepEqual(
      archivableMyContentIds(['catalog-1', 'activity-2'], mine, new Set(archived)),
      [],
    )
  })
})
