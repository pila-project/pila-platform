<template>
  <div class="page-container academy-library">
    <section class="content-card" aria-labelledby="academy-library-title">
      <div class="academy-card-header">
        <div class="academy-card-title-row">
          <div>
            <h2 id="academy-library-title" class="card-section-title flex items-center gap-2">
              <LucideIcon name="library" :size="18" class="text-primary-600" />
              <span>{{ copy('moduleLibrary') }}</span>
            </h2>
            <p class="card-section-subtitle">{{ copy('libraryLead') }}</p>
          </div>
        </div>
      </div>

      <PUnifiedFilter
        v-model:search-query="query"
        :placeholder="copy('searchModule')"
      >
        <PUnifiedFilterSection
          v-for="section in filterSections"
          :key="section.id"
          :id="section.id"
          :label="section.label"
          icon="tag"
          searchable
          :options="section.options"
          :model-value="filters[section.id] || []"
          @update:model-value="(values) => setFilter(section.id, values)"
        />
      </PUnifiedFilter>

      <p class="academy-count">{{ countLabel }}</p>
      <p v-if="loading" class="academy-muted">{{ copy('loading') }}</p>
      <p v-else-if="error" class="academy-error">{{ error }}</p>
      <p v-else-if="!cards.length" class="academy-muted">{{ query || hasFilters ? copy('emptySearch') : copy('emptyLibrary') }}</p>
      <template v-else>
        <div ref="gridRef" class="academy-grid">
          <AcademyCard
            v-for="card in pagedCards"
            :key="card.id"
            :title="card.name"
            :description="card.description"
            :cover="card.cover"
            :chips="chipLabels(card)"
            :duration-label="card.durationMinutes != null ? copy('minutes', { n: card.durationMinutes }) : ''"
            :is-new="card.isNew"
            :required="card.required"
            :series="false"
            :completed="card.status === 'completed'"
            :show-progress="!card.isNew"
            :reserve-progress="card.isNew"
            :percent="Math.round((card.progress || 0) * 100)"
            :action-label="actionFor(card).label"
            :action-icon="actionFor(card).icon"
            :labels="cardLabels"
            @open="router.push(actionFor(card).to)"
          />
        </div>
        <PPagination
          :total-items="cards.length"
          :current-page="page"
          :per-page="perPage"
          :per-page-options="perPageOptions"
          :per-page-label="t('rows-per-page')"
          @update:current-page="setPage"
          @update:per-page="setPerPage"
        />
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { PPagination, PUnifiedFilter, PUnifiedFilterSection } from '@/components/ui/index.js'
import { gridPerPageOptions, isAllPerPage } from '@/utils/pagination-options.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { exploreTaxonomy } from '@/utils/explore-taxonomy.js'
import { getCachedTagName, getContentTags, getTagName, loadTagHierarchy } from '@/utils/content-cache.js'
import { getHardcodedTagTranslation } from '@/utils/tag-name-translations.js'
import { joinAcademyCatalog } from '@/utils/teacher-academy.js'
import { loadAcademyDocument, loadCatalogIds, loadSnapshot } from '@/utils/teacher-academy-io.js'
import { fixtureCatalogRecords, isAcademyFixture, mergeFixtureSnapshot, readFixtureSnapshot } from './fixtures.js'
import AcademyCard from './AcademyCard.vue'
import { reloadWhenShown, useAcademyPage } from './useAcademyPage.js'

const { store, router, lang, copy } = useAcademyPage()

const query = ref('')
const filters = ref({})
const records = ref([])
const snapshot = ref({ schemaVersion: 1, modules: {}, series: {} })
const loading = ref(true)
const error = ref('')
const page = ref(1)
const perPage = ref(12)
const gridRef = ref(null)

function t(slug) { return store.getters.t(slug) }

const perPageOptions = computed(() => gridPerPageOptions(t))

const cards = computed(() => joinAcademyCatalog({
  records: records.value,
  filters: filters.value,
  query: query.value,
  snapshot: snapshot.value,
  lang: lang.value,
}))

const pagedCards = computed(() => {
  if (isAllPerPage(perPage.value)) return cards.value
  const start = (page.value - 1) * perPage.value
  return cards.value.slice(start, start + perPage.value)
})

watch([query, filters], () => {
  page.value = 1
})

watch(cards, (list) => {
  const size = isAllPerPage(perPage.value) ? (list.length || 1) : perPage.value
  const pages = Math.max(1, Math.ceil(list.length / size))
  if (page.value > pages) page.value = pages
})

