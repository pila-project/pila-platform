import naclUtil from 'tweetnacl-util'
import { v4 as uuid } from 'uuid'
import { encrypt, generateKeyPair } from '../encryption.js'

const GROUP_TYPE = 'application/json;type=group'
const GROUP_MEMBER_TYPE = 'application/json;type=group_member'

// Keep write ordering outside Vuex state. Different students can save in parallel,
// but edits to the same record must persist in the order they were made.
const memberWrites = new WeakMap()

function persistMemberChanges(state, commit, changes, save) {
  if (!memberWrites.has(state)) memberWrites.set(state, new Map())
  const writes = memberWrites.get(state)
  const pending = changes.map(({ id, previous }) => {
    if (!writes.has(id)) writes.set(id, { saved: previous, settled: Promise.resolve() })
    return writes.get(id)
  })

  const saving = Promise.all(pending.map(write => write.settled)).then(async () => {
    try {
      await save()
      await Agent.synced()
      pending.forEach((write, index) => { write.saved = changes[index].optimistic })
    } catch (error) {
      changes.forEach(({ id, optimistic }, index) => {
        if (state.members[id] !== optimistic) return
        // An earlier queued edit may have failed too. Restore the last saved
        // value, rather than another edit's unconfirmed optimistic state.
        const previous = pending[index].saved
        if (previous) commit('addMember', { id, ...previous })
        else commit('removeMember', id)
      })
      throw error
    }
  })

  // A failed write must not prevent a later edit from being saved.
  const settled = saving.catch(() => {})
  pending.forEach(write => { write.settled = settled })
  settled.then(() => {
    changes.forEach(({ id }, index) => {
      if (pending[index].settled === settled) writes.delete(id)
    })
  })
  return saving
}

