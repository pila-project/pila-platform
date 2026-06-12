import translationSlugMap from './translation-slug-map.js'
import translationDefaults from './translation-defaults.js'
import { localCache, beginRevalidation, endRevalidation } from '@/utils/local-cache.js'

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
let firstLoad = true

export default {
  scope: null,
  namespaced: false,
  state: () => ({
    translations: {}
  }),
  getters: {
    t: (state, _getters, rootState) => slug => {
      const humanize = s => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      const fallback = () => translationDefaults[slug] ?? humanize(slug)
      const target = translationSlugMap[slug]
      const lang = rootState.language
      if (!target) return fallback()
      if (!state.translations?.[lang]) return fallback()
      if (!state.translations[lang][target]) return fallback()
      return state.translations[lang][target]
    }
  },
  mutations: {
    addTranslation(state, { target, value, language }) {
      if (!state.translations) state.translations = {}
      if (!state.translations[language]) state.translations[language] = {}
      state.translations[language][target] = value
    }
  },
  actions: {
    addTranslation({ commit }, t) { commit('addTranslation', t) },

    async fetchTranslations({ commit, dispatch, rootState }) {
      const userId = rootState.user
      let usedCache = false

      if (firstLoad && userId) {
        const cached = await localCache.get(userId, 'translations', 'all', SEVEN_DAYS)
        if (cached) {
          usedCache = true
          cached.forEach(t => commit('addTranslation', t))
        }
        firstLoad = false
      }

      const domain ='translate-pila-alpha.netlify.app'
      if (usedCache) beginRevalidation()
      try {
        const translations = await Agent.query('translations', [], domain) || []
        const translationPromises = translations.map(t => dispatch('addTranslation', t))
        await Promise.all(translationPromises)

        if (userId) {
          localCache.set(userId, 'translations', 'all', translations)
        }
      }
      catch (error) {
        console.warn(`ERROR FETCHING TRANSLATIONS. Ensure ${domain} is configured to allow ${location.host}`)
      } finally {
        if (usedCache) endRevalidation()
      }
    }
  }
}
