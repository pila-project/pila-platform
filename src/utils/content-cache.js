import { ref } from 'vue'
import getName from './name-and-translation-for-content.js'
import getImageFromContent from './image-ref-for-content.js'
import { localCache } from './local-cache.js'

/** Disk cache TTL for explore lists, metadata maps, and image blobs. */
const CONTENT_CACHE_TTL = 60 * 60 * 1000 // 1 hour

// ── Module-level caches — persist across component mounts ──
const nameCache = new Map()
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

function bumpNameCacheVersion() {
  nameCacheVersion.value++
}

export function nameCacheKey(id, lang) {
  return `${id}:${lang || 'en'}`
}

/** Sync read: lang-keyed content name, with legacy bare-id fallback (sequences). */
export function getCachedContentName(id, lang) {
  if (!id) return null
  return nameCache.get(nameCacheKey(id, lang)) ?? nameCache.get(id) ?? null
}

export function setCachedContentName(id, name, lang) {
  if (!id || !name) return
  nameCache.set(nameCacheKey(id, lang), name)
  bumpNameCacheVersion()
}

/** Sequences / assignments store display names under bare id. */
export function setCachedLegacyName(id, name) {
  if (!id || !name) return
  nameCache.set(id, name)
  bumpNameCacheVersion()
}

export function getContentName(id, lang) {
  const key = nameCacheKey(id, lang)
  if (nameCache.has(key)) return Promise.resolve(nameCache.get(key))
  return dedupedFetch(`name:${key}`, async () => {
    const name = await getName(id, lang)
    if (nameCache.has(key)) return nameCache.get(key)
    if (name) {
      nameCache.set(key, name)
      bumpNameCacheVersion()
    }
    return name
  })
}

export function getContentMetadata(id) {
  if (metadataCache.has(id)) return Promise.resolve(metadataCache.get(id))
  return dedupedFetch(`meta:${id}`, async () => {
    try {
      const meta = await Agent.metadata(id)
      const entry = {
        active_type: meta.active_type,
        owner: meta.owner,
        updated: meta.updated,
      }
      metadataCache.set(id, entry)
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

function countSequenceItems(items) {
  if (items == null) return 0
  if (Array.isArray(items)) return items.filter(Boolean).length
  if (typeof items !== 'object') return 0
  let n = 0
  for (const entry of Object.values(items)) {
    if (typeof entry === 'string' && entry) n++
    else if (entry && typeof entry === 'object' && typeof entry.id === 'string' && entry.id) n++
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
    const entry = {
      description: String(state?.description || '').trim(),
      itemCount: isSequence ? countSequenceItems(state?.items) : 1,
      isSequence,
      kind,
    }
    previewMetaCache.set(id, entry)
    previewMetaVersion.value++
    return entry
  })
}

export function getContentImage(id) {
  if (imageCache.has(id)) return Promise.resolve(imageCache.get(id))
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

export function getTagName(tagId) {
  if (tagNameCache.has(tagId)) return Promise.resolve(tagNameCache.get(tagId))
  return dedupedFetch(`tagname:${tagId}`, async () => {
    try {
      const { name } = await Agent.state(tagId)
      const resolved = name || tagId.slice(0, 8)
      tagNameCache.set(tagId, resolved)
      return resolved
    } catch {
      tagNameCache.set(tagId, tagId.slice(0, 8))
      return tagId.slice(0, 8)
    }
  })
}

// ── Tag hierarchy ──

export async function loadTagHierarchy(partition, roots) {
  const rootList = (Array.isArray(roots) ? roots : [roots]).filter(Boolean)
  const cacheKey = `${partition || ''}:${rootList.join(',')}`
  if (tagHierarchyData?.cacheKey === cacheKey) return tagHierarchyData

  const categories = []
  const leafToCategory = new Map()

  for (const rootId of rootList) {
    const cats = await Agent.query(
      'taggings-targeting-tags', [partition, rootId], 'tags.knowlearning.systems'
    ).catch(() => [])

    for (const cat of cats) {
      const catId = cat.target
      const catName = await getTagName(catId)

      const leaves = await Agent.query(
        'taggings-targeting-tags', [partition, catId], 'tags.knowlearning.systems'
      ).catch(() => [])

      const leafIds = leaves.map(l => l.target)

      await Promise.allSettled(
        leafIds.map(async (leafId) => {
          leafToCategory.set(leafId, catId)
          await getTagName(leafId)
        })
      )

      categories.push({ id: catId, name: catName, leafIds, rootId })
    }
  }

  tagHierarchyData = { cacheKey, categories, leafToCategory }
  return tagHierarchyData
}

export function getCachedTagHierarchy() {
  return tagHierarchyData
}

// ── Batch prefetch ──

export async function prefetchBatch(ids, lang, partition, leafToCategory, { priorityIds = [] } = {}) {
  const priority = new Set(priorityIds)
  const ordered = [
    ...ids.filter(id => priority.has(id)),
    ...ids.filter(id => !priority.has(id)),
  ]

  const prefetchOne = async (id) => {
    await Promise.allSettled([
      getContentName(id, lang),
      getContentMetadata(id),
      getContentImage(id),
      getContentTags(id, partition, leafToCategory),
    ])
  }

  if (priority.size) {
    await Promise.allSettled(priorityIds.map(prefetchOne))
  }
  await Promise.allSettled(ordered.filter(id => !priority.has(id)).map(prefetchOne))
}

// ── Cache access (synchronous reads) ──

export { nameCache, metadataCache, tagCache, imageCache, tagNameCache }

// ── Disk persistence (IndexedDB) ──

function applyMapsToMemory(maps) {
  if (!maps) return
  if (maps.names) {
    for (const [k, v] of maps.names) nameCache.set(k, v)
    bumpNameCacheVersion()
  }
  if (maps.metadata) for (const [k, v] of maps.metadata) metadataCache.set(k, v)
  if (maps.tags) for (const [k, v] of maps.tags) tagCache.set(k, v)
  if (maps.images) for (const [k, v] of maps.images) imageCache.set(k, v)
  if (maps.tagNames) for (const [k, v] of maps.tagNames) tagNameCache.set(k, v)
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
        images: [...imageCache],
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
  metadataCache.delete(id)
  tagCache.delete(id)
  imageCache.delete(id)
  previewMetaCache.delete(id)
  bumpNameCacheVersion()
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
}

export function invalidateAll() {
  nameCache.clear()
  metadataCache.clear()
  tagCache.clear()
  imageCache.clear()
  tagNameCache.clear()
  previewMetaCache.clear()
  tagHierarchyData = null
}