function setPage(next) {
  page.value = next
  nextTick(() => gridRef.value?.scrollIntoView({ block: 'nearest' }))
}

function setPerPage(next) {
  perPage.value = next
  page.value = 1
}

const filterSections = computed(() => {
  const map = new Map()
  for (const record of records.value) {
    for (const tag of record.tags || []) {
      if (!tag.categoryId || !tag.tagId) continue
      if (!map.has(tag.categoryId)) {
        map.set(tag.categoryId, {
          id: tag.categoryId,
          label: tag.categoryLabel || tag.categoryId,
          options: new Map(),
        })
      }
      const section = map.get(tag.categoryId)
      if (tag.categoryLabel) section.label = tag.categoryLabel
      if (!section.options.has(tag.tagId)) {
        section.options.set(tag.tagId, { value: tag.tagId, label: tag.label || tag.tagId })
      }
    }
  }
  return [...map.values()].map((section) => ({
    id: section.id,
    label: section.label,
    options: [...section.options.values()],
  }))
})

const hasFilters = computed(() => Object.values(filters.value).some((list) => list?.length))
const countLabel = computed(() => copy(cards.value.length === 1 ? 'moduleFound' : 'modulesFound', { n: cards.value.length }))
const cardLabels = computed(() => ({
  new: copy('new'),
  required: copy('required'),
  series: copy('series'),
  completed: copy('completed'),
  progress: copy('progress'),
}))

function setFilter(categoryId, values) {
  filters.value = { ...filters.value, [categoryId]: values }
}

function chipLabels(card) {
  return (card.tags || [])
    .filter((tag) => !tag.required)
    .slice(0, 3)
    .map((tag) => tag.label)
    .filter(Boolean)
}

function actionFor(card) {
  if (card.status === 'completed') {
    return { label: copy('review'), icon: 'lucide:eye', to: `/teacher/academy/module/${card.id}/review` }
  }
  if (!card.isNew) {
    return { label: copy('resume'), icon: 'lucide:play', to: `/teacher/academy/module/${card.id}` }
  }
  return { label: copy('start'), icon: 'lucide:play', to: `/teacher/academy/module/${card.id}` }
}

async function requiredTag(tagId) {
  const hardcoded = getHardcodedTagTranslation(tagId, 'en') || ''
  if (hardcoded.trim().toLowerCase() === 'required') return true
  const name = await getTagName(tagId, 'en').catch(() => '')
  return String(name || '').trim().toLowerCase() === 'required'
}

function withSamples(realRecords, realSnapshot) {
  const samples = fixtureCatalogRecords().filter((sample) => !realRecords.some((record) => record.id === sample.id))
  records.value = [...samples, ...realRecords]
  snapshot.value = mergeFixtureSnapshot(realSnapshot)
}

async function load() {
  loading.value = true
  error.value = ''
  let realRecords = []
  let realSnapshot = readFixtureSnapshot()
  try {
    const hostPartition = store.getters.tagPartition
    const taxonomy = exploreTaxonomy(hostPartition)
    const hierarchy = await loadTagHierarchy(taxonomy.partition, taxonomy.roots, lang.value).catch(() => null)
    const ids = await loadCatalogIds(store, hostPartition)
    realSnapshot = await loadSnapshot(store)
    for (const id of ids) {
      if (isAcademyFixture(id)) continue
      const record = await loadAcademyDocument(store, id).catch(() => null)
      if (!record || record.kind !== 'module') continue
      const grouped = hierarchy
        ? await getContentTags(id, taxonomy.partition, hierarchy.leafToCategory).catch(() => ({}))
        : {}
      const tags = []
      for (const [categoryId, tagIds] of Object.entries(grouped || {})) {
        for (const tagId of tagIds || []) {
          const label = getHardcodedTagTranslation(tagId, lang.value) || await getTagName(tagId, lang.value).catch(() => '')
          tags.push({
            categoryId,
            categoryLabel: getCachedTagName(categoryId, lang.value) || getCachedTagName(categoryId, 'en') || '',
            tagId,
            label: label || '',
            required: await requiredTag(tagId),
          })
        }
      }
      realRecords.push({ ...record, tags })
    }
  } catch (err) {
    if (err?.code === 'forbidden') {
      router.replace('/')
      return
    }
    error.value = copy('playFailed')
  } finally {
    withSamples(realRecords, realSnapshot)
    loading.value = false
  }
}

reloadWhenShown(load)
</script>

<style src="./academy.css"></style>
