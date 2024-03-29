/************************************
 * 
 * THIS IS THE OOOOOOLD CONTENT APPROACH
 * TO BE DEPRECATED (DO NOT USE)
 * 
 * **********************************/

import URL_CONTENT_DATA from '../url-content-data.js'

function existing_tag(state, content_id, tag_type, user) {
  let existing = null
  const entries = Object.entries(state)

  for (let i=0; i<entries.length; i++) {
    const [id, entry] = entries[i]
    if ( entry.content_id === content_id
      && entry.tag_type === tag_type
      && entry.user_id === user
    ) {
      existing = id
      break
    }
  }
  return existing
}

const hardCodedExpertIds = Object.keys(URL_CONTENT_DATA)

export default {
  scope: null,
  namespaced: true,
  state: () => ({}),
  getters: {
    withTag: state => type => {
      const ids = (
        Object
          .values(state)
          .filter(({ tag_type, archived }) => tag_type === type && !archived )
          .map(({ content_id }) => content_id)
      )

      if (type === 'expert') return [...hardCodedExpertIds, ...ids ]

      return ids
    },
    archivedWithTag: state => type => (
      Object
        .values(state)
        .filter(({ tag_type, archived }) => tag_type === type && archived )
        .map(({ content_id }) => content_id)
    ),
    hasTag: state => (content_id, type) => {
      if (type === 'expert' && hardCodedExpertIds.includes(content_id)) return true

      return (
        Object
          .values(state)
          .some(({ tag_type, content_id : cid, archived }) => tag_type === type && !archived && content_id === cid )
        )
    }
  },
  mutations: {
    add(state, { id, content_id, tag_type, user_id, updated, archived }) {
      state[id] = { content_id, tag_type, user_id, updated, archived }
    },
    remove(state, id) {
      delete state[id]
    }
  },
  actions: {
    async load({ commit }) {
      const tags = await Agent.query('pila_tags')
      tags.forEach(tag => commit('add', tag))
    },
    async tag({ state, commit, dispatch }, { tag_type, content_id, archived=false }) {
      const { auth: { user } } = await Agent.environment()
      const existing = await existing_tag(state, content_id, tag_type, user)

      if (existing) {
        const state = await Agent.state(existing)
        state.archived = false
      }
      else await Agent.create({
        active_type: 'application/json;type=pila_tag',
        active: { tag_type, content_id, archived }
      })

      await Agent.synced()
      await dispatch('load')
    },
    async untag({ state, dispatch }, { content_id, tag_type }) {
      const { auth: { user } } = await Agent.environment()
      const existing = await existing_tag(state, content_id, tag_type, user)

      if (existing) {
        const state = await Agent.state(existing)
        state.archived = true

        await Agent.synced()
        await dispatch('load')
      }
      else await dispatch('tag', {content_id, tag_type, archived: true })
    }
  }
}