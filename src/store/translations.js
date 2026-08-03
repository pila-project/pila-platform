import translations from './staticTranslations.js'
import languageChoices from './languageChoices.js'

export default {
  scope: null,
  namespaced: false,
  state: () => ({
    translations: {}
  }),
  getters: {
    t: (state, _getters, rootState) => slug => {
      const slugTranslations = translations[slug]
      const lang = rootState.language
      if (!slugTranslations || !slugTranslations[lang]) {
        console.warn('MISSING TRANSLATION', slug)
        return `no translation ${slug}`
      }
      return slugTranslations[lang]
    }
  }
}
