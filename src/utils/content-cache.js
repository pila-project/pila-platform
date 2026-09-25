import { ref } from 'vue'
import getName, { localizedNameFromValue, resolveTranslatedContentName } from './name-and-translation-for-content.js'
import getImageFromContent from './image-ref-for-content.js'
import { localCache } from './local-cache.js'
import { getHardcodedTagTranslation } from './tag-name-translations.js'
import { mapPool } from './teacher-home.js'
import { EXPLORE_FILL_CONCURRENCY, exploreSlot } from './explore-catalog-fill.js'

/** Disk cache TTL for explore lists, metadata maps, and image blobs. */
const CONTENT_CACHE_TTL = 60 * 60 * 1000 // 1 hour

// ── Module-level caches — persist across component mounts ──
const nameCache = new Map()
/** Lang keys that resolved only to English/canonical fallback (do not re-hit network). */
const unresolvedLangKeys = new Set()
/** Disk id:lang values with no English sibling. Resolved once, then trusted. */
const unverifiedLangKeys = new Set()
/**
 * Tag lang keys that resolved only to canonical fallback.
 * Parallel to unresolvedLangKeys — must not share that set (invalidateNames
 * clears content keys on language switch; tags are prefetched instead).
 */
const unresolvedTagLangKeys = new Set()
const metadataCache = new Map()
const tagCache = new Map()
const imageCache = new Map()
const tagNameCache = new Map()
/** Explore card description + item count (UIUX-84). */
const previewMetaCache = new Map()
export const previewMetaVersion = ref(0)

// In-flight deduplication — prevents duplicate requests for the same key
const pending = new Map()

let cachedUserId = null

async function getUserId() {
  if (cachedUserId) return cachedUserId
  try {
    const env = await Agent.environment()
    cachedUserId = env?.auth?.user ?? null
  } catch {
    cachedUserId = null
  }
  return cachedUserId
}

async function loadImageBlobFromDisk(userId, id) {
  try {
    const blob = await localCache.get(userId, 'content-images', id, CONTENT_CACHE_TTL)
    if (!blob) return null
    const url = URL.createObjectURL(blob)
    imageCache.set(id, url)
    return url
  } catch {
    return null
  }
}

function persistImageBlob(userId, id, url) {
  if (!userId || !url || url.startsWith('/') || url.startsWith('blob:') || url.startsWith('data:')) return
  fetch(url)
    .then(res => res.blob())
    .then(blob => localCache.set(userId, 'content-images', id, blob))
    .catch(() => {})
}

// Tag hierarchy (loaded once, persists)
let tagHierarchyData = null // { categories: [{id, name, leafIds}], leafToCategory: Map }

// ── Helpers ──

function dedupedFetch(key, fetchFn) {
  const cached = pending.get(key)
  if (cached) return cached
  const promise = fetchFn().finally(() => pending.delete(key))
  pending.set(key, promise)
  return promise
}

// ── Public API ──

/** Bumped when nameCache entries change so search filters can recompute. */
export const nameCacheVersion = ref(0)
/** Bumped when metadata created/updated changes so Explore sorts can recompute. */
export const metadataCacheVersion = ref(0)
/** Bumped when tagNameCache entries change so Explore filters/pills recompute. */
export const tagNameCacheVersion = ref(0)

/**
 * Version bumps are not applied inside each successful fetch.
 * A burst in the same frame collapses to one increment (one Explore re-sort).
 * `withCacheVersionBatch` holds bumps and applies one increment per channel
 * when the outermost batch finishes — the catalog name fill uses that so
 * sortExploreIds runs once for the list, not once per arrival.
 */
let cacheVersionHold = 0
const versionSlots = {
  name: { dirty: false, scheduled: false, target: nameCacheVersion },
  metadata: { dirty: false, scheduled: false, target: metadataCacheVersion },
  tagName: { dirty: false, scheduled: false, target: tagNameCacheVersion },
}

function flushVersionSlot(slot) {
  if (!slot.scheduled) return
  slot.scheduled = false
  slot.target.value++
}

function scheduleVersionSlot(slot) {
  if (slot.scheduled) return
  slot.scheduled = true
  const run = () => flushVersionSlot(slot)
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
  else queueMicrotask(run)
}

