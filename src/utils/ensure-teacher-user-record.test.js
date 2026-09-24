import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ensureTeacherUserRecord } from './ensure-teacher-user-record.js'
import { matchesStatusFilter } from './status-filter.js'

describe('ensureTeacherUserRecord', () => {
  it('creates {} when the id is missing and returns that record', () => {
    const users = {}
    const rec = ensureTeacherUserRecord(users, 'joined-1')
    assert.deepEqual(users['joined-1'], {})
    assert.equal(rec, users['joined-1'])
    assert.equal('secret' in rec, false)
  })

  it('does not clobber grade or secret on an existing record', () => {
    const existing = { grade: '4', secret: 'login-secret', archived: false }
    const users = { 'created-1': existing }
    const rec = ensureTeacherUserRecord(users, 'created-1')
    assert.equal(rec, existing)
    assert.deepEqual(users['created-1'], { grade: '4', secret: 'login-secret', archived: false })
  })

  it('sets archived when creating a missing record', () => {
    const users = { other: { grade: '1', secret: 'keep' } }
    const rec = ensureTeacherUserRecord(users, 'joined-1', { archived: true })
    assert.deepEqual(rec, { archived: true })
    assert.equal(users.other.secret, 'keep')
    assert.equal(matchesStatusFilter([], rec.archived), false)
    assert.equal(matchesStatusFilter(['archived'], rec.archived), true)
  })

  it('sets archived on an existing record without wiping grade or secret', () => {
    const users = { 'created-1': { grade: '8', secret: 'abc' } }
    const rec = ensureTeacherUserRecord(users, 'created-1', { archived: true })
    assert.deepEqual(rec, { grade: '8', secret: 'abc', archived: true })
  })

  it('sets grade on create and can clear it later without touching secret', () => {
    const users = {}
    ensureTeacherUserRecord(users, 's1', { grade: 'K', archived: false })
    assert.deepEqual(users.s1, { grade: 'K', archived: false })
    const rec = ensureTeacherUserRecord(users, 's1', { grade: undefined })
    assert.equal(rec.grade, undefined)
    assert.equal('grade' in rec, false)
    assert.equal(rec.archived, false)
    assert.equal('secret' in rec, false)
  })

  it('clears grade with delete so a proxy that rejects undefined assignment does not throw', () => {
    const rec = new Proxy({ grade: '4', secret: 'keep', archived: false }, {
      set(target, prop, value) {
        if (value === undefined) throw new Error('undefined assignment')
        target[prop] = value
        return true
      },
      deleteProperty(target, prop) {
        delete target[prop]
        return true
      },
    })
    const users = { s1: rec }
    assert.doesNotThrow(() => {
      ensureTeacherUserRecord(users, 's1', { grade: undefined, archived: true })
    })
    assert.equal('grade' in rec, false)
    assert.equal(rec.secret, 'keep')
    assert.equal(rec.archived, true)
  })

  it('ignores extra fields such as secret', () => {
    const users = {}
    const rec = ensureTeacherUserRecord(users, 'sso-1', { secret: 'do-not-invent', archived: false })
    assert.deepEqual(rec, { archived: false })
    assert.equal('secret' in rec, false)
  })
})
