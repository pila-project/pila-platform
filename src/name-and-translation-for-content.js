import { validate as isUUID } from 'uuid'

const DEFAULT_TRANSLATION_DOMAIN = 'translate-karel-alpha.netlify.app'
const isBettyURL = url => url?.startsWith?.('https://bettysbrain.knowlearning.systems/')

export function localizedNameFromValue(value, lang = 'en', { requireExact = false } = {}) {
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'number') return String(value)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return ''

    const normalizedLang = typeof lang === 'string' ? lang.trim() : ''
    const baseLang = normalizedLang.includes('-') ? normalizedLang.split('-')[0] : normalizedLang
    const exactKeys = [normalizedLang, baseLang].filter(Boolean)

    for (const key of [ ...new Set(exactKeys) ]) {
        const text = value[key]
        if (typeof text === 'string' && text.trim()) return text.trim()
    }

    if (requireExact) return ''

    const fallbackKeys = [ 'default', '', 'en', ...Object.keys(value) ]

    for (const key of [ ...new Set(fallbackKeys) ]) {
        const text = value[key]
        if (typeof text === 'string' && text.trim()) return text.trim()
    }

    return ''
}

export default async function displayTranslatedContent(
    content,
    lang,
    domain = DEFAULT_TRANSLATION_DOMAIN
) {
    if (isBettyURL(content)) {
        const name = await nameFromBettyURL(content, lang)
        return isUUID(name) ? (await translateId(name, lang, domain)) : name
    } else { // content is task
        return translateNameFromTaskId(content, lang, domain)
    }
}

async function nameFromBettyURL(url, lang) {
    if (!isBettyURL(url)) {
        console.warn('non-betty url', url)
        return `betty url name not found: ${url}`
    }
    const bettyId = url.split('/')[4]
    if (!isUUID(bettyId)) {
        console.warn('unfound id in betty url', bettyId)
        return `betty url id not id ${bettyId}`
    }
    const { name } = await Agent.metadata(bettyId)
    const localizedName = localizedNameFromValue(name, lang)
    if (!localizedName) {
        console.warn('name from metadata not found for betty url, id', url, bettyId)
        return `betty md name not found ${bettyId}`
    }
    return localizedName
}

export async function translateNameFromTaskId (
    taskId,
    lang,
    domain = DEFAULT_TRANSLATION_DOMAIN
) {
    const { name } = await Agent.state(taskId)
    const exactLocalizedName = localizedNameFromValue(name, lang, { requireExact: true })

    if (exactLocalizedName) {
        return isUUID(exactLocalizedName)
            ? await translateId(exactLocalizedName, lang, domain)
            : exactLocalizedName
    }

    // attempt translation site translation first
    const translations = await Agent.query('translate-item', [ taskId, [ lang ] ], 'translations.pilaproject.org')
    const nameTranslations = translations.filter(({ path })  => path.length === 2 && path[1] === 'name')
    if (nameTranslations.length) return nameTranslations[0].value

    const localizedName = localizedNameFromValue(name, lang)
    if (!localizedName) {
        console.warn(`task name not found for ${taskId}`)
        return `task name not found for ${taskId}`
    } else if (isUUID(localizedName)) {
        return await translateId(localizedName, lang, domain)
    } else {
        return localizedName
    }
}

async function translateId(id, lang, domain = DEFAULT_TRANSLATION_DOMAIN) {
    // order of return preference is this:
    // - no translation needed, return source_string (breadcrumb)
    // - translation in lang found, return
    // - translation in lang NOT found, return fallback with warning if exists
    // - neither translation nor fallback, return something is wrong
    const {
        source_string: fallback,
        language: srcLanguage
    } = await Agent.state(id)
    if (lang === srcLanguage && fallback) return fallback 
    const translation = await attemptTranslation(id, lang, domain)
    if (translation) return translation // translation found
    if (fallback) { // no translation found, use fallback with warning
        console.warn(`translation for ${id} in ${lang} not found, using fallback`)
        return fallback 
    }
    console.warn(`neither translation nor fallback found for ${id}found`)
    return undefined
}

async function attemptTranslation(id, lang, domain) {
    const r = await Agent.query('translate', [ id, lang ], domain)
    return r?.[0]?.value
}