function bumpVersionSlot(slot, { force = false } = {}) {
  if (cacheVersionHold > 0 && !force) {
    slot.dirty = true
    return
  }
  scheduleVersionSlot(slot)
}

function bumpNameCacheVersion(options) {
  bumpVersionSlot(versionSlots.name, options)
}

function bumpMetadataCacheVersion(options) {
  bumpVersionSlot(versionSlots.metadata, options)
}

function bumpTagNameCacheVersion(options) {
  bumpVersionSlot(versionSlots.tagName, options)
}

function releaseCacheVersionHold() {
  cacheVersionHold -= 1
  if (cacheVersionHold > 0) return
  cacheVersionHold = 0
  for (const slot of Object.values(versionSlots)) {
    if (!slot.dirty) continue
    slot.dirty = false
    slot.scheduled = false
    slot.target.value++
  }
}

/** Hold name/metadata/tag-name version bumps until `fn` settles, then bump once. */
export async function withCacheVersionBatch(fn) {
  cacheVersionHold += 1
  try {
    return await fn()
  } finally {
    releaseCacheVersionHold()
  }
}

function isEnglishLang(lang) {
  const short = String(lang || 'en').split(/[-_]/)[0].toLowerCase()
  return !short || short === 'en'
}

export function nameCacheKey(id, lang) {
  return `${id}:${lang || 'en'}`
}

/**
 * Sync read: lang-keyed content name for display.
 * Prefer id:lang. For non-English, English/bare is display-only fallback and
 * must NOT be treated as "resolved for lang" — getContentName still runs when
 * the lang key is missing (see hasCachedContentNameForLang).
 */
export function getCachedContentName(id, lang) {
  if (!id) return null
  const keyed = nameCache.get(nameCacheKey(id, lang))
  if (keyed != null) return keyed
  // Display-only English/canonical fallback (including non-EN UI).
  return nameCache.get(nameCacheKey(id, 'en')) ?? nameCache.get(id) ?? null
}

/** True only when a value was stored under id:lang (exact or English). */
export function hasCachedContentNameForLang(id, lang) {
  if (!id) return false
  return nameCache.has(nameCacheKey(id, lang))
}

export function setCachedContentName(id, name, lang) {
  if (!id || !name) return
  nameCache.set(nameCacheKey(id, lang), name)
  // Explicit edits show on the next frame even while a catalog name batch is held.
  bumpNameCacheVersion({ force: true })
}

/** Sequences / assignments store display names under bare id. */
export function setCachedLegacyName(id, name) {
  if (!id || !name) return
  nameCache.set(id, name)
  bumpNameCacheVersion({ force: true })
}

/**
 * Resolve + cache content display name for lang.
 * Exact translations (and English) are stored under id:lang permanently.
 * Non-English English/canonical fallbacks are NOT stored under id:lang
 * (UIUX-212 residual) — they seed en/bare only and are remembered in
 * unresolvedLangKeys so we do not refetch-loop on every card watch.
 */
export function getContentName(id, lang) {
  const key = nameCacheKey(id, lang)
  if (nameCache.has(key) && !unverifiedLangKeys.has(key)) return Promise.resolve(nameCache.get(key))
  if (unresolvedLangKeys.has(key)) {
    return Promise.resolve(
      nameCache.get(nameCacheKey(id, 'en')) ?? nameCache.get(id) ?? null
    )
  }
  return dedupedFetch(`name:${key}`, async () => {
    if (nameCache.has(key) && !unverifiedLangKeys.has(key)) return nameCache.get(key)
    if (unresolvedLangKeys.has(key)) {
      return nameCache.get(nameCacheKey(id, 'en')) ?? nameCache.get(id) ?? null
    }
    let name
    let exact = false
    try {
      const resolved = await resolveTranslatedContentName(id, lang)
      name = resolved?.name
      exact = !!resolved?.exact
    } catch {
      // Backward-compatible fallback if resolver throws
      name = await getName(id, lang)
      exact = isEnglishLang(lang)
    }
    if (nameCache.has(key) && !unverifiedLangKeys.has(key)) return nameCache.get(key)
    if (!name) return name

    if (exact || isEnglishLang(lang)) {
      const wasUnverified = unverifiedLangKeys.has(key)
      unresolvedLangKeys.delete(key)
      unverifiedLangKeys.delete(key)
      nameCache.set(key, name)
      if (isEnglishLang(lang)) nameCache.set(id, name)
      if (wasUnverified && !isEnglishLang(lang)) {
        const state = await Agent.state(id).catch(() => null)
        const canonical = typeof state?.name === 'string' ? state.name.trim() : ''
        if (canonical && canonical !== name) {
          nameCache.set(nameCacheKey(id, 'en'), canonical)
          if (!nameCache.has(id)) nameCache.set(id, canonical)
        }
      }
      bumpNameCacheVersion()
    } else {
      // Do not poison id:lang with English — mark unresolved and seed en/bare.
      unverifiedLangKeys.delete(key)
      nameCache.delete(key)
      unresolvedLangKeys.add(key)
      const enKey = nameCacheKey(id, 'en')
      let seeded = false
      if (!nameCache.has(enKey)) {
        nameCache.set(enKey, name)
        seeded = true
      }
      if (!nameCache.has(id)) {
        nameCache.set(id, name)
        seeded = true
      }
      if (seeded) bumpNameCacheVersion()
    }
    return name
  })
}

