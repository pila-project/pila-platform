/**
 * Per-user durable first-visit flag on Agent.state('teacher-home-visit').
 */

export const TEACHER_HOME_VISIT_SCOPE = 'teacher-home-visit'

function agentOrGlobal(agent) {
  return agent || globalThis.Agent
}

export async function readTeacherHomeVisited(agent) {
  try {
    const state = await agentOrGlobal(agent).state(TEACHER_HOME_VISIT_SCOPE)
    return state?.visited === true
  } catch (e) {
    console.warn('[teacher-home-visit] read failed', e)
    return null
  }
}

export async function markTeacherHomeVisited(agent) {
  try {
    const api = agentOrGlobal(agent)
    const state = await api.state(TEACHER_HOME_VISIT_SCOPE)
    if (state.visited === true) return
    state.visited = true
    if (typeof api.synced === 'function') await api.synced()
  } catch (e) {
    console.warn('[teacher-home-visit] persist visited failed', e)
  }
}
