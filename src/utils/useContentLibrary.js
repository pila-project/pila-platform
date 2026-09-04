import { ref, reactive, computed, watch } from 'vue'
import { MY_CONTENT_TAG } from '@/utils/constants.js'
import { exploreTaxonomy } from '@/utils/explore-taxonomy.js'
import { beginRevalidation, endRevalidation } from '@/utils/local-cache.js'
import {
  nameCacheVersion, getCachedContentName,
  tagCache, tagNameCache,
  loadTagHierarchy, getCachedTagHierarchy,
  prefetchBatch, loadExploreCache, persistExploreCache,
  restoreTagHierarchyFromCache, invalidateAll,
} from '@/utils/content-cache.js'

const PILA_TAG = '1a53db50-e248-11ee-ab5f-07f4a7408770'

// ── Module-level shared state (survives across component mounts) ──
const taggedContent = ref([])
const myContent = reactive([])
const myContentIds = reactive(new Set())
const tagCategories = ref([])
/** Bumped when tagCache is filled so filter option lists recompute (Map is not reactive). */
const tagIndexVersion = ref(0)
const _loaded = ref(false)
const _loading = ref(false)
/** Shared across all useContentLibrary() callers (Explore grid + parent page). */
const exploreUiLoading = ref(false)

function hasExploreLists() {
  return taggedContent.value.length > 0 || myContent.length > 0
}

function syncExploreLoading() {
  exploreUiLoading.value = !hasExploreLists() && (!_loaded.value || _loading.value)
}

function notifyTagIndexUpdated() {
  tagIndexVersion.value++
}

function idsEqual(a, b) {
  if (a.length !== b.length) return false
  return a.every((id, i) => id === b[i])
}

function taggingsEqual(a, b) {
  if (a.length !== b.length) return false
  return a.every((item, i) => item.target === b[i].target)
}

function categoriesEqual(a, b) {
  if (a.length !== b.length) return false
  return a.every((c, i) => c.id === b[i].id)
}

function isGradeFilterCategory(label) {
  const name = String(label || '').trim().toLowerCase()
  return name === 'grade' || name === 'minimum grade'
}

function gradeSortKey(label) {
  const raw = String(label || '').trim()
  const upper = raw.toUpperCase()
  if (upper === 'K' || upper === 'KINDERGARTEN') return 0
  if (/(?:^|\s)K(?:\s|$)/i.test(raw) && !/\d/.test(raw)) return 0
  const match = raw.match(/(\d+)/)
  if (match) return Number(match[1])
  return Number.POSITIVE_INFINITY
}

function contentCountsForCategory(categoryId) {
  const counts = {}
  for (const [, tags] of tagCache) {
    const leafIds = tags[categoryId]
    if (leafIds) {
      for (const leafId of leafIds) {
        counts[leafId] = (counts[leafId] || 0) + 1
      }
    }
  }
  return counts
}

function gradeTagOptions(cat) {
  const counts = contentCountsForCategory(cat.id)
  return (cat.leafIds || [])
    .map(leafId => ({
      value: leafId,
      label: tagNameCache.get(leafId) || leafId.slice(0, 8),
      count: counts[leafId] || 0,
    }))
    .sort((a, b) => {
      const keyA = gradeSortKey(a.label)
      const keyB = gradeSortKey(b.label)
      if (keyA !== keyB) return keyA - keyB
      return a.label.localeCompare(b.label)
    })
}

function applyMyContentIds(ids) {
  myContent.splice(0, myContent.length, ...ids)
  myContentIds.clear()
  ids.forEach(id => myContentIds.add(id))
}

/** Optimistic single-item registration after create/copy-modify (keeps array + Set in sync). */
export function registerMyContentItem(id) {
  if (!id) return
  if (!myContent.includes(id)) myContent.push(id)
  myContentIds.add(id)
}

