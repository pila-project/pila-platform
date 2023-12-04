import { decrypt, generateKeyPair } from '../encryption.js'
import { encodeBase64, decodeBase64, encodeUTF8 } from 'tweetnacl-util'

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
    hasAcceptedTeacherAgreement: state => () => state.hasAcceptedTeacherAgreement,
    decryptUserInfo: (state, getters) => async user => {
      const key = localStorage.getItem(`zkek-${state.user}`)
      let info = { name: `${getters.t('anonymous')}_${user.slice(0,4)}`, picture: null }
      const encryptedUserInfo = await Agent.state('encrypted-user-info', user)
      const { secretKey: mySecretKey} = await generateKeyPair(key)
      const toTry = Object.values(encryptedUserInfo)
      let success = false
      while (toTry.length && !success) {
        const { publicKey: theirPublicKey, encryptedInfo } = toTry.pop()
        try {
          info = JSON.parse(
            encodeUTF8(
              decrypt(
                mySecretKey,
                decodeBase64(theirPublicKey),
                decodeBase64(encryptedInfo)
              )
            )
          )
          success = true
        } catch (error) { console.warn(error) }
      }
      return info
    }
  },
  mutations: {
    loaded(state, loaded) { state.loaded = loaded},
    load(state, { user, provider }) {
      state.user = user
      state.provider = provider
    },
    acceptStudentAgreement(state) { state.hasAcceptedStudentAgreement = true },
    acceptTeacherAgreement(state) { state.hasAcceptedTeacherAgreement = true },
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
