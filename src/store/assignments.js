import { v4 as uuid } from 'uuid'

const ASSIGNMENTS_TYPE = 'application/json;type=assignment'

let firstLoad = true

export default {
  scope: null,
  namespaced: true,
  state: () => ({}),
  getters: {
    get: state => id => state[id],
    assignments: state => (item_id, assignment_type) => {
      return (
        Object
          .keys(state)
          .filter(assignment_id => {
            const a = state[assignment_id]
            return a.item_id === item_id
              && a.assignment_type === assignment_type
              && !a.archived
          })
      )
    },
    assignedGroups: (state, getters, rootState) => (item_id, assignment_type, all=true) => {
      return (
        Object
          .values(state)
          .filter(a => (
            a.item_id === item_id
            && a.assignment_type === assignment_type
            && !a.archived
            && (all || rootState.user === a.assigner_id)
          ))
          .map(({ group_id }) => group_id)
      )
    },
    isAssigned: (_state, getters) => (group_id, item_id, assignment_type) => {
      return getters.assignedGroups(item_id, assignment_type).includes(group_id)
    },
    assignedStudents: (_state, getters, _rootState, rootGetters) => (item_id, assignment_type) => {
      return Array.from(new Set(
        getters
          .assignedGroups(item_id, assignment_type)
          .map(group_id => rootGetters['groups/members'](group_id))
          .flat()
      ))
    },
    to: (state, _getters, _rootState, rootGetters) => (user_id, assignment_type) => {
      return (
        Object
          .keys(state)
          .filter(id => {
            const assignment = state[id]
            return !assignment.archived
              && assignment.assignment_type === assignment_type
              && rootGetters['groups/belongs'](user_id, assignment.group_id)
          })
      )
    }
  },
  mutations: {
    addAssignment(state, { id, group_id, item_id, assignment_type, assigner_id, archived }) {
      state[id] = {
        group_id,
        item_id,
        assignment_type,
        assigner_id,
        archived
      }
    }
  },
  actions: {
    async load({commit, dispatch}, poll) {
      if (firstLoad || poll === 'do-it') {
        setTimeout(() => dispatch('load', 'do-it'), 7000 + Math.random()*4000)
        firstLoad = false
      }
      const assignments = await Agent.query('assignments')
      assignments.forEach(assignment => commit('addAssignment', assignment))
    },
    async assign({getters, dispatch}, { group_id, item_id, assignment_type }) {
      if (getters.isAssigned(group_id, item_id, assignment_type)) return

      await Agent.create({
        active_type: ASSIGNMENTS_TYPE,
        active: { group_id, item_id, assignment_type }
      })

      await Agent.synced()
      await dispatch('load')
    },
    async unassign({ dispatch }, assignment_id) {
      const state = await Agent.state(assignment_id)
      state.archived = true
      await Agent.synced()
      await dispatch('load')
    }
  }
}
