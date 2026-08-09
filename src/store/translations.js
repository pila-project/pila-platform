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
    t: (_state, _getters, rootState) => (slug) => {
      const lang = rootState.language || 'en'
      const slugTranslations = staticTranslations[slug]
      if (!slugTranslations) {
        console.warn('MISSING TRANSLATION', slug)
        return `no translation ${slug}`
      }
      // Prefer active language; fall back to English within the static pack (still offline)
      if (typeof slugTranslations[lang] === 'string' && slugTranslations[lang]) {
        return slugTranslations[lang]
      }
      if (lang !== 'en' && typeof slugTranslations.en === 'string' && slugTranslations.en) {
        return slugTranslations.en
      }
      console.warn('MISSING TRANSLATION', slug, lang)
      return `no translation ${slug}`
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
