import { v4 as uuid } from 'uuid'

const ROLE_ASSERTION_TYPE = 'application/json;type=role_assertion'
const ROLE_REQUEST_TYPE = 'application/json;type=role_request'

const rolePermissions = {
  admin:      { admin: true,  researcher: true,  teacher: true,  student: true },
  researcher: { admin: false, researcher: true,  teacher: true,  student: true },
  teacher:    { admin: false, researcher: false, teacher: true,  student: true },
  student:    { admin: false, researcher: false, teacher: false, student: true },
}

export default {
  scope: null,
  namespaced: true,
  state: () => ({
    assignments: {},
    requests: {}
  }),
  getters: {
    assignments: state => () => state.assignments,
    requests: state => () => state.requests,
    usersWithRole: state => role => (
      Object
        .entries(state.assignments)
        .filter(([_user, {role: r}]) => r === role)
        .map(([user]) => user)
    ),
    role: state => user => {
      const assignment = state.assignments[user]
      return assignment ? assignment.role : 'student'
    },
    hasPermission: (_state, getters) => (user, permission) => {
      const role = getters.role(user)
      if (!rolePermissions[role]) return false
      else return !!rolePermissions[role][permission]
    },
    request: state => user => {
      if (state.requests[user]) return state.requests[user].role
      return null
    }
  },
  mutations: {
    addRequest(state, { assignee, role, updated }) {
      state.requests[assignee] = { role, updated }
    },
    addAssignment(state, { assignee, role, assigner, updated }) {
      state.assignments[assignee] = { role, assigner, updated }
    },
  },
  actions: {
    async load({ dispatch }) {
      await Promise.all([
        dispatch('loadAssignments'),
        dispatch('loadRequests')
      ])
    },
    async loadAssignments({ commit }) {
      await (
        Agent
          .state('role-assignments')
          .then(assignments => {
            assignments.forEach(assignment => commit('addAssignment', assignment))
          })
      )
    },
    async loadRequests({ commit }) {
      await (
        Agent
          .state('requested-roles')
          .then(async requests => {
            requests.forEach(request => commit('addRequest', request))
          })
      )
    },
    async request({ dispatch }, role) {
      const metadata = await Agent.metadata('requested-role')
      if (metadata.active_type !== ROLE_REQUEST_TYPE) {
        metadata.active_type = ROLE_REQUEST_TYPE
      }
      const state = await Agent.state('requested-role')
      state.role = role

      await Agent.synced()
      await dispatch('loadRequests')
    },
    async assign({ dispatch }, { user, role }) {
      Agent.create({
        active_type: ROLE_ASSERTION_TYPE,
        active: { role, assignee: user }
      })
      await Agent.synced()
      await dispatch('loadAssignments')
    }
  }
}
