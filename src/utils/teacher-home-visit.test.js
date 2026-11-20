import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  TEACHER_HOME_VISIT_SCOPE,
  readTeacherHomeVisited,
  markTeacherHomeVisited,
} from './teacher-home-visit.js'

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

describe('read + mark teacher home visit', () => {
  it('starts unvisited and survives persist on the named per-user scope', async () => {
    const agent = mockAgent()
    assert.equal(await readTeacherHomeVisited(agent), false)

    await markTeacherHomeVisited(agent)
    assert.equal(await readTeacherHomeVisited(agent), true)
    assert.equal(agent.states[TEACHER_HOME_VISIT_SCOPE].visited, true)
    assert.equal(agent.syncedCalls, 1)
  })

  it('does not re-write or re-sync when already visited', async () => {
    const agent = mockAgent({
      [TEACHER_HOME_VISIT_SCOPE]: { visited: true },
    })
    await markTeacherHomeVisited(agent)
    assert.equal(agent.syncedCalls, 0)
  })

  it('returns null on read failure instead of throwing', async () => {
    const agent = {
      state() { return Promise.reject(new Error('offline')) },
    }
    assert.equal(await readTeacherHomeVisited(agent), null)
  })

  it('swallows persist failure', async () => {
    const agent = {
      state() { return Promise.reject(new Error('offline')) },
      synced() { return Promise.resolve() },
    }
    await markTeacherHomeVisited(agent)
  })

  it('treats only visited === true as a returning visit', async () => {
    const agent = mockAgent({
      [TEACHER_HOME_VISIT_SCOPE]: { visited: 'yes' },
    })
    assert.equal(await readTeacherHomeVisited(agent), false)
  })
})
