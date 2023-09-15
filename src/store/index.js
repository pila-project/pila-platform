import roles from './roles.js'
import groups from './groups.js'
import assignments from './assignments.js'
import tags from './tags.js'

export default {
  modules: {
    assignments,
    groups,
    roles,
    tags
  },
  state: () => ({
    loaded: false,
    user: null,
    provider: null
  }),
  getters: {
    isAnonymous: state => () => state.provider === 'anonymous',
    user: state => () => state.user
  },
  mutations: {
    loaded(state, loaded) { state.loaded = loaded},
    load(state, { user, provider }) {
      state.user = user
      state.provider = provider
    }
  },
  actions: {
    loaded({ commit }, loaded) { commit('loaded', loaded) },
    async load({ commit, state }) {
      if (!state.user) {
        const { auth } = await Agent.environment()
        commit('load', auth)
      }
    }
  },
  plugins: [
    store => window.store = store,
    async store => {
      store.dispatch('loaded', false)

      await Promise.all([
        store.dispatch('load'),
        store.dispatch('tags/load'),
        store.dispatch('roles/load'),
        store.dispatch('groups/load'),
        store.dispatch('assignments/load')
      ])

      store.dispatch('loaded', true)
    }
  ]
}
