import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  USER_AGREEMENTS_SCOPE,
  studentAgreementAcceptedFromState,
  teacherAgreementAcceptedFromState,
  readUserAgreements,
  persistStudentAgreement,
  persistTeacherAgreement,
  hydrateVuexAgreements,
} from './user-agreements.js'

function mockAgent(initial = {}) {
  const states = { ...initial }
  return {
    states,
    syncedCalls: 0,
    state(scope) {
      if (!states[scope]) states[scope] = {}
      return Promise.resolve(states[scope])
    },
    synced() {
      this.syncedCalls += 1
      return Promise.resolve()
    },
  }
}

describe('agreementAcceptedFromState', () => {
  it('is false until the durable flag is exactly true', () => {
    assert.equal(studentAgreementAcceptedFromState(undefined), false)
    assert.equal(studentAgreementAcceptedFromState({}), false)
    assert.equal(studentAgreementAcceptedFromState({ student: false }), false)
    assert.equal(studentAgreementAcceptedFromState({ student: 'yes' }), false)
    assert.equal(studentAgreementAcceptedFromState({ student: true }), true)
    assert.equal(teacherAgreementAcceptedFromState({ teacher: true }), true)
    assert.equal(teacherAgreementAcceptedFromState({ student: true }), false)
  })
})

describe('persist + read user agreements', () => {
  it('starts unaccepted and survives persist on the named per-user scope', async () => {
    const agent = mockAgent()
    const before = await readUserAgreements(agent)
    assert.deepEqual(before, { student: false, teacher: false })

    await persistStudentAgreement(agent)
    const afterStudent = await readUserAgreements(agent)
    assert.deepEqual(afterStudent, { student: true, teacher: false })
    assert.equal(agent.states[USER_AGREEMENTS_SCOPE].student, true)
    assert.equal(agent.syncedCalls, 1)

    await persistTeacherAgreement(agent)
    const afterBoth = await readUserAgreements(agent)
    assert.deepEqual(afterBoth, { student: true, teacher: true })
  })

  it('does not re-write or re-sync when already accepted', async () => {
    const agent = mockAgent({
      [USER_AGREEMENTS_SCOPE]: { student: true },
    })
    await persistStudentAgreement(agent)
    assert.equal(agent.syncedCalls, 0)
  })

  it('returns false on read failure instead of throwing', async () => {
    const agent = {
      state() { return Promise.reject(new Error('offline')) },
    }
    assert.deepEqual(await readUserAgreements(agent), { student: false, teacher: false })
  })

  it('swallows persist failure so accept still commits Vuex', async () => {
    const agent = {
      state() { return Promise.reject(new Error('offline')) },
      synced() { return Promise.resolve() },
    }
    await persistStudentAgreement(agent)
  })
})

describe('hydrateVuexAgreements', () => {
  it('commits Vuex when durable student consent is already stored', async () => {
    const commits = []
    const agent = mockAgent({
      [USER_AGREEMENTS_SCOPE]: { student: true },
    })
    await hydrateVuexAgreements({
      commit: name => commits.push(name),
      state: { hasAcceptedStudentAgreement: false, hasAcceptedTeacherAgreement: false },
    }, agent)
    assert.deepEqual(commits, ['acceptStudentAgreement'])
    assert.equal(agent.syncedCalls, 0)
  })

  it('backfills Agent.state when vuePersistentStore already has true', async () => {
    const commits = []
    const agent = mockAgent()
    await hydrateVuexAgreements({
      commit: name => commits.push(name),
      state: { hasAcceptedStudentAgreement: true, hasAcceptedTeacherAgreement: false },
    }, agent)
    assert.deepEqual(commits, [])
    assert.equal(agent.states[USER_AGREEMENTS_SCOPE].student, true)
    assert.equal(agent.syncedCalls, 1)
  })

  it('does not treat dismiss/unaccepted as consent', async () => {
    const commits = []
    const agent = mockAgent()
    await hydrateVuexAgreements({
      commit: name => commits.push(name),
      state: { hasAcceptedStudentAgreement: false, hasAcceptedTeacherAgreement: false },
    }, agent)
    assert.deepEqual(commits, [])
    assert.equal(agent.states[USER_AGREEMENTS_SCOPE]?.student, undefined)
  })
})