function seedListsFromCache(cached) {
  let seeded = false
  if (cached.taggedContent?.length) {
    taggedContent.value = cached.taggedContent
    seeded = true
  }
  if (cached.myContent?.length) {
    applyMyContentIds(cached.myContent)
    seeded = true
  }
  if (cached.tagCategories?.length) {
    restoreTagHierarchyFromCache(cached.tagCategories, cached.leafToCategory)
    tagCategories.value = cached.tagCategories
    seeded = true
  }
  return seeded
}

function applyFreshExploreData(pilaContent, myContentResult, hierarchy) {
  let listsChanged = false

  if (!taggingsEqual(taggedContent.value, pilaContent)) {
    taggedContent.value = pilaContent
    listsChanged = true
  }

  const newMine = myContentResult.map(t => t.target)
  if (!idsEqual(myContent, newMine)) {
    applyMyContentIds(newMine)
    listsChanged = true
  }

  if (!categoriesEqual(tagCategories.value, hierarchy.categories)) {
    tagCategories.value = hierarchy.categories
    listsChanged = true
  }

  return listsChanged
}

/** Call after prefetchBatch (or disk cache restore) so filter dropdowns pick up tagCache. */
export { notifyTagIndexUpdated }

/** Clear in-memory explore state (e.g. on logout). */
export function resetContentLibraryState() {
  taggedContent.value = []
  myContent.splice(0, myContent.length)
  myContentIds.clear()
  tagCategories.value = []
  tagIndexVersion.value = 0
  _loaded.value = false
  _loading.value = false
  exploreUiLoading.value = false
  invalidateAll()
}

