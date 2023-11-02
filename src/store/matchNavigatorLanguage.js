import languageChoices from './languageChoices.js'

export function matchNavigatorLanguage(incomingChoices = languageChoices) {
    const shortChoices = incomingChoices.map(lang => lang.split('-')[0])
    const shortenedNav = navigator.languages.map(lang => lang.split('-')[0])
    const firstMatch = shortenedNav.find(lang => shortChoices.includes(lang))
    return firstMatch ? firstMatch : 'en'
}

export function topLanguageChoice() {
    const defaultIfNoneFound = 'en'
    const languagesFound = navigator.languages
    if (!languagesFound || !languagesFound[0]) return defaultIfNoneFound
    else return navigator.languages[0].slice(0,2)
}