import translationSlugMap from './translationSlugMap.js'

export default {
  scope: null,
  namespaced: false,
  state: () => ({
    translations: {}
  }),
  getters: {
    t: (state, _getters, rootState) => slug => {
      const target = translationSlugMap[slug]
      const lang = rootState.language
      if (!target) return `no slug ${slug}`
      if (!state.translations?.[lang]) return `no translations for ${lang}`
      if (!state.translations[lang][target]) return `${lang} ${slug}`
      else return state.translations[lang][target]
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

    async fetchTranslations({ dispatch }) {
      const domain ='translate-pila-alpha.netlify.app' 
      try {
        const translations = await Agent.query('translations', [], domain) || []
        const translationPromises = translations.map(t => dispatch('addTranslation', t )) //dispatch so we can await
        return Promise.all(translationPromises)
      }
      catch (error) {
        console.warn(`ERROR FETCHING TRANSLATIONS. Ensure ${domain} is configured to allow ${location.host}`)
        return []
      }
    }
  }
}
