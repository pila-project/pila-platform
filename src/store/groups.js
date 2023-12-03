import naclUtil from 'tweetnacl-util'
import { v4 as uuid } from 'uuid'
import { encrypt, generateKeyPair } from '../encryption.js'

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
    groups: state => typeFilter => {
      if (typeFilter) return (
        Object
          .entries(state.groups)
          .filter(([_, { archived }]) => !archived )
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
    myTeachers: (state, getters) => {
      const myTeacherGroupId = getters.specialGroupId('my-teachers')
      return myTeacherGroupId ? getters.members(myTeacherGroupId) : []
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
    async load({ dispatch }, poll) {
      await Promise.all([
        dispatch('loadGroups'),
        dispatch('loadMembers')
      ])
      if (firstLoad) dispatch('encryptMyUserInfo')

      if (firstLoad || poll === 'do-it') {
        setTimeout(() => dispatch('load', 'do-it'), 3000)
        firstLoad = false
      }
    },
    async encryptMyUserInfo({ getters }) {
      const myEncryptedUserInfo = await Agent.state('encrypted-user-info')
      const serializedInfo = JSON.stringify((await Agent.environment()).auth.info)
      const { publicKey, secretKey: myEphemeralSecretKey } = generateKeyPair()
      getters
        .myTeachers
        .forEach(async teacherId => {
          const teacherKey = await Agent.state('user-info-public-keys', teacherId)
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
    async addMember({ getters, dispatch }, { user_id, group_id }) {
      //  TODO: reinstate an archived member if one exists
      if (getters.belongs(user_id, group_id)) return
      const id = uuid()
      const metadata = await Agent.metadata(id)
      if (metadata.active_type !== GROUP_TYPE) metadata.active_type = GROUP_MEMBER_TYPE

      const state = await Agent.state(id)
      state.user_id = user_id
      state.group_id = group_id

      await Agent.synced()
      await dispatch('loadMembers')
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
    async removeMember({ state, dispatch }, { user_id, group_id }) {
      await Promise.all(
        Object
          .entries(state.members)
          .filter(([_id, { user_id: uid, group_id: gid, archived }]) => {
            return user_id === uid && group_id === gid && !archived
          })
          .map(async ([id]) => {
            const state = await Agent.state(id)
            state.archived = true
          })
      )

      await Agent.synced()
      await dispatch('loadMembers')
    }
  }
}
