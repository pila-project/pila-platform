import { validate as isUUID } from 'uuid'

const DEFAULT_TRANSLATION_DOMAIN = 'translate-karel-alpha.netlify.app'
const isBettyURL = url => url?.startsWith?.('https://bettysbrain.knowlearning.systems/')

function isNameMap(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isEnglishLang(lang) {
    const short = String(lang || 'en').split(/[-_]/)[0].toLowerCase()
    return !short || short === 'en'
}

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

/**
 * Resolve a display name for content plus whether it is a true translation
 * for `lang` (not an English/canonical fallback).
 * Plain string state names are canonical — never treated as lang-exact —
 * so translate-item can still supply Thai/etc.
 */
export async function resolveTranslatedContentName(
    content,
    lang,
    domain = DEFAULT_TRANSLATION_DOMAIN
) {
    if (isBettyURL(content)) {
        return resolveBettyURLName(content, lang, domain)
    }
    return resolveTaskDisplayName(content, lang, domain)
}

export default async function displayTranslatedContent(
    content,
    lang,
    domain = DEFAULT_TRANSLATION_DOMAIN
) {
    const { name } = await resolveTranslatedContentName(content, lang, domain)
    return name
}

async function resolveBettyURLName(url, lang, domain) {
    if (!isBettyURL(url)) {
        console.warn('non-betty url', url)
        return { name: `betty url name not found: ${url}`, exact: false }
    }
    const bettyId = url.split('/')[4]
    if (!isUUID(bettyId)) {
        console.warn('unfound id in betty url', bettyId)
        return { name: `betty url id not id ${bettyId}`, exact: false }
    }
    const { name } = await Agent.metadata(bettyId)

    if (isNameMap(name)) {
        const exact = localizedNameFromValue(name, lang, { requireExact: true })
        if (exact) {
            if (isUUID(exact)) {
                return translateIdResolved(exact, lang, domain)
            }
            return { name: exact, exact: true }
        }
    }

    // Betty metadata id may itself need translate-item via task path when it is a UUID name
    if (typeof name === 'string' && isUUID(name)) {
        return translateIdResolved(name, lang, domain)
    }

    const fallback = localizedNameFromValue(name, lang)
    if (!fallback) {
        console.warn('name from metadata not found for betty url, id', url, bettyId)
        return { name: `betty md name not found ${bettyId}`, exact: false }
    }
    if (isUUID(fallback)) {
        return translateIdResolved(fallback, lang, domain)
    }
    // Canonical/English fallback — exact only when UI language is English
    return { name: fallback, exact: isEnglishLang(lang) }
}

export async function translateNameFromTaskId (
    taskId,
    lang,
    domain = DEFAULT_TRANSLATION_DOMAIN
) {
    const { name } = await resolveTaskDisplayName(taskId, lang, domain)
    return name
}

async function resolveTaskDisplayName(taskId, lang, domain) {
    const { name } = await Agent.state(taskId)

    // Object maps only: per-lang keys are true exact translations.
    // A plain string name is canonical/English — do NOT treat it as lang-exact
    // or we skip translate-item and permanently cache English under id:th.
    if (isNameMap(name)) {
        const exactLocalizedName = localizedNameFromValue(name, lang, { requireExact: true })
        if (exactLocalizedName) {
            if (isUUID(exactLocalizedName)) {
                return translateIdResolved(exactLocalizedName, lang, domain)
            }
            return { name: exactLocalizedName, exact: true }
        }
    }

    // Prefer real translations (same filter as tag names — skip is_fallback).
    try {
        const translations = await Agent.query('translate-item', [ taskId, [ lang ] ], 'translations.pilaproject.org')
        const list = Array.isArray(translations) ? translations : []
        const nameTranslation = list.find(t => (
            !t.is_fallback && t.path?.length === 2 && t.path[1] === 'name' && t.value
        ))
        if (nameTranslation?.value) {
            return { name: String(nameTranslation.value), exact: true }
        }
    } catch {
        // fall through to canonical/English
    }

    if (typeof name === 'string' && isUUID(name.trim())) {
        return translateIdResolved(name.trim(), lang, domain)
    }

    if (isNameMap(name)) {
        const localizedName = localizedNameFromValue(name, lang)
        if (!localizedName) {
            console.warn(`task name not found for ${taskId}`)
            return { name: `task name not found for ${taskId}`, exact: false }
        }
        if (isUUID(localizedName)) {
            return translateIdResolved(localizedName, lang, domain)
        }
        return { name: localizedName, exact: isEnglishLang(lang) }
    }

    if (typeof name === 'string' && name.trim()) {
        return { name: name.trim(), exact: isEnglishLang(lang) }
    }

    console.warn(`task name not found for ${taskId}`)
    return { name: `task name not found for ${taskId}`, exact: false }
}

async function translateIdResolved(id, lang, domain = DEFAULT_TRANSLATION_DOMAIN) {
    const {
        source_string: fallback,
        language: srcLanguage
    } = await Agent.state(id)
    if (lang === srcLanguage && fallback) {
        return { name: fallback, exact: true }
    }
    const translation = await attemptTranslation(id, lang, domain)
    if (translation) return { name: translation, exact: true }
    if (fallback) {
        console.warn(`translation for ${id} in ${lang} not found, using fallback`)
        return { name: fallback, exact: isEnglishLang(lang) }
    }
    console.warn(`neither translation nor fallback found for ${id}found`)
    return { name: undefined, exact: false }
}

async function translateId(id, lang, domain = DEFAULT_TRANSLATION_DOMAIN) {
    const { name } = await translateIdResolved(id, lang, domain)
    return name
}

async function attemptTranslation(id, lang, domain) {
    const r = await Agent.query('translate', [ id, lang ], domain)
    return r?.[0]?.value
}
