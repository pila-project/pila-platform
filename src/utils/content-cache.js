import getName from './name-and-translation-for-content.js'
import getImageFromContent from './image-ref-for-content.js'
import { localCache } from './local-cache.js'

// ── Module-level caches — persist across component mounts ──
const nameCache = new Map()
const metadataCache = new Map()
const tagCache = new Map()
const imageCache = new Map()
const tagNameCache = new Map()

// In-flight deduplication — prevents duplicate requests for the same key
const pending = new Map()

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

export function getContentName(id, lang) {
  if (nameCache.has(id)) return Promise.resolve(nameCache.get(id))
  return dedupedFetch(`name:${id}:${lang}`, async () => {
    const name = await getName(id, lang)
    if (name) nameCache.set(id, name)
    return name
  })
}

export function getContentMetadata(id) {
  if (metadataCache.has(id)) return Promise.resolve(metadataCache.get(id))
  return dedupedFetch(`meta:${id}`, async () => {
    const meta = await Agent.metadata(id)
    const entry = {
      active_type: meta.active_type,
      owner: meta.owner,
      updated: meta.updated,
    }
    metadataCache.set(id, entry)
    return entry
  })
}

export function getContentType(id) {
  const cached = metadataCache.get(id)
  if (cached) {
    return cached.active_type === 'application/json;type=sequence' ? 'sequence' : 'item'
  }
  return null
}

export function getContentImage(id) {
  if (imageCache.has(id)) return Promise.resolve(imageCache.get(id))
  return dedupedFetch(`img:${id}`, async () => {
    const url = await getImageFromContent(id)
    imageCache.set(id, url)
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

export async function loadTagHierarchy(partition, competencyTag) {
  if (tagHierarchyData) return tagHierarchyData

  const cats = await Agent.query(
    'taggings-targeting-tags', [partition, competencyTag], 'tags.knowlearning.systems'
  ).catch(() => [])

  const categories = []
  const leafToCategory = new Map()

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

    categories.push({ id: catId, name: catName, leafIds })
  }

  tagHierarchyData = { categories, leafToCategory }
  return tagHierarchyData
}

export function getCachedTagHierarchy() {
  return tagHierarchyData
}

// ── Batch prefetch ──

export async function prefetchBatch(ids, lang, partition, leafToCategory) {
  await Promise.allSettled(
    ids.map(async (id) => {
      await Promise.allSettled([
        getContentName(id, lang),
        getContentMetadata(id),
        getContentImage(id),
        getContentTags(id, partition, leafToCategory),
      ])
    })
  )
}

// ── Cache access (synchronous reads) ──

export { nameCache, metadataCache, tagCache, imageCache, tagNameCache }

// ── Disk persistence (IndexedDB) ──

function applyMapsToMemory(maps) {
  if (!maps) return
  if (maps.names) for (const [k, v] of maps.names) nameCache.set(k, v)
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
  let cached = await localCache.get(userId, 'content', 'explore')
  if (!cached) {
    const legacyMaps = await localCache.get(userId, 'content', 'maps')
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
  localCache.get(userId, 'content', 'explore').then((existing) => {
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
  const existing = await localCache.get(userId, 'content', 'explore')
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
  nameCache.delete(id)
  metadataCache.delete(id)
  tagCache.delete(id)
  imageCache.delete(id)
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
  tagHierarchyData = null
}
