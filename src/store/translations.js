/**
 * Trunk-style offline translations.
 * All UI strings resolve from staticTranslations.js (no Agent required for t()).
 * fetchTranslations remains a no-op for store bootstrap compatibility.
 */
import staticTranslations from './staticTranslations.js'

export default {
  scope: null,
  namespaced: false,
  state: () => ({
    translations: {},
  }),
  getters: {
    t: (_state, _getters, rootState) => {
      // Read language in the outer getter so Vuex invalidates when it changes
      // (inner-function lookups were staying on the first cached t()).
      const lang = String(rootState.language || 'en').split(/[-_]/)[0] || 'en'
      return (slug) => {
        const slugTranslations = staticTranslations[slug]
        if (!slugTranslations) {
          console.warn('MISSING TRANSLATION', slug)
          return `no translation ${slug}`
        }
        if (typeof slugTranslations[lang] === 'string' && slugTranslations[lang]) {
          return slugTranslations[lang]
        }
        if (lang !== 'en' && typeof slugTranslations.en === 'string' && slugTranslations.en) {
          return slugTranslations.en
        }
        console.warn('MISSING TRANSLATION', slug, lang)
        return `no translation ${slug}`
      }
    },
  },
  mutations: {
    // Kept for any legacy callers; no longer used for network-backed i18n
    addTranslation() {},
  },
  actions: {
    addTranslation() {},
    /** No-op: strings are fully offline static (trunk model + redesign backfill). */
    async fetchTranslations() {
      return
    },
  },
}
