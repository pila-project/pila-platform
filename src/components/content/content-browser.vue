<template>
  <div class="content-browser">
    <!-- Search + filters -->
    <div class="cb-toolbar">
      <PUnifiedFilter
        v-model:searchQuery="searchQuery"
        :placeholder="placeholder || t('search-content-title')"
        class="flex-1"
      >
        <PUnifiedFilterSection
          v-for="f in filterDefinitions"
          :key="f.key"
          :id="f.key"
          :label="f.label"
          :options="f.options"
          v-model="activeFilters[f.key]"
          searchable
        />
      </PUnifiedFilter>

      <div class="cb-tabs-group">
        <span class="cb-tabs-label">{{ t('show') }}:</span>
        <PTabs v-model="activeShowTab" :tabs="showTabs" />
      </div>
    </div>

    <slot name="above-grid" :filtered-list="displayList" />

    <!-- Loading (only when we have nothing to show yet — avoids empty → loader flash) -->
    <div v-if="showGridLoading" class="cb-loading">
      <LucideIcon name="loader-2" :size="14" :spin="true" class="inline mr-1" />{{ t('loading') }}...
    </div>

    <!-- Empty -->
    <slot v-else-if="!displayList.length" name="empty">
      <NoResultsFound />
    </slot>

    <!-- Grid -->
    <div v-else class="cb-grid" :style="{ gridTemplateColumns: 'repeat(' + columns + ', 1fr)' }">
      <div v-for="id in paginatedDisplayList" :key="id">
        <slot
          name="card"
          :id="id"
          :source="isMyContent(id) ? 'mine' : 'pila'"
          :grades="getItemTagLabels(id)"
        >
          <TaggedContentCard
            :id="id"
            :source="isMyContent(id) ? 'mine' : 'pila'"
            :grades="getItemTagLabels(id)"
          />
        </slot>
      </div>
    </div>

    <!-- Pagination -->
    <PPagination
      v-if="showPagination"
      :totalItems="displayList.length"
      :currentPage="contentPage"
      :perPage="contentPerPage"
      :perPageOptions="perPageOptionsForPagination"
      :perPageLabel="t('rows-per-page')"
      @update:currentPage="contentPage = $event"
      @update:perPage="contentPerPage = $event; contentPage = 1"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useContentLibrary } from '@/utils/useContentLibrary.js'
import { prefetchBatch, getCachedTagHierarchy } from '@/utils/content-cache.js'
import TaggedContentCard from '@/components/tags/tagged-content-card.vue'
import NoResultsFound from '@/components/common/no-results-found.vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { PUnifiedFilter, PUnifiedFilterSection, PTabs, PPagination } from '@/components/ui/index.js'
import {
  ALL_PER_PAGE,
  isAllPerPage,
  normalizePerPageOptions,
} from '@/utils/pagination-options.js'

const props = defineProps({
  columns: { type: Number, default: 3 },
  perPage: { type: Number, default: 12 },
  perPageOptions: { type: Array, default: () => [12, 24, 48] },
  placeholder: { type: String, default: '' },
  extraFilter: { type: Function, default: null },
  useDiskCache: { type: Boolean, default: true },
})

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const {
  loading,
  searchQuery,
  activeShowTab,
  activeFilters,
  contentPage,
  contentPerPage,
  showTabs,
  filterDefinitions,
  filteredContentList,
  myContent,
  myContentIds,
  getItemTagLabels,
  isMyContent,
  ensureLoaded,
} = useContentLibrary(store)

contentPerPage.value = props.perPage

const displayList = computed(() => {
  if (props.extraFilter) return props.extraFilter(filteredContentList.value)
  return filteredContentList.value
})

/** Spinner while fetching; keep showing cached grid during background revalidate. */
const showGridLoading = computed(() => loading.value && !displayList.value.length)

const perPageOptionsForPagination = computed(() => {
  const opts = props.perPageOptions?.length ? props.perPageOptions : [12, 24, 48]
  const normalized = normalizePerPageOptions(opts, t)
  if (!normalized.some((opt) => opt.value === ALL_PER_PAGE)) {
    normalized.push({ value: ALL_PER_PAGE, title: t('all') || 'All' })
  }
  return normalized
})

const showPagination = computed(() => (
  perPageOptionsForPagination.value.length > 0 && displayList.value.length > 0
))

const paginatedDisplayList = computed(() => {
  if (isAllPerPage(contentPerPage.value)) return displayList.value
  const start = (contentPage.value - 1) * contentPerPage.value
  return displayList.value.slice(start, start + contentPerPage.value)
})

watch(paginatedDisplayList, (ids) => {
  if (!ids.length || !props.useDiskCache) return
  prefetchBatch(
    ids,
    store.getters.language(),
    store.getters.tagPartition,
    getCachedTagHierarchy()?.leafToCategory,
    { priorityIds: ids },
  ).catch(() => {})
}, { immediate: true })

onMounted(() => ensureLoaded({ useDiskCache: props.useDiskCache }))

defineExpose({
  filteredContentList,
  displayList,
  myContent,
  myContentIds,
  loading,
  getItemTagLabels,
  isMyContent,
})
</script>

<style scoped>
.cb-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.cb-toolbar :deep(.unified-filter) {
  flex: 1;
  min-width: 0;
}

.cb-tabs-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.cb-tabs-label {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  white-space: nowrap;
}

.cb-loading {
  padding: 32px 0;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}

.cb-grid {
  display: grid;
  gap: 16px;
}

@media (max-width: 767px) {
  .cb-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
