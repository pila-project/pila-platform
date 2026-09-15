import languageChoices from './language-choices.js'
import { matchNavigatorLanguage } from './match-navigator-language.js'
import { HOST_TO_FIRST_LOAD_LANGUAGE } from '@/utils/constants.js'

/** Session-only persistence for an explicit UI language pick. */
export const UI_LANGUAGE_STORAGE_KEY = 'pila-ui-language'

/** Forever localStorage key from the previous policy — never read; clear on sight. */
const LEGACY_LANGUAGE_STORAGE_KEY = 'pila-language'

export function normalizeUiLanguage(value) {
  const short = String(value || '').split(/[-_]/)[0]
  return languageChoices.includes(short) ? short : null
}

export function readPersistedUiLanguage() {
  try {
    return normalizeUiLanguage(sessionStorage.getItem(UI_LANGUAGE_STORAGE_KEY))
  } catch {
    return null
  }
}

export function persistUiLanguage(value) {
  const lang = normalizeUiLanguage(value)
  if (!lang) return
  try {
    sessionStorage.setItem(UI_LANGUAGE_STORAGE_KEY, lang)
  } catch { /* private mode */ }
  clearLegacyLanguageStorage()
}

export function clearPersistedUiLanguage() {
  try {
    sessionStorage.removeItem(UI_LANGUAGE_STORAGE_KEY)
  } catch { /* private mode */ }
  clearLegacyLanguageStorage()
}

export function clearLegacyLanguageStorage() {
  try {
    localStorage.removeItem(LEGACY_LANGUAGE_STORAGE_KEY)
  } catch { /* private mode */ }
}

/**
 * UI language on store load: explicit session pick → host pin → browser → en.
 * Ignores Agent LANGUAGES[0], vuePersistentStore language, and localStorage pila-language.
 */
export function resolveUiLanguage(host = typeof window !== 'undefined' ? window.location.host : '') {
  clearLegacyLanguageStorage()
  return (
    readPersistedUiLanguage()
    || HOST_TO_FIRST_LOAD_LANGUAGE[host]
    || matchNavigatorLanguage(languageChoices)
    || 'en'
  )
}