export function peekContentMetadata(id) {
  if (!id) return null
  return metadataCache.get(id) || null
}

export function getContentMetadata(id) {
  if (metadataCache.has(id)) return Promise.resolve(metadataCache.get(id))
  return dedupedFetch(`meta:${id}`, async () => {
    try {
      const meta = await Agent.metadata(id)
      const entry = {
        active_type: meta.active_type,
        owner: meta.owner,
        created: meta.created,
        updated: meta.updated,
        domain: meta.domain,
      }
      metadataCache.set(id, entry)
      bumpMetadataCacheVersion()
      return entry
    } catch {
      return null
    }
  })
}

export function kindFromActiveType(activeType) {
  const type = String(activeType || '')
  if (type.includes('type=sequence')) return 'sequence'
  if (type.includes('type=assignment')) return 'assignment'
  return 'item'
}

export function getContentType(id) {
  const cached = metadataCache.get(id)
  if (!cached) return null
  return kindFromActiveType(cached.active_type)
}

function sequenceEntryId(entry) {
  if (typeof entry === 'string' && entry) return entry
  if (entry && typeof entry === 'object' && typeof entry.id === 'string' && entry.id) return entry.id
  return ''
}

/** Same membership rules as normalizeSequenceItems, without importing it (that module imports this file). */
function countSequenceItems(items) {
  if (items == null || typeof items !== 'object') return 0
  let n = 0
  for (const entry of Object.values(items)) {
    if (sequenceEntryId(entry)) n++
  }
  return n
}

export function getCachedPreviewMeta(id) {
  return previewMetaCache.get(id) || null
}

/** Description + how many items this card represents (1, or sequence length). */
export function getContentPreviewMeta(id) {
  if (!id) return Promise.resolve(null)
  if (previewMetaCache.has(id)) return Promise.resolve(previewMetaCache.get(id))
  return dedupedFetch(`preview:${id}`, async () => {
    const [meta, state] = await Promise.all([
      getContentMetadata(id).catch(() => null),
      Agent.state(id).catch(() => null),
    ])
    // A live edit may have patched the card while this fetch was in flight.
    if (previewMetaCache.has(id)) return previewMetaCache.get(id)
    const kind = kindFromActiveType(meta?.active_type)
    const isSequence = kind === 'sequence'
    const counted = countSequenceItems(state?.items)
    const entry = {
      description: String(state?.description || '').trim(),
      itemCount: isSequence || counted > 0 ? counted : 1,
      isSequence,
      kind,
    }
    previewMetaCache.set(id, entry)
    previewMetaVersion.value++
    return entry
  })
}

export function getContentImage(id) {
  if (imageCache.has(id)) {
    const cached = imageCache.get(id)
    if (cached) return Promise.resolve(cached)
    imageCache.delete(id)
  }
  return dedupedFetch(`img:${id}`, async () => {
    const userId = await getUserId()
    if (userId) {
      const diskUrl = await loadImageBlobFromDisk(userId, id)
      if (diskUrl) return diskUrl
    }

    const url = await getImageFromContent(id)
    imageCache.set(id, url)
    if (userId) persistImageBlob(userId, id, url)
    return url
  })
}

