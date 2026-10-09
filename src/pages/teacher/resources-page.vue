<template>
  <div class="page-container resources-page">
    <section class="content-card">
      <div class="resources-header">
        <h2 class="card-section-title flex items-center gap-2">
          <LucideIcon name="file-text" :size="18" class="text-primary-600" />
          <span>{{ t('resources') }}</span>
        </h2>
        <p class="card-section-subtitle">{{ t('resources-lead') }}</p>
      </div>

      <PUnifiedFilter v-model:search-query="query" :placeholder="t('search')">
        <PUnifiedFilterSection
          id="status"
          :label="t('required-status')"
          icon="badge-check"
          :options="statusOptions"
          :model-value="statusFilter"
          @update:model-value="statusFilter = $event"
        />
        <PUnifiedFilterSection
          v-for="section in tagSections"
          :key="section.id"
          :id="section.id"
          :label="section.label"
          icon="tag"
          searchable
          :options="section.options"
          :model-value="tagFilters[section.id] || []"
          @update:model-value="(values) => setTagFilter(section.id, values)"
        />
      </PUnifiedFilter>

      <div class="resources-table">
      <PTable
        :headers="headers"
        :items="filtered"
        item-key="id"
        :loading="loading"
        selectable
        :selected="selected"
        clickable-rows
        :items-per-page="10"
        :items-per-page-text="t('rows-per-page')"
        :no-data-text="loadError ? t('something-went-wrong') : t('no-results')"
        @update:selected="selected = $event"
        @click:row="onRow"
      >
        <template #item.name="{ item }">
          <div class="resource-name">
            <span class="resource-type-icon" :class="item.typeKind === 'video' ? 'is-video' : 'is-file'">
              <LucideIcon :name="item.typeKind === 'video' ? 'video' : 'file-text'" :size="16" />
            </span>
            <span>
              <strong>{{ item.name }}</strong>
              <small>{{ item.type }}</small>
            </span>
          </div>
        </template>
        <template #item.tags="{ item }">
          <div class="resource-tags">
            <span v-for="tag in item.tags.slice(0, 3)" :key="tag.id" class="resource-tag">{{ tag.label }}</span>
            <span v-if="item.tags.length > 3" class="resource-tag">+{{ item.tags.length - 3 }}</span>
          </div>
        </template>
        <template #item.status="{ item }">
          <span class="resource-status" :class="item.status">{{ item.status === 'required' ? t('required-resources') : t('suggested') }}</span>
        </template>
        <template #item.updated="{ item }">
          <span class="resource-updated">{{ formatUpdated(item.updated) }}</span>
        </template>
      </PTable>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { PTable, PUnifiedFilter, PUnifiedFilterSection } from '@/components/ui/index.js'
import {
  HOST_TO_PARTITION,
  MANDATORY_RESOURCES_TAG,
  OPTIONAL_RESOURCES_TAG,
  TEACHER_RESOURCE_TAGS,
} from '@/utils/constants.js'
import {
  getContentMetadata,
  getTagName,
  loadExploreCache,
  loadTagHierarchy,
  persistExploreCache,
} from '@/utils/content-cache.js'
import { localCache, beginRevalidation, endRevalidation } from '@/utils/local-cache.js'
import { exploreTaxonomy } from '@/utils/explore-taxonomy.js'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const resources = ref([])
const loading = ref(true)
const loadError = ref(false)
const query = ref('')
const statusFilter = ref([])
const tagFilters = ref({})
const selected = ref([])
const categoryNames = ref({})

const partition = HOST_TO_PARTITION[window.location.host]
const domain = 'tags.knowlearning.systems'
const STATUS_TAGS = new Set([MANDATORY_RESOURCES_TAG, OPTIONAL_RESOURCES_TAG, TEACHER_RESOURCE_TAGS])
const RESOURCES_CACHE_TTL = 60 * 60 * 1000
const resourcesMemory = new Map()

const headers = computed(() => [
  { key: 'name', title: t('name') },
  { key: 'tags', title: t('tags'), sortable: false },
  { key: 'status', title: t('required-status') },
  { key: 'updated', title: t('last-updated') },
])

const statusOptions = computed(() => [
  { value: 'required', label: t('required-resources') },
  { value: 'suggested', label: t('suggested') },
])

