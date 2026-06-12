import naclUtil from 'tweetnacl-util'
import { v4 as uuid } from 'uuid'
import { encrypt, generateKeyPair } from '@/utils/encryption.js'
import { localCache, beginRevalidation, endRevalidation } from '@/utils/local-cache.js'

const GROUP_TYPE = 'application/json;type=group'
const GROUP_MEMBER_TYPE = 'application/json;type=group_member'

let firstLoad = true

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
      else return Object.keys(state)
    },
    archivedGroups: state => typeFilter => {
      if (typeFilter) return (
        Object
          .entries(state.groups)
          .filter(([_, { archived }]) => archived )
          .filter(([_, { group_type }]) => group_type === typeFilter )
          .map(([id]) => id)
      )
      else return Object.keys(state)
    },
    owner: state => groupId => state.groups[groupId].owner,
    members: state => groupId => (
      Object
        .values(state.members)
        .filter(({ group_id, archived }) => group_id === groupId && !archived )
        .map(({ user_id }) => user_id)
    ),
    belongs: state => (uid, gid) => (
      Object
        .values(state.members)
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
    add(state, { id, name, owner, group_type, archived, grade, subject }) {
      state.groups[id] = { name, owner, group_type, archived, grade, subject }
    },
    remove(state, id) {
      delete state.groups[id]
    },
    addMember(state, { id, user_id, group_id, archived }) {
      state.members[id] = { user_id, group_id, archived }
    },
    removeMember(state, { user_id, group_id }) {
      Object
        .entries(state.members)
        .forEach(([id, { user_id: u, group_id: g }]) => {
          if (user_id === u && group_id === g) delete state.members[id]
        })
    },
    setSpecialGroup(state, { name, id }) {
      state.specialGroupIds[name] = id
    }
  },
  actions: {
    async load({ commit, dispatch, rootState }, poll) {
      const userId = rootState.user
      let usedCache = false

      // Seed from cache on first load
      if (firstLoad && userId) {
        const cached = await localCache.get(userId, 'groups', 'all')
        if (cached) {
          usedCache = true
          if (cached.groups) cached.groups.forEach(g => commit('add', g))
          if (cached.members) cached.members.forEach(m => commit('addMember', m))
          if (cached.specialGroups) {
            cached.specialGroups.forEach(sg => {
              commit('setSpecialGroup', sg)
              commit('add', sg)
            })
          }
        }
      }

      if (usedCache) beginRevalidation()
      try {
        await Promise.all([
          dispatch('loadGroups'),
          dispatch('loadMembers')
        ])
      } finally {
        if (usedCache) endRevalidation()
      }

      // Persist to cache
      if (userId) {
        const state = rootState.groups
        localCache.set(userId, 'groups', 'all', {
          groups: Object.entries(state.groups).map(([id, g]) => ({ id, ...g })),
          members: Object.entries(state.members).map(([id, m]) => ({ id, ...m })),
          specialGroups: Object.entries(state.specialGroupIds).map(([name, id]) => {
            const g = state.groups[id]
            return g ? { name, id, owner: g.owner, group_type: g.group_type, archived: g.archived } : null
          }).filter(Boolean),
        })
      }

      if (firstLoad) dispatch('encryptMyUserInfo')

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
          .then(async (groups) => {
            await Promise.all(groups.map(async (group) => {
              const state = await Agent.state(group.id)
              commit('add', {
                ...group,
                grade: state.grade,
                subject: state.subject,
              })
            }))
          }),
        loadSpecialGroup('my-students'),
        loadSpecialGroup('my-teachers')
      ])
    },
    async loadMembers({ commit }) {
      const members = await Agent.query('group_members')
      members.forEach(member => commit('addMember', member))
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
    async addMember({ commit, state, getters, dispatch }, { user_id, group_id, defer }) {
      if (getters.belongs(user_id, group_id)) return

      // Reinstate an archived member if one exists
      const archivedEntry = Object.entries(state.members).find(
        ([, m]) => m.user_id === user_id && m.group_id === group_id && m.archived
      )
      if (archivedEntry) {
        const [existingId] = archivedEntry
        // Optimistic update: immediately mark as unarchived in Vuex
        commit('addMember', { id: existingId, user_id, group_id, archived: false })

        const memberState = await Agent.state(existingId)
        memberState.archived = false
        if (!defer) {
          await Agent.synced()
          await dispatch('loadMembers')
        }
        return existingId
      }

      const id = uuid()
      // Optimistic update: immediately add to Vuex before async persistence
      commit('addMember', { id, user_id, group_id, archived: false })

      const metadata = await Agent.metadata(id)
      if (metadata.active_type !== GROUP_TYPE) metadata.active_type = GROUP_MEMBER_TYPE

      const state2 = await Agent.state(id)
      state2.user_id = user_id
      state2.group_id = group_id

      if (!defer) {
        await Agent.synced()
        await dispatch('loadMembers')
      }
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
    async removeMember({ commit, state, dispatch }, { user_id, group_id, defer }) {
      // Capture entries to archive BEFORE optimistic removal
      const entriesToArchive = Object
        .entries(state.members)
        .filter(([_id, { user_id: uid, group_id: gid, archived }]) => {
          return user_id === uid && group_id === gid && !archived
        })
        .map(([id]) => id)

      // Optimistic update: immediately remove from Vuex
      commit('removeMember', { user_id, group_id })

      await Promise.all(
        entriesToArchive.map(async (id) => {
          const agentState = await Agent.state(id)
          agentState.archived = true
        })
      )

      if (!defer) {
        await Agent.synced()
        await dispatch('loadMembers')
      }
    },
    async flushMembers() {
      await Agent.synced()
    }
  }
}
