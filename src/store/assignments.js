import { v4 as uuid } from 'uuid'
import { localCache, beginRevalidation, endRevalidation } from '@/utils/local-cache.js'

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
    to: (state, getters) => (user_id, assignment_type) => {
      return (
        Object
          .keys(state)
          .filter(id => !state[id].archived)
          .filter(id => {
            const { item_id } = state[id]
            return getters.assignedStudents(item_id, assignment_type).includes(user_id)
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
    async load({commit, dispatch, rootState}, poll) {
      const userId = rootState.user
      let usedCache = false

      if (firstLoad && userId) {
        const cached = await localCache.get(userId, 'assignments', 'all')
        if (cached) {
          usedCache = true
          cached.forEach(a => commit('addAssignment', a))
        }
      }

      if (usedCache) beginRevalidation()
      try {
        const assignments = await Agent.query('assignments')
        assignments.forEach(assignment => commit('addAssignment', assignment))

        if (userId) {
          localCache.set(userId, 'assignments', 'all', assignments)
        }
      } finally {
        if (usedCache) endRevalidation()
      }

      if (firstLoad || poll === 'do-it') {
        const scheduleNext = () => {
          setTimeout(() => {
            if (document.visibilityState === 'hidden') {
              const onVisible = () => {
                document.removeEventListener('visibilitychange', onVisible)
                dispatch('load', 'do-it')
              }
              document.addEventListener('visibilitychange', onVisible)
            } else {
              dispatch('load', 'do-it')
            }
          }, 15000 + Math.random() * 5000)
        }
        scheduleNext()
        firstLoad = false
      }
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