export function getContentTags(id, partition, leafToCategory) {
  if (tagCache.has(id)) return Promise.resolve(tagCache.get(id))
  return dedupedFetch(`tags:${id}`, async () => {
    const tagData = await Agent.query(
      'taggings-for-target', [partition, id], 'tags.knowlearning.systems'
    ).catch(() => [])

    const tags = {}
    if (tagData.length && leafToCategory) {
      for (const t of tagData) {
        const catId = leafToCategory.get(t.tag)
        if (catId) {
          if (!tags[catId]) tags[catId] = []
          if (!tags[catId].includes(t.tag)) tags[catId].push(t.tag)
        }
      }
    }
    tagCache.set(id, tags)
    return tags
  })
}

export function tagNameCacheKey(id, lang) {
  return `${id}:${lang || 'en'}`
}

/** Sync read: lang-keyed tag name, with legacy bare-id fallback (old IndexedDB). */
export function getCachedTagName(id, lang) {
  if (!id) return null
  return tagNameCache.get(tagNameCacheKey(id, lang)) ?? tagNameCache.get(id) ?? null
}

export function setCachedTagName(id, name, lang) {
  if (!id || !name) return
  tagNameCache.set(tagNameCacheKey(id, lang), name)
  bumpTagNameCacheVersion()
}

/**
 * Exact translations (and English) are stored under id:lang permanently.
 * Non-English canonical fallbacks are NOT stored under id:lang (RR-23) —
 * they seed en/bare only and are remembered in unresolvedTagLangKeys.
 */
function cacheResolvedTagName(id, name, lang, { canonical = false } = {}) {
  if (!id || !name) return name
  const key = tagNameCacheKey(id, lang)
  if (!canonical || isEnglishLang(lang)) {
    unresolvedTagLangKeys.delete(key)
    tagNameCache.set(key, name)
    if (isEnglishLang(lang)) tagNameCache.set(id, name)
    bumpTagNameCacheVersion()
  } else {
    // Do not poison id:lang with English — mark unresolved and seed en/bare.
    unresolvedTagLangKeys.add(key)
    const enKey = tagNameCacheKey(id, 'en')
    let seeded = false
    if (!tagNameCache.has(enKey)) {
      tagNameCache.set(enKey, name)
      seeded = true
    }
    if (!tagNameCache.has(id)) {
      tagNameCache.set(id, name)
      seeded = true
    }
    if (seeded) bumpTagNameCacheVersion()
  }
  return name
}

async function resolveTagDisplayName(tagId, lang) {
  const hardcoded = getHardcodedTagTranslation(tagId, lang)
  if (hardcoded) return { name: hardcoded, canonical: false }

  let stateName
  try {
    const state = await Agent.state(tagId)
    stateName = state?.name
  } catch {
    stateName = undefined
  }

  if (stateName && typeof stateName === 'object' && !Array.isArray(stateName)) {
    const exact = localizedNameFromValue(stateName, lang, { requireExact: true })
    if (exact) return { name: exact, canonical: isEnglishLang(lang) }
  }

  try {
    const translations = await Agent.query(
      'translate-item',
      [tagId, [lang]],
      'translations.pilaproject.org',
    )
    const list = Array.isArray(translations) ? translations : []
    const nameTranslation = list.find(t => (
      !t.is_fallback && t.path?.length === 2 && t.path[1] === 'name'
    ))
    if (nameTranslation?.value) {
      return { name: String(nameTranslation.value), canonical: isEnglishLang(lang) }
    }
  } catch {
    // fall through to canonical/English
  }

  const fallback = localizedNameFromValue(stateName, lang) || tagId.slice(0, 8)
  return { name: fallback, canonical: true }
}

/**
 * Resolve + cache tag display name for lang.
 * Exact translations (and English) are stored under id:lang permanently.
 * Non-English canonical fallbacks are NOT stored under id:lang (RR-23) —
 * they seed en/bare only and are remembered in unresolvedTagLangKeys so we
 * do not refetch-loop. Unresolved is not cleared by invalidateNames.
 */
