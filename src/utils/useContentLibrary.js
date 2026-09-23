import { ref, reactive, computed, watch } from 'vue'
import { MY_CONTENT_TAG } from '@/utils/constants.js'
import { exploreTaxonomy } from '@/utils/explore-taxonomy.js'
import { beginRevalidation, endRevalidation } from '@/utils/local-cache.js'
import { GRADE_CATEGORY_IDS } from '@/utils/tag-name-translations.js'
import {
  nameCacheVersion, getCachedContentName,
  tagCache, tagNameCacheVersion,
  getCachedTagName, prefetchTagNames,
  loadTagHierarchy, getCachedTagHierarchy,
  loadExploreCache, persistExploreCache,
  restoreTagHierarchyFromCache, invalidateAll, invalidateNames,
  prefetchContentNames,
} from '@/utils/content-cache.js'
import {
  catalogTagIndexComplete,
  fetchTagFilterMatch,
  selectedFilterGroups,
} from '@/utils/explore-catalog-fill.js'

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

function isGradeFilterCategory(cat) {
  if (!cat) return false
  if (cat.id && GRADE_CATEGORY_IDS.has(cat.id)) return true
  const name = String(cat.name || '').trim().toLowerCase()
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

function gradeTagOptions(cat, lang, countsComplete) {
  const counts = contentCountsForCategory(cat.id)
  return (cat.leafIds || [])
    .map(leafId => ({
      value: leafId,
      label: getCachedTagName(leafId, lang) || leafId.slice(0, 8),
      // Partial tagCache under-counts. Hide the badge until every catalog id is indexed.
      count: countsComplete ? (counts[leafId] || 0) : null,
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

export function useContentLibrary(store, { fillDetails = false } = {}) {
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

  const catalogIds = computed(() => {
    const pilaList = taggedContent.value.map(item => item.target)
    return [...new Set([...pilaList, ...myContent])]
  })

  // ── Filter definitions from tag hierarchy ──
  const filterDefinitions = computed(() => {
    void tagIndexVersion.value
    void tagNameCacheVersion.value
    const lang = store.getters.language()
    const countsComplete = catalogTagIndexComplete(tagCache, catalogIds.value)
    return tagCategories.value.map(cat => {
      const label = getCachedTagName(cat.id, lang) || cat.name
      return {
        key: cat.id,
        label,
        options: isGradeFilterCategory(cat)
          ? gradeTagOptions(cat, lang, countsComplete)
          : uniqueTagValues(cat, lang, countsComplete),
      }
    })
  })

  function uniqueTagValues(cat, lang, countsComplete) {
    const counts = contentCountsForCategory(cat.id)
    // A full per-id tag index is no longer prefetched. Until one exists (disk
    // restore), list every taxonomy leaf so the dropdown is not empty, and
    // omit counts — a partial tagCache would show a lie.
    if (!countsComplete) {
      return (cat.leafIds || [])
        .map(leafId => ({
          value: leafId,
          label: getCachedTagName(leafId, lang) || leafId.slice(0, 8),
          count: null,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    }
    return Object.entries(counts)
      .map(([leafId, count]) => ({
        value: leafId,
        label: getCachedTagName(leafId, lang) || leafId.slice(0, 8),
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
    // PILA Expert is exclusive: never include myContent ids (UIUX-215).
    if (activeShowTab.value === 'pila') {
      return pilaList.filter(id => !myContentIds.has(id))
    }
    return [...new Set([...pilaList, ...myContent])]
  })

  const selectedTagGroups = computed(() => selectedFilterGroups(activeFilters))

  /** Server match for the active tag filters. null = no filter, or not ready. */
  const tagMatch = ref(null)
  const tagFiltersPending = ref(false)
  const tagFilterFailed = ref(false)
  let tagFilterToken = 0

  watch(
    () => JSON.stringify(selectedTagGroups.value),
    () => {
      const groups = selectedTagGroups.value
      const token = ++tagFilterToken
      tagFilterFailed.value = false
      if (!groups.length) {
        tagMatch.value = null
        tagFiltersPending.value = false
        return
      }
      // Drop the previous match immediately so a stale full list is not named.
      tagMatch.value = null
      tagFiltersPending.value = true
      fetchTagFilterMatch(taxonomy.partition, groups)
        .then((set) => {
          if (token !== tagFilterToken) return
          tagMatch.value = set
        })
        .catch((error) => {
          console.warn('[useContentLibrary] taggings-intersection failed', error)
          if (token !== tagFilterToken) return
          tagFilterFailed.value = true
          tagMatch.value = null
        })
        .finally(() => {
          if (token === tagFilterToken) tagFiltersPending.value = false
        })
    },
    { immediate: true },
  )

  function applyClientTagFilters(list) {
    let next = list
    for (const [key, selected] of Object.entries(activeFilters)) {
      if (selected && selected.length) {
        next = next.filter(id => {
          const tags = tagCache.get(id)
          if (!tags || !tags[key]) return false
          const vals = Array.isArray(tags[key]) ? tags[key] : [tags[key]]
          return selected.some(v => vals.includes(v))
        })
      }
    }
    return next
  }

  /**
   * Tab list, clipped by taggings-intersection when filters are on.
   * Search is NOT applied here — names are resolved for this set first.
   */
  const scopeContentList = computed(() => {
    const list = currentContentList.value
    const groups = selectedTagGroups.value
    if (!groups.length) return list
    if (tagFilterFailed.value) return list
    if (tagFiltersPending.value || !tagMatch.value) return []
    const match = tagMatch.value
    return list.filter(id => match.has(id))
  })

  const filteredContentList = computed(() => {
    void nameCacheVersion.value
    void tagIndexVersion.value
    let list = scopeContentList.value
    const lang = store.getters.language()

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(id => {
        const name = getCachedContentName(id, lang)
        return name ? name.toLowerCase().includes(q) : false
      })
    }

    // Intersection is the filter. Client tagCache runs only if that query fails.
    if (tagFilterFailed.value && selectedTagGroups.value.length) {
      list = applyClientTagFilters(list)
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

  // Language switch drops cached names before the scope watcher refills them.
  watch(
    () => store.getters.language(),
    (lang, prev) => {
      if (!prev || !lang || lang === prev) return
      invalidateNames()
    },
    { flush: 'sync' },
  )

  async function persistCurrentExplore() {
    try {
      const env = await Agent.environment()
      const userId = env?.auth?.user
      if (!userId) return
      const leafToCategory = getCachedTagHierarchy()?.leafToCategory
      persistExploreCache(userId, {
        taggedContent: taggedContent.value,
        myContent: [...myContent],
        tagCategories: tagCategories.value,
        leafToCategory: leafToCategory ? [...leafToCategory] : [],
      })
    } catch {
      /* ignore */
    }
  }

  // Only the visible browser fills names. Other useContentLibrary() callers
  // (Explore page shell, sequence modal) share the id lists but keep their own
  // empty filters — a second watcher would name the unfiltered catalog.
  let nameFillToken = 0
  if (fillDetails) {
    watch(
      () => {
        if (!_loaded.value) return ''
        const lang = store.getters.language()
        return `${lang}\n${scopeContentList.value.join('\n')}`
      },
      () => {
        if (!_loaded.value) return
        const lang = store.getters.language()
        const ids = scopeContentList.value
        const token = ++nameFillToken
        // Names for this id list only (tab, or tab ∩ intersection). One bump
        // at the end. Images and per-id tags are the page fill in ContentBrowser.
        void prefetchContentNames(ids, lang, {
          shouldContinue: () => token === nameFillToken,
        }).then(() => {
          if (token !== nameFillToken) return
          void persistCurrentExplore()
        }).catch((error) => {
          console.warn('[useContentLibrary] name fill failed', error)
        })
      },
      // Pickers mount after Explore has already loaded. The watch must run
      // for that scope or search only sees names the first browser filled.
      { immediate: true },
    )
  }

  // ── Helpers ──
  function getItemTagLabels(id) {
    void tagIndexVersion.value
    void tagNameCacheVersion.value
    const lang = store.getters.language()
    const tags = tagCache.get(id) || {}
    const labels = []
    for (const leafIds of Object.values(tags)) {
      for (const leafId of leafIds) {
        const name = getCachedTagName(leafId, lang)
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

      const lang = store.getters.language()
      const hierarchy = await loadTagHierarchy(taxonomy.partition, taxonomy.roots, lang)
      const [pilaContent, myContentResult] = await Promise.all([
        Agent.query('taggings-for-tag', [catalogPartition, PILA_TAG], 'tags.knowlearning.systems').catch(() => []),
        Agent.query('taggings-for-tag', [userId, MY_CONTENT_TAG], 'tags.knowlearning.systems').catch(() => []),
      ])

      applyFreshExploreData(pilaContent, myContentResult, hierarchy)
      await prefetchTagNames(lang)
      notifyTagIndexUpdated()
      initFilters()
      _loaded.value = true
      syncExploreLoading()

      // Id lists only. Names for the current scope are filled by the watcher
      // above (capped, one sort). Images and per-id tags are page-sized.
      const leafToCategory = getCachedTagHierarchy()?.leafToCategory
      if (userId) {
        persistExploreCache(userId, {
          taggedContent: taggedContent.value,
          myContent: [...myContent],
          tagCategories: tagCategories.value,
          leafToCategory: leafToCategory ? [...leafToCategory] : [],
        })
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
    scopeContentList,
    filteredContentList,
    paginatedContentList,
    tagFiltersPending,

    getItemTagLabels,
    isMyContent,
    ensureLoaded,
  }
}