export function useContentLibrary(store) {
  const catalogPartition = store.getters.tagPartition
  const taxonomy = exploreTaxonomy(catalogPartition)
  function t(slug) { return store.getters.t(slug) }

  // ── Per-instance UI state ──
  const searchQuery = ref('')
  const activeShowTab = ref('all')
  const activeFilters = reactive({})
  const contentPage = ref(1)
  const contentPerPage = ref(12)
  syncExploreLoading()

  // ── Tabs ──
  const showTabs = computed(() => [
    { label: t('all-content'), key: 'all' },
    { label: t('pila-content'), key: 'pila' },
    { label: t('my-content'), key: 'mine' },
  ])

  // ── Filter definitions from tag hierarchy ──
  const filterDefinitions = computed(() => {
    void tagIndexVersion.value
    return tagCategories.value.map(cat => {
      const label = tagNameCache.get(cat.id) || cat.name
      return {
        key: cat.id,
        label,
        options: (isGradeFilterCategory(label) || isGradeFilterCategory(cat.name))
          ? gradeTagOptions(cat)
          : uniqueTagValues(cat.id),
      }
    })
  })

  function uniqueTagValues(categoryId) {
    const counts = contentCountsForCategory(categoryId)
    return Object.entries(counts)
      .map(([leafId, count]) => ({
        value: leafId,
        label: tagNameCache.get(leafId) || leafId.slice(0, 8),
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  function initFilters() {
    for (const cat of tagCategories.value) {
      if (!activeFilters[cat.id]) activeFilters[cat.id] = []
    }
  }

  // ── Content lists ──
  const currentContentList = computed(() => {
    const pilaList = taggedContent.value.map(t => t.target)
    if (activeShowTab.value === 'mine') return [...myContent]
    if (activeShowTab.value === 'pila') return pilaList
    return [...new Set([...pilaList, ...myContent])]
  })

  const filteredContentList = computed(() => {
    void nameCacheVersion.value
    let list = currentContentList.value
    const lang = store.getters.language()

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(id => {
        const name = getCachedContentName(id, lang)
        return name ? name.toLowerCase().includes(q) : false
      })
    }

    for (const [key, selected] of Object.entries(activeFilters)) {
      if (selected && selected.length) {
        list = list.filter(id => {
          const tags = tagCache.get(id)
          if (!tags || !tags[key]) return false
          const vals = Array.isArray(tags[key]) ? tags[key] : [tags[key]]
          return selected.some(v => vals.includes(v))
        })
      }
    }

    return list
  })

  const paginatedContentList = computed(() => {
    if (contentPerPage.value === -1) return filteredContentList.value
    const start = (contentPage.value - 1) * contentPerPage.value
    return filteredContentList.value.slice(start, start + contentPerPage.value)
  })

  watch([searchQuery, activeShowTab, () => JSON.stringify(activeFilters)], () => {
    contentPage.value = 1
  })

  // ── Helpers ──
  function getItemTagLabels(id) {
    const tags = tagCache.get(id) || {}
    const labels = []
    for (const leafIds of Object.values(tags)) {
      for (const leafId of leafIds) {
        const name = tagNameCache.get(leafId)
        if (name) labels.push(name)
      }
    }
    return labels.slice(0, 4)
  }

  function isMyContent(id) {
    return myContentIds.has(id)
  }

  // ── Shared data loading (stale-while-revalidate) ──
  async function ensureLoaded({ useDiskCache = true } = {}) {
    if (_loaded.value) {
      initFilters()
      if (!hasExploreLists()) {
        _loaded.value = false
        return ensureLoaded({ useDiskCache })
      }
      syncExploreLoading()
      return
    }

    if (_loading.value) {
      syncExploreLoading()
      await new Promise(resolve => {
        const stop = watch(_loaded, (v) => {
          if (v) { stop(); resolve() }
        })
      })
      initFilters()
      syncExploreLoading()
      return
    }

    _loading.value = true
    syncExploreLoading()

    let userId = null
    let usedCache = false

    try {
      const env = await Agent.environment()
      userId = env.auth.user

      if (useDiskCache && userId) {
        const cached = await loadExploreCache(userId)
        if (cached) {
          const listsFromCache = seedListsFromCache(cached)
          if (listsFromCache) {
            usedCache = true
            initFilters()
            _loaded.value = true
            notifyTagIndexUpdated()
            syncExploreLoading()
          }
        }
      }

      if (usedCache) beginRevalidation()

      const hierarchy = await loadTagHierarchy(taxonomy.partition, taxonomy.roots)
      const [pilaContent, myContentResult] = await Promise.all([
        Agent.query('taggings-for-tag', [catalogPartition, PILA_TAG], 'tags.knowlearning.systems').catch(() => []),
        Agent.query('taggings-for-tag', [userId, MY_CONTENT_TAG], 'tags.knowlearning.systems').catch(() => []),
      ])

      applyFreshExploreData(pilaContent, myContentResult, hierarchy)
      initFilters()
      _loaded.value = true
      syncExploreLoading()

      const allIds = [...new Set([
        ...pilaContent.map(t => t.target),
        ...myContentResult.map(t => t.target),
      ])]
      const leafToCategory = getCachedTagHierarchy()?.leafToCategory

      const persistAfterPrefetch = () => {
        notifyTagIndexUpdated()
        if (userId) {
          persistExploreCache(userId, {
            taggedContent: taggedContent.value,
            myContent: [...myContent],
            tagCategories: tagCategories.value,
            leafToCategory: leafToCategory ? [...leafToCategory] : [],
          })
        }
      }

      const prefetch = prefetchBatch(allIds, store.getters.language(), taxonomy.partition, leafToCategory)
      if (usedCache) {
        prefetch.then(persistAfterPrefetch).catch(() => {})
      } else {
        await prefetch
        persistAfterPrefetch()
      }
    } catch (e) {
      console.warn('[useContentLibrary] load error:', e)
      syncExploreLoading()
    } finally {
      if (usedCache) endRevalidation()
      _loading.value = false
      if (!_loaded.value && hasExploreLists()) _loaded.value = true
      syncExploreLoading()
    }
  }

  return {
    taggedContent,
    myContent,
    myContentIds,
    tagCategories,

    loading: exploreUiLoading,
    searchQuery,
    activeShowTab,
    activeFilters,
    contentPage,
    contentPerPage,

    showTabs,
    filterDefinitions,
    currentContentList,
    filteredContentList,
    paginatedContentList,

    getItemTagLabels,
    isMyContent,
    ensureLoaded,
  }
}