export function getTagName(tagId, lang) {
  if (!tagId) return Promise.resolve('')
  const key = tagNameCacheKey(tagId, lang)
  if (tagNameCache.has(key)) return Promise.resolve(tagNameCache.get(key))
  if (unresolvedTagLangKeys.has(key)) {
    return Promise.resolve(
      tagNameCache.get(tagNameCacheKey(tagId, 'en')) ?? tagNameCache.get(tagId) ?? ''
    )
  }
  return dedupedFetch(`tagname:${key}`, async () => {
    if (tagNameCache.has(key)) return tagNameCache.get(key)
    if (unresolvedTagLangKeys.has(key)) {
      return tagNameCache.get(tagNameCacheKey(tagId, 'en')) ?? tagNameCache.get(tagId) ?? ''
    }
    const { name, canonical } = await resolveTagDisplayName(tagId, lang || 'en')
    const resolved = name || tagId.slice(0, 8)
    return cacheResolvedTagName(tagId, resolved, lang, { canonical })
  })
}

export async function prefetchTagNames(lang) {
  const hierarchy = tagHierarchyData
  if (!hierarchy?.categories?.length) return
  const ids = []
  for (const cat of hierarchy.categories) {
    ids.push(cat.id)
    if (Array.isArray(cat.leafIds)) ids.push(...cat.leafIds)
  }
  const unique = [...new Set(ids.filter(Boolean))]
  await withCacheVersionBatch(() => (
    mapPool(unique, EXPLORE_FILL_CONCURRENCY, id => exploreSlot(
      () => getTagName(id, lang).catch(() => ''),
    ))
  ))
}

// ── Tag hierarchy ──

export async function loadTagHierarchy(partition, roots, lang) {
  const rootList = (Array.isArray(roots) ? roots : [roots]).filter(Boolean)
  const cacheKey = `${partition || ''}:${rootList.join(',')}`
  if (tagHierarchyData?.cacheKey === cacheKey) {
    await prefetchTagNames(lang)
    return tagHierarchyData
  }

  const categories = []
  const leafToCategory = new Map()

  for (const rootId of rootList) {
    const cats = await Agent.query(
      'taggings-targeting-tags', [partition, rootId], 'tags.knowlearning.systems'
    ).catch(() => [])

    for (const cat of cats) {
      const catId = cat.target
      // Category .name stays English/canonical for grade-filter detection.
      const catName = await getTagName(catId, 'en')

      const leaves = await Agent.query(
        'taggings-targeting-tags', [partition, catId], 'tags.knowlearning.systems'
      ).catch(() => [])

      const leafIds = leaves.map(l => l.target)
      for (const leafId of leafIds) leafToCategory.set(leafId, catId)

      categories.push({ id: catId, name: catName, leafIds, rootId })
    }
  }

  tagHierarchyData = { cacheKey, categories, leafToCategory }
  await prefetchTagNames(lang)
  return tagHierarchyData
}

export function getCachedTagHierarchy() {
  return tagHierarchyData
}

// ── Batch prefetch ──

/**
 * Names, and optionally metadata / tags / images, under EXPLORE_FILL_CONCURRENCY.
 * Images default off: a catalog-sized call must not download or persist blobs.
 * Page fill passes `includeImages: true` (see prefetchPageDetails).
 * One version bump when the batch settles, not one per id.
 */
export async function prefetchBatch(ids, lang, partition, leafToCategory, {
  priorityIds = [],
  includeNames = true,
  includeMetadata = true,
  includeTags = true,
  includeImages = false,
  concurrency = EXPLORE_FILL_CONCURRENCY,
} = {}) {
  const ordered = [...new Set([
    ...(priorityIds || []).filter(Boolean),
    ...(ids || []).filter(Boolean),
  ])]
  if (!ordered.length) return
  const tagsReady = includeTags && leafToCategory
  await withCacheVersionBatch(() => mapPool(ordered, concurrency, (id) => exploreSlot(async () => {
    const jobs = []
    if (includeNames) jobs.push(getContentName(id, lang))
    if (includeMetadata) jobs.push(getContentMetadata(id))
    if (tagsReady) jobs.push(getContentTags(id, partition, leafToCategory))
    if (includeImages) jobs.push(getContentImage(id))
    if (jobs.length) await Promise.allSettled(jobs)
  })))
}

function nameFillSettled(id, lang) {
  const key = nameCacheKey(id, lang)
  return nameCache.has(key) || unresolvedLangKeys.has(key)
}

