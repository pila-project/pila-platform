import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ASSIGNMENT_STATUS,
  getPublicationDateTime,
  publicationDateSource,
  tryPromoteScheduledAssignment,
} from './assignment-status.js'

describe('getPublicationDateTime', () => {
  it('reads YYYY-MM-DD as a local calendar day', () => {
    const at = getPublicationDateTime({ scheduledDate: '2026-09-30', scheduledTime: '00:00' })
    assert.equal(at.getFullYear(), 2026)
    assert.equal(at.getMonth(), 8)
    assert.equal(at.getDate(), 30)
    assert.equal(at.getHours(), 0)
  })
})

describe('publicationDateSource', () => {
  it('prefers publishedAt over a leftover schedule and created', () => {
    const source = publicationDateSource({
      status: ASSIGNMENT_STATUS.PUBLISHED,
      publishedAt: '2026-01-15T12:00:00.000Z',
      scheduledDate: '2026-02-01',
      created: 1,
    })
    assert.deepEqual(source, { kind: 'published', at: '2026-01-15T12:00:00.000Z' })
  })

  it('shows the schedule while the row is still Scheduled, even if that time has passed', () => {
    const source = publicationDateSource({
      status: ASSIGNMENT_STATUS.SCHEDULED,
      scheduledDate: '2020-01-02',
      scheduledTime: '09:30',
      created: 1,
    })
    assert.deepEqual(source, {
      kind: 'scheduled',
      at: '2020-01-02',
      time: '09:30',
    })
  })

  it('does not show scheduledDate on a draft', () => {
    const source = publicationDateSource({
      status: ASSIGNMENT_STATUS.DRAFT,
      scheduledDate: '2026-09-30',
      scheduledTime: '09:30',
      created: 1,
    })
    assert.equal(source, null)
  })

  it('shows created for a published row that never stored publishedAt', () => {
    const source = publicationDateSource({
      status: ASSIGNMENT_STATUS.PUBLISHED,
      created: 1_700_000_000_000,
    })
    assert.deepEqual(source, { kind: 'created', at: 1_700_000_000_000 })
  })

  it('shows a future schedule on a legacy row with no status', () => {
    const source = publicationDateSource({
      scheduledDate: '2099-05-01',
      scheduledTime: '08:00',
      created: 1,
    }, { now: Date.parse('2026-01-01T00:00:00Z') })
    assert.equal(source.kind, 'scheduled')
    assert.equal(source.at, '2099-05-01')
  })

  it('shows created when a legacy schedule is already due and there is no publishedAt', () => {
    const source = publicationDateSource({
      scheduledDate: '2020-01-02',
      created: 1_700_000_000_000,
    }, { now: Date.parse('2026-01-01T00:00:00Z') })
    assert.deepEqual(source, { kind: 'created', at: 1_700_000_000_000 })
  })
})

describe('tryPromoteScheduledAssignment', () => {
  it('stamps publishedAt from the schedule that came due', async () => {
    const scheduledDate = '2020-01-02'
    const scheduledTime = '09:30'
    const expected = getPublicationDateTime({ scheduledDate, scheduledTime }).toISOString()
    const doc = {
      status: ASSIGNMENT_STATUS.SCHEDULED,
      scheduledDate,
      scheduledTime,
    }
    const result = await tryPromoteScheduledAssignment('a1', {
      now: Date.parse('2020-01-03T00:00:00Z'),
      agent: {
        state: async () => doc,
        synced: async () => {},
      },
    })
    assert.equal(result.promoted, true)
    assert.equal(result.publishedAt, expected)
    assert.equal(doc.publishedAt, expected)
    assert.equal(doc.status, ASSIGNMENT_STATUS.PUBLISHED)
    assert.notEqual(doc.publishedAt, new Date(Date.parse('2020-01-03T00:00:00Z')).toISOString())
  })

  it('does not replace an existing publishedAt', async () => {
    const doc = {
      status: ASSIGNMENT_STATUS.SCHEDULED,
      scheduledDate: '2020-01-02',
      scheduledTime: '09:30',
      publishedAt: '2019-12-01T00:00:00.000Z',
    }
    const result = await tryPromoteScheduledAssignment('a1', {
      now: Date.parse('2020-01-03T00:00:00Z'),
      agent: { state: async () => doc, synced: async () => {} },
    })
    assert.equal(result.publishedAt, '2019-12-01T00:00:00.000Z')
    assert.equal(doc.publishedAt, '2019-12-01T00:00:00.000Z')
  })
})
