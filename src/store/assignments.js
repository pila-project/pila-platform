import { assignmentXapiStatement } from '../assignment-xapi.js'

const ASSIGNMENTS_TYPE = 'application/json;type=assignment'
const TEACHER_TO_STUDENT = 'teacher-to-student'

let firstLoad = true

async function writeAssignmentXapi(itemId, assignedClassIds) {
  try {
    const [assignment, { auth: { user } }] = await Promise.all([
      Agent.state(itemId),
      Agent.environment()
    ])
    const statement = assignmentXapiStatement(
      user,
      assignment.content,
      assignedClassIds
    )

    if (!statement) return
    assignment.xapi = statement
    await Agent.synced()
  }
  catch (error) {
    console.warn(`Unable to write assignment xAPI for ${itemId}.`, error)
  }
}

function classIdsAfterChange(getters, itemId, assignmentType, groupId, assigned) {
  const currentClassIds = getters.assignedGroups(itemId, assignmentType, false)
  if (!assigned) return currentClassIds.filter(id => id !== groupId)
  return [...new Set([...currentClassIds, groupId])]
}

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

      const assignedClassIds = classIdsAfterChange(
        getters,
        item_id,
        assignment_type,
        group_id,
        true
      )

      await Agent.create({
        active_type: ASSIGNMENTS_TYPE,
        active: { group_id, item_id, assignment_type }
      })

      await Agent.synced()
      if (assignment_type === TEACHER_TO_STUDENT) {
        await writeAssignmentXapi(item_id, assignedClassIds)
      }
      await dispatch('load')
    },
    async unassign({ getters, dispatch }, assignment_id) {
      const state = await Agent.state(assignment_id)
      const { group_id, item_id, assignment_type } = state
      const assignedClassIds = classIdsAfterChange(
        getters,
        item_id,
        assignment_type,
        group_id,
        false
      )

      state.archived = true
      await Agent.synced()
      if (assignment_type === TEACHER_TO_STUDENT) {
        await writeAssignmentXapi(item_id, assignedClassIds)
      }
      await dispatch('load')
    }
  }
}