const tagSections = computed(() => {
  const groups = new Map()
  for (const resource of resources.value) {
    for (const tag of resource.tags) {
      if (!groups.has(tag.categoryId)) groups.set(tag.categoryId, new Map())
      groups.get(tag.categoryId).set(tag.id, tag.label)
    }
  }
  return [...groups.entries()].map(([id, tags]) => ({
    id,
    label: categoryNames.value[id] || t('tags'),
    options: [...tags.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
  }))
})

const filtered = computed(() => {
  const term = query.value.trim().toLowerCase()
  const activeTags = Object.entries(tagFilters.value).filter(([, values]) => values?.length)
  return resources.value.filter((resource) => {
    if (term && !resource.name.toLowerCase().includes(term)) return false
    if (statusFilter.value.length && !statusFilter.value.includes(resource.status)) return false
    return activeTags.every(([, values]) => resource.tags.some((tag) => values.includes(tag.id)))
  })
})

function setTagFilter(id, values) {
  tagFilters.value = { ...tagFilters.value, [id]: values }
}

function typeKind(activeType) {
  const type = String(activeType || '').toLowerCase()
  if (type.includes('pdf')) return 'pdf'
  if (type.startsWith('video/') || type.includes('video')) return 'video'
  if (type.startsWith('image/')) return 'image'
  return 'file'
}

function typeLabel(activeType) {
  const kind = typeKind(activeType)
  if (kind === 'pdf') return 'PDF'
  if (kind === 'video') return t('file-type-video')
  if (kind === 'image') return t('file-type-image')
  return t('file-type-file')
}

function formatUpdated(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const lang = store.state.language || 'en'
  return new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function onRow(_event, { item }) {
  Agent.download(item.id).direct()
}

function cacheKey() {
  return `v2:${partition || ''}:${store.state.language || 'en'}`
}

function rememberResources(rows) {
  const key = cacheKey()
  resourcesMemory.set(key, rows)
  resources.value = rows
  const userId = store.state.user
  if (!userId) return
  localCache.set(userId, 'content', 'resources', { key, rows })
  persistExploreCache(userId, {})
}

let loadGeneration = 0

async function loadResources() {
  const generation = ++loadGeneration
  const key = cacheKey()
  let showedCache = false
  if (resourcesMemory.has(key)) {
    resources.value = resourcesMemory.get(key)
    showedCache = true
  } else if (store.state.user) {
    await loadExploreCache(store.state.user).catch(() => null)
    if (generation !== loadGeneration) return
    const disk = await localCache.get(store.state.user, 'content', 'resources', RESOURCES_CACHE_TTL)
    if (generation !== loadGeneration) return
    if (disk?.key === key && Array.isArray(disk.rows)) {
      resourcesMemory.set(key, disk.rows)
      resources.value = disk.rows
      showedCache = true
    }
  }
  if (generation !== loadGeneration) return
  if (showedCache) {
    loading.value = false
    beginRevalidation()
  } else {
    loading.value = true
  }
  try {
    if (!partition) {
      loadError.value = false
      rememberResources([])
      return
    }
    const lang = store.state.language || 'en'
    const taxonomy = exploreTaxonomy(store.getters.tagPartition)
    const hierarchy = await loadTagHierarchy(taxonomy.partition, taxonomy.roots, lang).catch(() => null)
    if (generation !== loadGeneration) return
    let requiredRows
    let suggestedRows
    try {
      ;[requiredRows, suggestedRows] = await Promise.all([
        Agent.query('taggings-intersection', [partition, [MANDATORY_RESOURCES_TAG]], domain),
        Agent.query('taggings-intersection', [partition, [OPTIONAL_RESOURCES_TAG]], domain),
      ])
    } catch {
      if (generation !== loadGeneration) return
      loadError.value = true
      // Rows from another language are stale; show the error instead of them.
      if (!showedCache) resources.value = []
      return
    }
    if (generation !== loadGeneration) return
    const requiredIds = new Set(requiredRows.map((row) => row.target))
    const suggestedIds = new Set(suggestedRows.map((row) => row.target))
    const ids = [...new Set([...requiredIds, ...suggestedIds])]
    const names = {}
    await Promise.all([...new Set(
      [...(hierarchy?.leafToCategory?.values() || [])],
    )].map(async (categoryId) => {
      names[categoryId] = await getTagName(categoryId, lang).catch(() => '')
    }))
    if (generation !== loadGeneration) return
    categoryNames.value = names
    const rows = await Promise.all(ids.map(async (id) => {
      const [meta, taggings] = await Promise.all([
        getContentMetadata(id).catch(() => null),
        Agent.query('taggings-for-target', [partition, id], domain).catch(() => []),
      ])
      const tags = []
      const seen = new Set()
      for (const row of taggings) {
        const tagId = row.tag
        if (!tagId || STATUS_TAGS.has(tagId) || seen.has(tagId)) continue
        seen.add(tagId)
        const label = await getTagName(tagId, lang).catch(() => '')
        if (!label) continue
        tags.push({
          id: tagId,
          label,
          categoryId: hierarchy?.leafToCategory?.get(tagId) || 'tags',
        })
      }
      const kind = typeKind(meta?.active_type)
      return {
        id,
        name: meta?.name || id,
        type: typeLabel(meta?.active_type),
        typeKind: kind,
        updated: meta?.updated || meta?.created || null,
        status: requiredIds.has(id) ? 'required' : 'suggested',
        tags,
      }
    }))
    if (generation !== loadGeneration) return
    loadError.value = false
    rememberResources(rows)
  } finally {
    if (showedCache) endRevalidation()
    if (generation === loadGeneration) loading.value = false
  }
}

onMounted(loadResources)
watch(() => store.state.language, loadResources)
</script>

<style scoped>
.resources-header {
  margin-bottom: 16px;
}

.resources-table {
  margin-top: 16px;
}

.resource-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 220px;
}

.resource-name strong,
.resource-name small {
  display: block;
}

.resource-name strong {
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  color: #334155;
}

.resource-name small,
.resource-updated {
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  color: #64748b;
}

.resource-type-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
}

.resource-type-icon.is-file {
  background: #fef2f2;
  color: #ef4444;
}

.resource-type-icon.is-video {
  background: #dbeafe;
  color: #2563eb;
}

.resource-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.resource-tag {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}

.resource-status {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: #fff;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}

.resource-status.required {
  border-color: #fecaca;
  color: #dc2626;
}

.resource-status.suggested {
  border-color: #fde68a;
  color: #ca8a04;
}
</style>
