import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  TAG_HIERARCHY_PARTITION,
  SIMPLIFIED_TAG_ROOT,
  OTHER_TAGS_HIERARCHY_ROOT,
  exploreTaxonomy,
} from './explore-taxonomy.js'
import { COMPETENCY_HIERARCHY_ROOT } from './constants.js'

describe('exploreTaxonomy', () => {
  it('uses the shared hierarchy partition and both roots on full PILA hosts', () => {
    const tax = exploreTaxonomy('PILA Host Partition', 'app.pilaproject.org')
    assert.equal(tax.partition, TAG_HIERARCHY_PARTITION)
    assert.deepEqual(tax.roots, [COMPETENCY_HIERARCHY_ROOT, OTHER_TAGS_HIERARCHY_ROOT])
    assert.equal(tax.allowTagging, true)
  })

  it('uses the host catalogue partition and simplified root on RCT hosts', () => {
    const hostPartition = 'France RCT Partition'
    const tax = exploreTaxonomy(hostPartition, 'france-rct-2025.pilaproject.org')
    assert.equal(tax.partition, hostPartition)
    assert.deepEqual(tax.roots, [SIMPLIFIED_TAG_ROOT])
    assert.equal(tax.allowTagging, false)
  })

  it('keeps Thai hosts on the full taxonomy (same ledger as the tagging modal)', () => {
    const tax = exploreTaxonomy('ignored-host-partition', 'thailand.pilaproject.org')
    assert.equal(tax.partition, TAG_HIERARCHY_PARTITION)
    assert.equal(tax.allowTagging, true)
    assert.ok(tax.roots.includes(OTHER_TAGS_HIERARCHY_ROOT))
  })
})
