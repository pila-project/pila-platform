/** Autonyms for the language picker (UIUX-163). */
export const LANGUAGE_NATIVE_NAMES = {
  en: 'English',
  th: 'ไทย',
  pl: 'Polski',
  fr: 'Français',
  km: 'ខ្មែរ',
}

export function languageMenuLabel(code) {
  const name = LANGUAGE_NATIVE_NAMES[code] || String(code || '').toUpperCase()
  return `${name} (${String(code || '').toUpperCase()})`
}
