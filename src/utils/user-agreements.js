/**
 * Per-user durable consent on Agent.state('user-agreements').
 * Vuex hasAccepted* is the reactive UI cache. Do not rely on vuePersistentStore.
 */

export const USER_AGREEMENTS_SCOPE = 'user-agreements'

function agentOrGlobal(agent) {
  return agent || globalThis.Agent
}

export function studentAgreementAcceptedFromState(state) {
  return state?.student === true
}

export function teacherAgreementAcceptedFromState(state) {
  return state?.teacher === true
}

export async function readUserAgreements(agent) {
  try {
    const state = await agentOrGlobal(agent).state(USER_AGREEMENTS_SCOPE)
    return {
      student: studentAgreementAcceptedFromState(state),
      teacher: teacherAgreementAcceptedFromState(state),
    }
  } catch (e) {
    console.warn('[user-agreements] read failed', e)
    return { student: false, teacher: false }
  }
}

async function persistAgreementFlag(flag, agent) {
  try {
    const api = agentOrGlobal(agent)
    const state = await api.state(USER_AGREEMENTS_SCOPE)
    if (state[flag] === true) return
    state[flag] = true
    if (typeof api.synced === 'function') await api.synced()
  } catch (e) {
    console.warn(`[user-agreements] persist ${flag} failed`, e)
  }
}

export function persistStudentAgreement(agent) {
  return persistAgreementFlag('student', agent)
}

export function persistTeacherAgreement(agent) {
  return persistAgreementFlag('teacher', agent)
}

/**
 * Source of truth is Agent.state. If vuePersistentStore already has true
 * (pre-Pass-B session), backfill the durable key so later logins keep it.
 */
export async function hydrateVuexAgreements({ commit, state }, agent) {
  const accepted = await readUserAgreements(agent)
  if (accepted.student) commit('acceptStudentAgreement')
  else if (state.hasAcceptedStudentAgreement) await persistStudentAgreement(agent)

  if (accepted.teacher) commit('acceptTeacherAgreement')
  else if (state.hasAcceptedTeacherAgreement) await persistTeacherAgreement(agent)
}