export default {
  scope: null,
  namespaced: true,
  state: () => ({
    specialGroupIds: {},
    groups: {},
    members: {}
  }),
  getters: {
    groups: (state, _getters, rootState) => (typeFilter, mine=false) => {
      if (typeFilter) return (
        Object
          .entries(state.groups)
          .filter(([_, { archived }]) => !archived )
          .filter(([_, { owner }]) => !mine || owner === rootState.user)
          .filter(([_, { group_type }]) => group_type === typeFilter )
          .map(([id]) => id)
      )
      else return Object.keys(state.groups || {})
    },
    archivedGroups: state => typeFilter => {
      if (typeFilter) return (
        Object
          .entries(state.groups)
          .filter(([_, { archived }]) => archived )
          .filter(([_, { group_type }]) => group_type === typeFilter )
          .map(([id]) => id)
      )
      else return Object.keys(state.groups || {})
    },
    owner: state => groupId => state.groups[groupId].owner,
    members: state => groupId => [...new Set(
      Object
        .values(state.members || {})
        .filter(({ group_id, archived }) => group_id === groupId && !archived )
        .map(({ user_id }) => user_id)
    )],
    belongs: state => (uid, gid) => (
      Object
        .values(state.members || {})
        .some(({ group_id, user_id, archived }) => {
          return !archived && group_id === gid && user_id === uid
        })
    ),
    specialGroupId: state => name => state.specialGroupIds[name] || null,
    myTeachers: (state, getters) => () => {
      const myTeacherGroupId = getters.specialGroupId('my-teachers')
      return myTeacherGroupId ? getters.members(myTeacherGroupId) : []
    },
    myStudents: (state, getters, { user }) => () => {
      // students are anybody who has added you to a group of type "my-teachers"
      return  (
        getters
          .groups('my-teachers')
          .filter(gid => getters.belongs(user, gid))
          .map(gid => getters.owner(gid))
      )
    }
  },
  mutations: {
    add(state, { id, name, owner, group_type, archived }) {
      state.groups[id] = { name, owner, group_type, archived }
    },
    remove(state, id) {
      delete state.groups[id]
    },
    addMember(state, { id, user_id, group_id, archived }) {
      state.members[id] = { user_id, group_id, archived }
    },
    removeMember(state, id) {
      delete state.members[id]
    },
    setSpecialGroup(state, { name, id }) {
      state.specialGroupIds[name] = id
    }
  },
  actions: {
    async load({ dispatch }) {
      await Promise.all([
        dispatch('loadGroups'),
        dispatch('loadMembers')
      ])
      dispatch('encryptMyUserInfo')
    },
    async encryptMyUserInfo({ getters }) {
      const myEncryptedUserInfo = await Agent.state('encrypted-user-info')
      const serializedInfo = JSON.stringify((await Agent.environment()).auth.info)
      const { publicKey, secretKey: myEphemeralSecretKey } = await generateKeyPair()
      getters
        .myTeachers()
        .forEach(async teacherId => {
          const teacherKey = await Agent.state('user-info-public-keys', teacherId)
          if (!teacherKey.public) return

          const teacherPublicKeyBuffer = naclUtil.decodeBase64(teacherKey.public)

          myEncryptedUserInfo[teacherKey.public] = {
            publicKey: naclUtil.encodeBase64(publicKey),
            encryptedInfo: naclUtil.encodeBase64(
              encrypt(
                myEphemeralSecretKey,
                teacherPublicKeyBuffer,
                naclUtil.decodeUTF8(serializedInfo)
              )
            )
          }
        })
    },
    async loadGroups({ commit }) {
      async function loadSpecialGroup(name) {
        const [{ id, owner }, { group_type, archived }] = await Promise.all([
          async function () {
            const metadata = await Agent.metadata(name)
            if (metadata.active_type !== GROUP_TYPE) metadata.active_type = GROUP_TYPE
            return metadata
          },
          async function () {
            const state = await Agent.state(name)
            if (state.group_type !== name) state.group_type = name
            return state
          }
        ].map(f => f()))
        commit('setSpecialGroup', { id, name })
        commit('add', { id, owner, name, group_type, archived })
      }
      await Promise.all([
        Agent
          .query('groups')
          .then(g => g.forEach(group => commit('add', group))),
        loadSpecialGroup('my-students'),
        loadSpecialGroup('my-teachers')
      ])
    },
    async loadMembers({ state, commit }) {
      const previousMembers = { ...state.members }
      const members = await Agent.query('group_members')
      members.forEach(member => {
        // A query started before an edit must not overwrite that local change.
        if (state.members[member.id] === previousMembers[member.id]) {
          commit('addMember', member)
        }
      })
    },
    async add({ dispatch }, { name, type, id=uuid()}) {
      const metadata = await Agent.metadata(id)
      if (metadata.active_type !== GROUP_TYPE) metadata.active_type = GROUP_TYPE

      const state = await Agent.state(id)
      state.name = name
      state.group_type = type

      await Agent.synced()
      await dispatch('loadGroups')
      return id
    },
    async addMember({ state, getters, commit }, { user_id, group_id }) {
      if (getters.belongs(user_id, group_id)) return
      const existing = Object.entries(state.members).find(([_id, member]) => (
        member.user_id === user_id && member.group_id === group_id
      ))
      // Reuse archived records, including removals that are still saving.
      const [id, previous] = existing || [uuid(), null]
      // Commit before yielding so another click sees the new membership.
      commit('addMember', { id, user_id, group_id, archived: false })
      const optimistic = state.members[id]

      await persistMemberChanges(state, commit, [{ id, previous, optimistic }], async () => {
        const metadata = await Agent.metadata(id)
        if (metadata.active_type !== GROUP_MEMBER_TYPE) metadata.active_type = GROUP_MEMBER_TYPE

        const member = await Agent.state(id)
        member.user_id = user_id
        member.group_id = group_id
        member.archived = false
      })
      // Indexed queries can lag behind synced writes; keep the local result.
      return id
    },
    async archive({ dispatch }, id) {
      const state = await Agent.state(id)
      state.archived = true

      await Agent.synced()
      await dispatch('loadGroups')
    },
    async unarchive({ dispatch }, id) {
      const state = await Agent.state(id)
      state.archived = false
      await Agent.synced()
      await dispatch('loadGroups')
    },
    async removeMember({ state, commit }, { user_id, group_id }) {
      const members = Object
        .entries(state.members)
        .filter(([_id, { user_id: uid, group_id: gid, archived }]) => {
          return user_id === uid && group_id === gid && !archived
        })
        .map(([id, previous]) => {
          commit('addMember', { id, ...previous, archived: true })
          return { id, previous, optimistic: state.members[id] }
        })

      if (!members.length) return

      await persistMemberChanges(state, commit, members, async () => {
        // Read every record before writing so a failed read cannot partly remove
        // a student with legacy duplicate memberships.
        const records = await Promise.all(members.map(({ id }) => Agent.state(id)))
        records.forEach(member => { member.archived = true })
      })
    }
  }
}
