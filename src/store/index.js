import roles from './roles.js'
import groups from './groups.js'
import assignments from './assignments.js'
import pila_tags from './pila_tags.js'

import translationSlugMap from './translationSlugMap.js'
import languageChoices from './languageChoices.js'
import { matchNavigatorLanguage } from './matchNavigatorLanguage.js'


export default {
  modules: {
    assignments,
    groups,
    roles,
    pila_tags
  },
  state: () => ({
    loaded: false,
    user: null,
    provider: null,
    language: null,
    hasAcceptedStudentAgreement: false,
    hasAcceptedTeacherAgreement: false,
    translations: {}, // slug => value in language
  }),
  getters: {
    isAnonymous: state => () => state.provider === 'anonymous',
    loaded: state => () => state.loaded,
    user: state => () => state.user,
    language: state => () => state.language,
    hasAcceptedStudentAgreement: state => () => state.hasAcceptedStudentAgreement,
    hasAcceptedTeacherAgreement: state => () => state.hasAcceptedTeacherAgreement,
    t: state => slug => {
      const target = translationSlugMap[slug]
      const lang = state.language
      if (!target) return `no slug ${slug}`
      if (!state.translations?.[lang]) return `no translations for ${lang}`
      if (!state.translations[lang][target]) return `${lang} ${slug}`
      else return state.translations[lang][target]
    }
  },
  mutations: {
    loaded(state, loaded) { state.loaded = loaded},
    load(state, { user, provider }) {
      state.user = user
      state.provider = provider
    },
    acceptStudentAgreement(state) {
      // TODO: Remove this as toggle which is for testing. Only set to Date.now
      if (!!state.hasAcceptedStudentAgreement) state.hasAcceptedStudentAgreement = false
      else state.hasAcceptedStudentAgreement = Date.now()
    },
    acceptTeacherAgreement(state) {
      // TODO: Remove this as toggle which is for testing. Only set to Date.now
      if (!!state.hasAcceptedTeacherAgreement) state.hasAcceptedTeacherAgreement = false
      else state.hasAcceptedTeacherAgreement = Date.now()
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

    addTranslation({ commit }, t) { commit('addTranslation', t) },

    async fetchTranslations({ dispatch }) {
      const domain ='translate-pila-alpha.netlify.app' 
      const translations = await Agent.query('translations', [], domain)
      const translationPromises = translations.map(t => dispatch('addTranslation', t )) //dispatch so we can await
      return Promise.all(translationPromises)
    },

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
