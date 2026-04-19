import { generateKeyPair, encrypt, decrypt, decryptSymmetric } from '@/utils/encryption.js'
import { encodeBase64, decodeBase64, encodeUTF8 } from 'tweetnacl-util'

import roles from './roles.js'
import groups from './groups.js'
import assignments from './assignments.js'
import pila_tags from './pila-tags.js'
import translations from './translations.js'

import languageChoices from './language-choices.js'
import { matchNavigatorLanguage } from './match-navigator-language.js'
import {
  EXPERT_LIST,
  HOST_TO_TITLE,
  HOST_TO_PARTITION,
  HOST_TO_FIRST_LOAD_LANGUAGE
} from '@/utils/constants.js'

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
    hasAcceptedTeacherAgreement: false
  }),
  getters: {
    domainTitle: () => HOST_TO_TITLE[location.host],
    tagPartition: state => HOST_TO_PARTITION[location.host],
    isAnonymous: state => () => state.provider === 'anonymous',
    loaded: state => () => state.loaded,
    user: state => () => state.user,
    language: state => () => state.language,
    hasAcceptedStudentAgreement: state => () => state.hasAcceptedStudentAgreement,
    hasAcceptedTeacherAgreement: state => () => state.hasAcceptedTeacherAgreement,
    decryptUserInfo: (state, getters) => async (user, useAlias) => {
      if (useAlias && EXPERT_LIST.includes(user)) {
        return { name: 'PILA Expert', picture: null }
      }

      const userInfo = await Agent.state('user-info', user)
      if (userInfo?.name) return userInfo

      const key = localStorage.getItem(`zkek-${state.user}`)

      const createdUserInfo = await getTeacherCreatedUserInfo(user, key)

      if (createdUserInfo) return createdUserInfo

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
    language(state, val) {
      state.language = val
      Agent
        .environment()
        .then(({ variables }) => {
          variables.LANGUAGES?.unshift(val)
        })
    },
    addTranslation(state, { target, value, language }) {
      if (!state.translations) state.translations = {}
      if (!state.translations[language]) state.translations[language] = {}
      state.translations[language][target] = value
    }
  },
  actions: {
    loaded({ commit }, loaded) { commit('loaded', loaded) },
    async language({ commit, dispatch }, value) {
      await dispatch('fetchTranslations')
      commit('language', value)
    },
    async load({ commit, state }) {
      if (!Agent.embedded) {
        const language = HOST_TO_FIRST_LOAD_LANGUAGE[window.location.host] || matchNavigatorLanguage(languageChoices)
        commit('language', language)
      }

      const { auth } = await Agent.environment()
      commit('load', auth)

      if (state.user && state.provider !== 'anonymous') {
        const start = Date.now()
        const pilaSession = await Agent.state(await Agent.create({
          active_type: 'application/json;type=pila_sessions',
          active: { start, ping: start }
        }))
        function pingSession() {
          pilaSession.ping = Date.now()
          setTimeout(pingSession, 5000)
        }
        pingSession()
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

      const dispatchNames = ['load', 'fetchTranslations', 'pila_tags/load', 'roles/load', 'groups/load', 'assignments/load']
      const allDispatches = Promise.allSettled([
        store.dispatch('load'),
        store.dispatch('fetchTranslations'),
        store.dispatch('pila_tags/load'),
        store.dispatch('roles/load'),
        store.dispatch('groups/load'),
        store.dispatch('assignments/load')
      ])

      const timeout = new Promise(resolve => setTimeout(() => resolve(null), 10000))
      const results = await Promise.race([allDispatches, timeout])

      if (results) {
        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            console.error(`[Store] ${dispatchNames[i]} failed:`, r.reason)
          }
        })
      } else {
        console.warn('[Store] initialization timed out — showing login')
        store.commit('load', { user: null, provider: 'anonymous' })
      }

      store.dispatch('loaded', true)
    }
  ]
}

async function getTeacherCreatedUserInfo(id, key) {
  const { providerEncryptedInfo } = await Agent.state(id)

  if (!providerEncryptedInfo) return

  const { info } = JSON.parse(
    decryptSymmetric(
      await generateKeyPair(key).then(p => p.secretKey),
      providerEncryptedInfo
    )
  )

  return info
}