/** One in-flight name job per id so a second browser does not take a second slot. */
const nameFillJobs = new Map()

/**
 * Names only, for the current id list. No images, no per-id taggings-for-target.
 * `shouldContinue` is checked before a slot is taken: a cancelled walk finishes
 * the calls already inside `getContentName` and does not queue the rest.
 */
export async function prefetchContentNames(ids, lang, { shouldContinue = () => true } = {}) {
  const ordered = [...new Set((ids || []).filter(Boolean))]
  if (!ordered.length) return
  await withCacheVersionBatch(() => mapPool(ordered, EXPLORE_FILL_CONCURRENCY, (id) => {
    if (!shouldContinue()) return undefined
    if (nameFillSettled(id, lang)) return undefined
    const key = nameCacheKey(id, lang)
    let job = nameFillJobs.get(key)
    if (!job) {
      job = exploreSlot(() => getContentName(id, lang))
      nameFillJobs.set(key, job)
      job.finally(() => {
        if (nameFillJobs.get(key) === job) nameFillJobs.delete(key)
      })
    }
    return job
  }))
}

/** Visible page (or the next page). Includes images; never call this with the catalog. */
export function prefetchPageDetails(ids, lang, partition, leafToCategory) {
  return prefetchBatch(ids, lang, partition, leafToCategory, {
    priorityIds: ids,
    includeNames: true,
    includeMetadata: true,
    includeTags: true,
    includeImages: true,
  })
}

// ── Cache access (synchronous reads) ──

export { nameCache, metadataCache, tagCache, imageCache, tagNameCache }

// ── Disk persistence (IndexedDB) ──

/**
 * Restore a lang-keyed name map from IndexedDB.
 * Bare + English keys always seed. Non-English id:lang seeds only when the
 * value differs from that id's English/canonical string — so exact Thai (etc.)
 * first-paints, while English-under-th poison from older builds is skipped
 * (UIUX-212 / RR-23).
 */
function seedLangKeyedEntriesFromDisk(entries, targetMap, { trackUnverified = false } = {}) {
  const englishById = new Map()
  const pendingNonEn = []
  for (const [k, v] of entries) {
    const key = String(k)
    const idx = key.lastIndexOf(':')
    if (idx <= 0) {
      targetMap.set(key, v)
      if (v) englishById.set(key, v)
      continue
    }
    const lang = key.slice(idx + 1)
    const id = key.slice(0, idx)
    if (isEnglishLang(lang)) {
      targetMap.set(key, v)
      if (v && !englishById.has(id)) englishById.set(id, v)
    } else {
      pendingNonEn.push([id, key, v])
    }
  }
  for (const [id, key, v] of pendingNonEn) {
    const english = englishById.get(id)
    if (english && v === english) continue
    if (typeof v === 'string' && v.trim()) {
      targetMap.set(key, v)
      if (trackUnverified && !english) unverifiedLangKeys.add(key)
    }
  }
}

export function seedNameCacheFromDisk(entries) {
  if (!entries) return
  seedLangKeyedEntriesFromDisk(entries, nameCache, { trackUnverified: true })
  bumpNameCacheVersion()
}

export function seedTagNameCacheFromDisk(entries) {
  if (!entries) return
  seedLangKeyedEntriesFromDisk(entries, tagNameCache)
  bumpTagNameCacheVersion()
}

/** Session-live blob: object URLs must not be written to or restored from Explore maps. */
function isPersistableImageUrl(url) {
  return typeof url === 'string' && url.length > 0 && !url.startsWith('blob:')
}

function applyMapsToMemory(maps) {
  if (!maps) return
  if (maps.names) {
    seedNameCacheFromDisk(maps.names)
  }
  if (maps.metadata) {
    for (const [k, v] of maps.metadata) metadataCache.set(k, v)
    bumpMetadataCacheVersion()
  }
  if (maps.tags) for (const [k, v] of maps.tags) tagCache.set(k, v)
  if (maps.images) {
    for (const [k, v] of maps.images) {
      if (isPersistableImageUrl(v)) imageCache.set(k, v)
    }
  }
  if (maps.tagNames) {
    seedTagNameCacheFromDisk(maps.tagNames)
  }
}

