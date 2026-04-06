import translationSlugMap from './translationSlugMap.js'
import languageChoices from './languageChoices.js'

const loggedMissingTranslations = new Set()
let hasLoggedEmptyLanguageSet = false

function logMissingTranslations(translationsByLanguage) {
  const missingByLanguage = {}

  for (const language of languageChoices) {
    const translations = translationsByLanguage?.[language]

    if (!translations) {
      if (!hasLoggedEmptyLanguageSet) {
        console.warn(
          '[translations] No translations loaded for supported language(s):',
          languageChoices.filter(lang => !translationsByLanguage?.[lang])
        )
        hasLoggedEmptyLanguageSet = true
      }
      missingByLanguage[language] = Object.keys(translationSlugMap)
      continue
    }

    const missingSlugs = Object.entries(translationSlugMap)
      .filter(([, target]) => target && !translations[target])
      .map(([slug]) => slug)

    if (missingSlugs.length) missingByLanguage[language] = missingSlugs
  }

  for (const [language, missingSlugs] of Object.entries(missingByLanguage)) {
    missingSlugs.forEach(slug => {
      const key = `${language}:${slug}`
      if (loggedMissingTranslations.has(key)) return
      loggedMissingTranslations.add(key)
      console.warn(`[translations] Missing "${slug}" for "${language}"`)
    })
  }
}

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

    async fetchTranslations({ dispatch, state }) {
      const domain ='translate-pila-alpha.netlify.app' 
      try {
        const translations = await Agent.query('translations', [], domain) || []
        const translationPromises = translations.map(t => dispatch('addTranslation', t )) //dispatch so we can await
        await Promise.all(translationPromises)
        logMissingTranslations(state.translations)
        return translations
      }
      catch (error) {
        console.warn(`ERROR FETCHING TRANSLATIONS. Ensure ${domain} is configured to allow ${location.host}`)
        return []
      }
    }
  }
}
