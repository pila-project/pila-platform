import { encrypt, decrypt, generateKeyPair } from '../encryption.js'
import { encodeBase64, decodeBase64, encodeUTF8 } from 'tweetnacl-util'

import roles from './roles.js'
import groups from './groups.js'
import assignments from './assignments.js'
import pila_tags from './pila_tags.js'
import content from './content.js'
import translations from './translations.js'

import languageChoices from './languageChoices.js'
import { matchNavigatorLanguage } from './matchNavigatorLanguage.js'

const EXPERT_LIST = [
  'f74e9cb3-2b53-4c85-9b0c-f1d61b032b3f'
]

const isThailandDomain = [
  'thailand.pilaproject.org',
  'f74e9cb3-2b53-4c85-9b0c-f1d61b032b3f.localhost:9898'
].includes(location.host)

export default {
  modules: {
    assignments,
    groups,
    roles,
    pila_tags,
    translations,
    content
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
    isThailandDomain: state => isThailandDomain,
    tagPartition: state => isThailandDomain ? 'PILA Thailand' : 'PILA International',
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
    language(state, val) { state.language = val },
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
      const language = matchNavigatorLanguage(languageChoices)
      commit('language', language)

      if (!state.user) {
        const { auth } = await Agent.environment()
        commit('load', auth)
      }

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

      await Promise.all([
        store.dispatch('load'),
        store.dispatch('fetchTranslations'),
        store.dispatch('content/load'),
        store.dispatch('pila_tags/load'),
        store.dispatch('roles/load'),
        store.dispatch('groups/load'),
        store.dispatch('assignments/load')
      ])

      store.dispatch('loaded', true)
    }
  ]
}

async function getTeacherCreatedUserInfo(id, key) {

  let editUserInfo

  const userInfo = await Agent.state(id)

  if (!userInfo.credentials) return

  try {
    const teacherKeys = await generateKeyPair(key)
    const ephemeralPublicKey = decodeBase64(userInfo.credentials[0].public_key)

    const studentSecretKey = decrypt(
      teacherKeys.secretKey,
      ephemeralPublicKey,
      decodeBase64(userInfo.credentials[0].owner_cred_encrypted_user_cred)
    )

    return JSON.parse(encodeUTF8(decrypt(
      studentSecretKey,
      ephemeralPublicKey,
      decodeBase64(userInfo.credentials[0].user_cred_encrypted_info)
    )))
  }
  catch (error) {
    console.log('ERROR decrypting user creds', error)
  }
}