/** @deprecated use loadExploreCache */
export async function seedFromDisk(userId) {
  const data = await loadExploreCache(userId)
  return !!data
}

/** Restore explore lists + item caches from IndexedDB (stale-while-revalidate seed). */
export async function loadExploreCache(userId) {
  let cached = await localCache.get(userId, 'content', 'explore', CONTENT_CACHE_TTL)
  if (!cached) {
    const legacyMaps = await localCache.get(userId, 'content', 'maps', CONTENT_CACHE_TTL)
    if (!legacyMaps) return null
    applyMapsToMemory(legacyMaps)
    return { maps: legacyMaps, taggedContent: null, myContent: null, tagCategories: null, leafToCategory: null }
  }
  applyMapsToMemory(cached.maps)
  return cached
}

export function restoreTagHierarchyFromCache(categories, leafToCategoryPairs) {
  if (!categories?.length) return null
  const leafToCategory = new Map(leafToCategoryPairs || [])
  tagHierarchyData = { categories, leafToCategory }
  return tagHierarchyData
}

export function persistExploreCache(userId, {
  taggedContent,
  myContent,
  tagCategories,
  leafToCategory,
  sequences,
}) {
  localCache.get(userId, 'content', 'explore', CONTENT_CACHE_TTL).then((existing) => {
    localCache.set(userId, 'content', 'explore', {
      taggedContent: taggedContent ?? existing?.taggedContent ?? null,
      myContent: myContent ?? existing?.myContent ?? null,
      tagCategories: tagCategories ?? existing?.tagCategories ?? null,
      leafToCategory: leafToCategory ?? existing?.leafToCategory ?? [],
      sequences: sequences ?? existing?.sequences,
      maps: {
        names: [...nameCache],
        metadata: [...metadataCache],
        tags: [...tagCache],
        images: [...imageCache].filter(([, v]) => isPersistableImageUrl(v)),
        tagNames: [...tagNameCache],
      },
    })
  })
}

/** Merge active/archived sequence ids into the explore disk entry. */
export async function persistSequencesPanelCache(userId, { active, archived }) {
  const existing = await localCache.get(userId, 'content', 'explore', CONTENT_CACHE_TTL)
  if (!existing) return
  await localCache.set(userId, 'content', 'explore', {
    ...existing,
    sequences: { active, archived },
  })
}

/** @deprecated use persistExploreCache */
export function persistToDisk(userId) {
  persistExploreCache(userId, {
    taggedContent: null,
    myContent: null,
    tagCategories: null,
    leafToCategory: null,
  })
}

// ── Invalidation ──

export function invalidate(id) {
  for (const key of nameCache.keys()) {
    if (key === id || key.startsWith(`${id}:`)) nameCache.delete(key)
  }
  for (const key of [...unresolvedLangKeys]) {
    if (key === id || key.startsWith(`${id}:`)) unresolvedLangKeys.delete(key)
  }
  for (const key of [...unverifiedLangKeys]) {
    if (key === id || key.startsWith(`${id}:`)) unverifiedLangKeys.delete(key)
  }
  metadataCache.delete(id)
  tagCache.delete(id)
  imageCache.delete(id)
  previewMetaCache.delete(id)
  bumpNameCacheVersion({ force: true })
  bumpMetadataCacheVersion({ force: true })
  previewMetaVersion.value++
}

/** Merge fields into Explore card preview cache (name/description edits). */
export function patchPreviewMeta(id, patch) {
  if (!id || !patch) return
  const current = previewMetaCache.get(id) || {
    description: '',
    itemCount: 1,
    isSequence: true,
    kind: 'sequence',
  }
  previewMetaCache.set(id, { ...current, ...patch })
  previewMetaVersion.value++
}

export function invalidateNames() {
  nameCache.clear()
  unresolvedLangKeys.clear()
  unverifiedLangKeys.clear()
  bumpNameCacheVersion({ force: true })
}

export function invalidateAll() {
  nameCache.clear()
  unresolvedLangKeys.clear()
  unverifiedLangKeys.clear()
  unresolvedTagLangKeys.clear()
  metadataCache.clear()
  bumpMetadataCacheVersion()
  tagCache.clear()
  imageCache.clear()
  tagNameCache.clear()
  bumpTagNameCacheVersion()
  previewMetaCache.clear()
  tagHierarchyData = null
}
