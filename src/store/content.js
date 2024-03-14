/************************************
 * 
 * THIS IS THE NEW CONTENT APPROACH
 * PILA_TAGS MODULE IS TO BE
 * DEPRECATED
 * 
 * **********************************/

const PILA_CONTENT_TAG_ID = '1a53db50-e248-11ee-ab5f-07f4a7408770'
const PILA_THAILAND_CONTENT_TAG_ID = 'b70aedd0-e24d-11ee-9fbb-53f6c914e58a'

export default {
  scope: null,
  namespaced: true,
  state: () => ({}),
  getters: {
    contentToShow: state => () => Object.keys(state),
  },
  mutations: {
    add(state, { id, searchInfo }) {
      state[id] = searchInfo
    },
    remove(state, id) {
      delete state[id]
    }
  },
  actions: {
    async load({ commit }) {
      const tags = await Agent.query(
        'taggings',
        [[PILA_THAILAND_CONTENT_TAG_ID]],
        'tags.knowlearning.systems'
      )
      tags.forEach(c => {
        commit('add', { id: c.content_id, searchInfo: {} })
        //  TODO: populate searchable fields in content
      })
    }
  }
}