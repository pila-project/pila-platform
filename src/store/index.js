import { generateKeyPair, encrypt, decrypt, decryptSymmetric } from '@/utils/encryption.js'
import { encodeBase64, decodeBase64, encodeUTF8 } from 'tweetnacl-util'

import roles from './roles.js'
import groups from './groups.js'
import assignments from './assignments.js'
import pila_tags from './pila-tags.js'
import translations from './translations.js'

import {
  EXPERT_LIST,
  HOST_TO_TITLE,
  HOST_TO_PARTITION,
} from '@/utils/constants.js'
import { recordAuthLastLogin } from '@/utils/record-last-login.js'
import { getStoredAdminCredentialSecret } from '../teacher-login-credentials.js'
import { persistUiLanguage, resolveUiLanguage } from './ui-language.js'
import {
  hydrateVuexAgreements,
  persistStudentAgreement,
  persistTeacherAgreement,
} from '@/utils/user-agreements.js'
import {
  decryptUserInfoWithCache,
  providerKeyFingerprint,
  shouldSkipNaclAfterPublicInfo,
} from '@/utils/decrypt-user-info-cache.js'

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
      const fingerprint = providerKeyFingerprint(teacherProviderKeys(state))
      return decryptUserInfoWithCache({
        userId: user,
        useAlias: !!useAlias,
        fingerprint,
        run: () => decryptUserInfoUncached(state, getters, user, useAlias),
      })
    },

    /**
     * Decrypt a teacher-created student's login secret from
     * Agent.state(id).providerEncryptedKey. Display-only (QR/glyphs/download).
     */
    decryptUserSecret: (state) => async (userId) => {
      if (!userId) return ''
      const providerKeys = teacherProviderKeys(state)
      if (!providerKeys.length) return ''

      let encryptedKey
      try {
        encryptedKey = (await Agent.state(userId))?.providerEncryptedKey
      } catch (error) {
        console.warn('[decryptUserSecret] failed to load user', error)
        return ''
      }
      if (!encryptedKey) return ''

      for (const providerKey of providerKeys) {
        try {
          const secret = await decryptProviderEncryptedLoginSecret(encryptedKey, providerKey)
          if (secret) return secret
        } catch {
          // key may belong to a different account-creation role / wrong key — fall through
        }
      }
      return ''
    },

    /**
     * Soft probe: does the current zkek decrypt at least one of these users?
     * Returns 'missing' | 'ok' | 'invalid' | 'unknown'
     * - missing: no key stored
     * - ok: at least one encrypted payload decrypted
     * - invalid: had encrypted data to try, all failed (likely wrong key)
     * - unknown: no encrypted student data available to test
     */
    probeEncryptionKey: (state) => async (userIds = []) => {
      const providerKeys = teacherProviderKeys(state)
      if (!providerKeys.length) return 'missing'

      const zkek = localStorage.getItem(`zkek-${state.user}`)
      let attempted = 0
      const maxAttempts = 12

      for (const user of userIds) {
        if (attempted >= maxAttempts) break
        if (!user) continue

        try {
          const publicInfo = await Agent.state('user-info', user)
          if (publicInfo?.name) continue
        } catch { /* ignore */ }

        // Teacher-created accounts (symmetric) — same keys as decryptUserInfo
        try {
          const { providerEncryptedInfo } = await Agent.state(user)
          if (providerEncryptedInfo) {
            attempted++
            let opened = false
            for (const providerKey of providerKeys) {
              try {
                const secretKey = await generateKeyPair(providerKey).then(p => p.secretKey)
                decryptSymmetric(secretKey, providerEncryptedInfo)
                opened = true
                break
              } catch {
                // try next provider key
              }
            }
            if (opened) return 'ok'
            continue
          }
        } catch { /* ignore */ }

        // Linked / multi-teacher encrypted blobs — zkek-derived box key
        if (!zkek) continue
        try {
          const encryptedUserInfo = await Agent.state('encrypted-user-info', user)
          const blobs = Object.values(encryptedUserInfo || {})
          if (!blobs.length) continue
          attempted++
          const { secretKey: mySecretKey } = await generateKeyPair(zkek)
          for (const { publicKey: theirPublicKey, encryptedInfo } of blobs) {
            try {
              decrypt(
                mySecretKey,
                decodeBase64(theirPublicKey),
                decodeBase64(encryptedInfo)
              )
              return 'ok'
            } catch { /* try next blob */ }
          }
        } catch { /* ignore */ }
      }

      if (attempted === 0) return 'unknown'
      return 'invalid'
    },
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
          // Content embedding still reads LANGUAGES[0]; UI load does not.
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
      persistUiLanguage(value)
      await dispatch('fetchTranslations')
      commit('language', value)
    },
    async load({ commit, state }) {
      if (!Agent.embedded) {
        // Always re-apply cascade on load so vuePersistentStore language cannot stick.
        commit('language', resolveUiLanguage())
      }

      const { auth } = await Agent.environment()
      commit('load', auth)
      await hydrateVuexAgreements({ commit, state })

      if (state.user && state.provider !== 'anonymous') {
        await recordAuthLastLogin(auth).catch(e => console.warn('[Store] lastLogin failed:', e))
        const start = Date.now()
        const pilaSession = await Agent.state(await Agent.create({
          active_type: 'application/json;type=pila_sessions',
          active: { start, ping: start }
        }))
        function pingSession() {
          pilaSession.ping = Date.now()
          setTimeout(pingSession, 30_000)
        }
        pingSession()
      }
    },
    async acceptStudentAgreement({ commit }) {
      commit('acceptStudentAgreement')
      await persistStudentAgreement()
    },
    async acceptTeacherAgreement({ commit }) {
      commit('acceptTeacherAgreement')
      await persistTeacherAgreement()
    }
  },
  plugins: [
    store => window.store = store,
    async store => {
      store.dispatch('loaded', false)

      // Load auth first so stores have access to userId for caching
      await store.dispatch('load').catch(e => console.error('[Store] load failed:', e))

      const dispatchNames = ['fetchTranslations', 'pila_tags/load', 'roles/load', 'groups/load', 'assignments/load']
      const allDispatches = Promise.allSettled([
        store.dispatch('fetchTranslations'),
        store.dispatch('pila_tags/load'),
        store.dispatch('roles/load'),
        store.dispatch('groups/load'),
        store.dispatch('assignments/load')
      ])

      const results = await allDispatches
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[Store] ${dispatchNames[i]} failed:`, r.reason)
        }
      })

      store.dispatch('loaded', true)
    }
  ]
}

async function decryptUserInfoUncached(state, getters, user, useAlias) {
  if (useAlias && EXPERT_LIST.includes(user)) {
    return { name: 'PILA Expert', picture: null }
  }

  const userInfo = await Agent.state('user-info', user)
  if (userInfo?.name) return userInfo

  const anonymousInfo = () => ({
    name: `${getters.t('anonymous')}_${user.slice(0, 4)}`,
    picture: null,
  })

  if (shouldSkipNaclAfterPublicInfo(userInfo)) return anonymousInfo()

  const key = localStorage.getItem(`zkek-${state.user}`)
  const providerKeys = teacherProviderKeys(state)

  let createdUserInfo = null
  for (const providerKey of providerKeys) {
    try {
      createdUserInfo = await getTeacherCreatedUserInfo(user, providerKey)
      if (createdUserInfo) break
    } catch {
      // key may belong to a different account-creation role / wrong key — fall through
    }
  }

  if (createdUserInfo) return createdUserInfo

  let info = anonymousInfo()
  const encryptedUserInfo = await Agent.state('encrypted-user-info', user)
  const { secretKey: mySecretKey } = await generateKeyPair(key)
  const toTry = Object.values(encryptedUserInfo || {})
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
    } catch {
      // blob mismatch — skip nacl + negative-cache the anonymous fallback
    }
  }
  return info
}

function teacherProviderKeys(state) {
  const key = localStorage.getItem(`zkek-${state.user}`)
  return [
    key,
    state.user ? getStoredAdminCredentialSecret(state.user) : ''
  ].filter((value, index, values) => value && values.indexOf(value) === index)
}

async function decryptProviderEncryptedLoginSecret(encryptedKey, providerKey) {
  if (!encryptedKey || !providerKey) return ''
  const { secretKey } = await generateKeyPair(providerKey)
  return decryptSymmetric(secretKey, encryptedKey)
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
