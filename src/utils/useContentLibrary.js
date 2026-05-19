import { ref, reactive, computed, watch } from 'vue'
import { MY_CONTENT_TAG } from '@/utils/constants.js'
import {
  nameCache, tagCache, tagNameCache,
  loadTagHierarchy, getCachedTagHierarchy,
  prefetchBatch, seedFromDisk, persistToDisk,
} from '@/utils/content-cache.js'

const PILA_TAG = '1a53db50-e248-11ee-ab5f-07f4a7408770'
const COMPETENCY_TAG = 'f760dad0-f133-11ee-804e-27f76a81958c'

// ── Module-level shared state (survives across component mounts) ──
const taggedContent = ref([])
const myContent = reactive([])
const myContentIds = reactive(new Set())
const tagCategories = ref([])
const _loaded = ref(false)
const _loading = ref(false)

export function useContentLibrary(store) {
  const partition = store.getters.tagPartition
  function t(slug) { return store.getters.t(slug) }

  // ── Per-instance UI state ──
  const searchQuery = ref('')
  const activeShowTab = ref('all')
  const activeFilters = reactive({})
  const contentPage = ref(1)
  const contentPerPage = ref(12)
  const loading = ref(!_loaded.value)

  // ── Tabs ──
  const showTabs = computed(() => [
    { label: t('all-content'), key: 'all' },
    { label: t('pila-content'), key: 'pila' },
    { label: t('my-content'), key: 'mine' },
  ])

  // ── Filter definitions from tag hierarchy ──
  const filterDefinitions = computed(() => {
    return tagCategories.value.map(cat => ({
      key: cat.id,
      label: tagNameCache.get(cat.id) || cat.name,
      options: uniqueTagValues(cat.id),
    }))
  })

  function uniqueTagValues(categoryId) {
    const counts = {}
    for (const [, tags] of tagCache) {
      const leafIds = tags[categoryId]
      if (leafIds) {
        for (const leafId of leafIds) {
          counts[leafId] = (counts[leafId] || 0) + 1
        }
      }
    }
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
    let list = currentContentList.value

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(id => {
        const name = nameCache.get(id)
        return name ? name.toLowerCase().includes(q) : true
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

  // ── Shared data loading ──
  async function ensureLoaded({ useDiskCache = false } = {}) {
    if (_loaded.value) {
      initFilters()
      loading.value = false
      return
    }

    if (_loading.value) {
      await new Promise(resolve => {
        const stop = watch(_loaded, (v) => {
          if (v) { stop(); resolve() }
        })
      })
      initFilters()
      loading.value = false
      return
    }

    _loading.value = true
    loading.value = true

    try {
      const env = await Agent.environment()
      const userId = env.auth.user

      if (useDiskCache) {
        await seedFromDisk(userId)
      }

      const hierarchy = await loadTagHierarchy(partition, COMPETENCY_TAG)
      tagCategories.value = hierarchy.categories
      initFilters()

      const [pilaContent, myContentResult] = await Promise.all([
        Agent.query('taggings-for-tag', [partition, PILA_TAG], 'tags.knowlearning.systems').catch(() => []),
        Agent.query('taggings-for-tag', [userId, MY_CONTENT_TAG], 'tags.knowlearning.systems').catch(() => []),
      ])

      taggedContent.value = pilaContent
      for (const t of myContentResult) {
        if (!myContentIds.has(t.target)) {
          myContentIds.add(t.target)
          myContent.push(t.target)
        }
      }

      loading.value = false
      _loaded.value = true

      const allIds = [...new Set([...pilaContent.map(t => t.target), ...myContentResult.map(t => t.target)])]
      await prefetchBatch(allIds, store.getters.language(), partition, hierarchy.leafToCategory)

      if (useDiskCache) {
        persistToDisk(userId)
      }
    } catch (e) {
      console.warn('[useContentLibrary] load error:', e)
      loading.value = false
    } finally {
      _loading.value = false
    }
  }

  return {
    // Shared state
    taggedContent,
    myContent,
    myContentIds,
    tagCategories,

    // Instance state
    loading,
    searchQuery,
    activeShowTab,
    activeFilters,
    contentPage,
    contentPerPage,

    // Computeds
    showTabs,
    filterDefinitions,
    currentContentList,
    filteredContentList,
    paginatedContentList,

    // Methods
    getItemTagLabels,
    isMyContent,
    ensureLoaded,
  }
}
