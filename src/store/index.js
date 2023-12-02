import roles from './roles.js'
import groups from './groups.js'
import assignments from './assignments.js'
import pila_tags from './pila_tags.js'
import translations from './translations.js'

import languageChoices from './languageChoices.js'
import { matchNavigatorLanguage } from './matchNavigatorLanguage.js'


export default {
  modules: {
    assignments,
    groups,
    roles,
    pila_tags,
    translations
  },
  state: () => ({
    loaded: false,
    user: null,
    provider: null,
    language: null,
    codeEntered: false,
    hasAcceptedStudentAgreement: false,
    hasAcceptedTeacherAgreement: false,
  }),
  getters: {
    isAnonymous: state => () => state.provider === 'anonymous',
    loaded: state => () => state.loaded,
    user: state => () => state.user,
    language: state => () => state.language,
    hasAcceptedStudentAgreement: state => () => state.hasAcceptedStudentAgreement,
    hasAcceptedTeacherAgreement: state => () => state.hasAcceptedTeacherAgreement
  },
  mutations: {
    loaded(state, loaded) { state.loaded = loaded},
    load(state, { user, provider }) {
      state.user = user
      state.provider = provider
    },
    acceptStudentAgreement(state) {
      // TODO: Remove this as toggle which is for testing.
      state.hasAcceptedStudentAgreement =  !state.hasAcceptedStudentAgreement
    },
    acceptTeacherAgreement(state) {
      // TODO: Remove this as toggle which is for testing.
      state.hasAcceptedTeacherAgreement = !state.hasAcceptedTeacherAgreement
    },
    language(state, val) { state.language = val },
    cycleLanguage(state) {
      const i = languageChoices.indexOf(state.language)
      state.language = (i === -1) ? 'en' : languageChoices[(i + 1) % languageChoices.length]
      console.log(state.language)
    },
    addTranslation(state, { target, value, language }) {
      if (!state.translations) state.translations = {}
      if (!state.translations[language]) state.translations[language] = {}
      state.translations[language][target] = value
    }
  },
  actions: {
    loaded({ commit }, loaded) { commit('loaded', loaded) },

    async cycleLanguageAndRefetch({ commit, dispatch }) {
      await dispatch('fetchTranslations')
      commit('cycleLanguage')
    },

    async load({ commit, state }) {
      const language = matchNavigatorLanguage(languageChoices)
      commit('language', language)

      if (!state.user) {
        const { auth } = await Agent.environment()
        commit('load', auth)
      }
    },
    acceptStudentAgreement({ commit }) {
      commit('acceptStudentAgreement')
    },
    acceptTeacherAgreement({ commit }) {
      commit('acceptTeacherAgreement')
    }
  },
  plugins: [
    store => window.store = store,
    async store => {
      store.dispatch('loaded', false)

      await Promise.all([
        store.dispatch('load'),
        store.dispatch('fetchTranslations'),
        store.dispatch('pila_tags/load'),
        store.dispatch('roles/load'),
        store.dispatch('groups/load'),
        store.dispatch('assignments/load')
      ])

      store.dispatch('loaded', true)
    }
  ]
}
