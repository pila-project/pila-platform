<template>
  <div
    ref="explorePageRef"
    class="page-container explore-page"
    :class="{ 'explore-page--sequences-expanded': sequencesExpanded }"
  >
    <h1 class="page-heading explore-heading capitalize">{{ t('explore') }}</h1>

    <!-- Mobile: inline sequence section -->
    <div class="mobile-sequences">
      <PButton
        variant="primary"
        icon="lucide:plus"
        :text="t('new-sequence')"
        class="w-full"
        @click="showCreateSequence = true"
      />
      <div class="mobile-seq-section">
        <div class="sequences-card-header-row">
          <h2 class="sequences-heading text-sm font-semibold text-zinc-950">
            {{ t('my-sequences') }}<span v-if="!sequencesPanelLoading"> ({{ activeSequenceCount }})</span>
          </h2>
          <PButton
            variant="ghost"
            size="sm"
            :icon="sequencesExpanded ? 'lucide:x' : 'lucide:maximize-2'"
            iconOnly
            :title="sequencesExpanded ? t('close') : t('my-sequences')"
            :aria-label="sequencesExpanded ? t('close') : t('my-sequences')"
            @click="toggleSequencesExpanded"
          />
        </div>
        <p class="text-xs text-slate-500 mt-0.5">{{ t('organize-content-into-learning-sequences') }}</p>
        <PUnifiedFilter
          v-if="isTeacherExplore"
          v-model:searchQuery="sequenceSearchQuery"
          class="mt-2 sequences-filter"
          compact
          :placeholder="t('search-sequences')"
        >
          <PUnifiedFilterSection
            id="sequence-status-mobile"
            :label="t('show-archived')"
            icon="badge-check"
            :options="sequenceStatusFilterOptions"
            v-model="sequenceStatusFilters"
          />
          <PUnifiedFilterSection
            id="sequence-favorites-mobile"
            :label="t('favourites')"
            icon="heart"
            :options="favoritesFilterOptions"
            v-model="sequenceFavoritesFilters"
          />
        </PUnifiedFilter>
        <PInput
          v-else
          v-model="sequenceSearchQuery"
          class="mt-2"
          :placeholder="t('search-sequences')"
          icon="lucide:search"
        />
        <button class="mobile-seq-selector" @click="mobileSeqExpanded = !mobileSeqExpanded">
          <span class="mobile-seq-selector-name">
            {{ t('my-sequences') }}
          </span>
          <LucideIcon :name="mobileSeqExpanded ? 'chevron-up' : 'chevron-down'" :size="12" class="text-slate-400" />
        </button>
        <div v-if="mobileSeqExpanded" class="mobile-seq-list">
          <div v-if="sequencesPanelLoading" class="sequences-loading" aria-busy="true">
            <LucideIcon name="loader-2" :size="14" :spin="true" />
            {{ t('loading') }}
          </div>
          <template v-else>
            <SequenceCard
              v-for="seqId in displayedSequenceIds"
              :key="seqId"
              :id="seqId"
              :archived="archivedSequenceIds.includes(seqId)"
              :favorited="favorites.has(seqId)"
              :isNewest="newestSequenceId === seqId"
              :version="sequenceVersion"
              @toggle-favorite="toggleFavorite(seqId)"
              @edit="editSequence(seqId)"
              @archive="sequenceToArchive = seqId"
              @restore="onRestoreSequence(seqId)"
              @preview="sequenceToPreview = seqId"
              @view-content="openSequenceContent(seqId)"
              @items-changed="sequenceVersion++"
              @drop-item="payload => onDropItemToSequence(seqId, payload)"
            />
            <div v-if="!displayedSequenceIds.length && !sequencesPanelLoading" class="text-xs text-slate-400 text-center py-4">
              {{ sequenceEmptyMessage }}
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="explore-columns" :class="{ 'explore-columns--sequences-expanded': sequencesExpanded }">
      <!-- Left panel: My sequences (desktop) -->
      <aside class="sequences-panel">
        <div class="sequences-card">
          <div class="sequences-card-header">
            <div class="sequences-card-header-row">
              <h2 class="sequences-heading text-base font-semibold text-zinc-950">
                {{ t('my-sequences') }}<span v-if="!sequencesPanelLoading"> ({{ activeSequenceCount }})</span>
              </h2>
              <PButton
                variant="ghost"
                size="sm"
                :icon="sequencesExpanded ? 'lucide:x' : 'lucide:maximize-2'"
                iconOnly
                :title="sequencesExpanded ? t('close') : t('my-sequences')"
                :aria-label="sequencesExpanded ? t('close') : t('my-sequences')"
                @click="toggleSequencesExpanded"
              />
            </div>
            <p class="text-sm text-slate-500 mt-1">{{ t('organize-content-into-learning-sequences') }}</p>
            <PUnifiedFilter
              v-if="isTeacherExplore"
              v-model:searchQuery="sequenceSearchQuery"
              class="mt-3 sequences-filter"
              compact
              :placeholder="t('search-sequences')"
            >
              <PUnifiedFilterSection
                id="sequence-status"
                :label="t('show-archived')"
                icon="badge-check"
                :options="sequenceStatusFilterOptions"
                v-model="sequenceStatusFilters"
              />
              <PUnifiedFilterSection
                id="sequence-favorites"
                :label="t('favourites')"
                icon="heart"
                :options="favoritesFilterOptions"
                v-model="sequenceFavoritesFilters"
              />
            </PUnifiedFilter>
            <PInput
              v-else
              v-model="sequenceSearchQuery"
              class="mt-3"
              :placeholder="t('search-sequences')"
              icon="lucide:search"
            />
            <PButton
              variant="primary"
              icon="lucide:plus"
              :text="t('new-sequence')"
              class="mt-3 w-full"
              @click="showCreateSequence = true"
            />
          </div>

          <div class="sequences-list-scroll">
            <div v-if="sequencesPanelLoading" class="sequences-loading" aria-busy="true">
              <LucideIcon name="loader-2" :size="14" :spin="true" />
              {{ t('loading') }}
            </div>
            <div v-else class="sequences-list" :class="{ 'sequences-list--split': sequencesListSplit }">
              <SequenceCard
                v-for="seqId in displayedSequenceIds"
                :key="seqId"
                :id="seqId"
                :archived="archivedSequenceIds.includes(seqId)"
                :favorited="favorites.has(seqId)"
                :isNewest="newestSequenceId === seqId"
                :version="sequenceVersion"
                @toggle-favorite="toggleFavorite(seqId)"
                @edit="editSequence(seqId)"
                @archive="sequenceToArchive = seqId"
                @restore="onRestoreSequence(seqId)"
                @preview="sequenceToPreview = seqId"
                @view-content="openSequenceContent(seqId)"
                @items-changed="sequenceVersion++"
                @drop-item="payload => onDropItemToSequence(seqId, payload)"
              />
              <div v-if="!displayedSequenceIds.length" class="text-xs text-slate-400 text-center py-6">
                {{ sequenceEmptyMessage }}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Right panel: Content library -->
      <div class="content-card content-library-card">
        <!-- Section header -->
        <div class="content-lib-header">
          <div class="content-lib-header-row">
            <div>
              <h2 class="text-base font-semibold text-zinc-950 flex items-center gap-2">
                <LucideIcon name="clipboard-list" :size="16" class="text-primary-600" />
                {{ t('explore-content-library') }}
              </h2>
              <p class="text-xs text-slate-500 mt-1">{{ t('discover-customise-and-add-content-to-your-assignments') }}</p>
            </div>
            <PButton
              v-if="selectedItems.size"
              variant="secondary"
              icon="lucide:plus"
              :text="t('add-selected') + ' (' + selectedItems.size + ')'"
              @click="addSelectedToSequence"
            />
          </div>
        </div>

        <!-- Content browser (shared component) -->
        <ContentBrowser
          ref="browserRef"
          fill-height
          :columns="exploreGridColumns"
          :per-page="12"
          :per-page-options="exploreGridPerPageOptions"
          :extra-filter="contentExploreFilter"
          :favorites-filters="contentFavoritesFilters"
          :content-type-filters="contentTypeFilters"
          use-disk-cache
        >
          <template #filter-sections>
            <PUnifiedFilterSection
              id="content-type"
              :label="t('content-type')"
              icon="layers"
              :options="contentTypeFilterOptions"
              v-model="contentTypeFilters"
            />
            <PUnifiedFilterSection
              id="content-favorites"
              :label="t('favourites')"
              icon="heart"
              :options="favoritesFilterOptions"
              v-model="contentFavoritesFilters"
            />
          </template>

          <template #empty>
            <p class="content-favorites-empty text-sm text-slate-500 text-center py-8">
              {{ contentEmptyMessage }}
            </p>
          </template>

          <!-- Selection toolbar -->
          <template #above-grid>
            <div v-if="selectedItems.size" class="selection-toolbar">
              <PCheckbox
                :modelValue="allSelected"
                @update:modelValue="toggleSelectAll"
              />
              <span class="selection-count">{{ selectedItems.size }} {{ t('items-selected') }}</span>
              <div style="flex:1" />
              <PButton variant="ghost" size="sm" :text="t('deselect-all')" @click="deselectAll" />
            </div>

          </template>

          <!-- Custom card rendering with explore-page features -->
          <template #card="{ id, source, grades }">
            <TaggedContentCard
              :id="id"
              :checked="selectedItems.has(id)"
              :removable="myContent.includes(id)"
              :source="source"
              :grades="grades"
              :favorited="favorites.has(id)"
              :show-tagging-icon="showTaggingIcons && selectedItems.size <= 1"
              show-copy-modify
              @info="infoModalId = id"
              @toggle-select="toggleSelection(id)"
              @toggle-favorite="toggleFavorite(id)"
              @preview="handleExplorePreview(id)"
              @tag="taggingContentId = id"
              @remove="() => {
                setTagging({ tag: MY_CONTENT_TAG, target: id, value: null })
                myContent.splice(myContent.indexOf(id), 1)
              }"
              @add="handleAddItem(id)"
              @copy-modify="handleCopyModify(id)"
              @edit="handleExploreEdit(id)"
            />
          </template>
        </ContentBrowser>


        <PreviewModal
          v-if="previewing"
          :id="previewing"
          width="90vw"
          height="90vh"
          @close="previewing = null"
        />
        <TaggingModal
          v-if="taggingContentId && showTaggingIcons && selectedItems.size <= 1"
          :id="taggingContentId"
          :roots="taxonomy.roots"
          @close="taggingContentId = null"
        />
      </div>
    </div>

    <!-- Mobile bottom action bar -->
    <div v-if="selectedItems.size" class="mobile-bottom-bar">
      <PButton
        variant="primary"
        class="w-full"
        icon="lucide:plus"
        :text="t('add-selected') + ' (' + selectedItems.size + ')'"
        @click="addSelectedToSequence"
      />
    </div>

    <!-- Content info modal (Q6) -->
    <PModal
      v-if="infoModalId"
      layer="nested"
      width="480px"
      no-pad-body
      @close="infoModalId = null"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('content-info') }}</h2>
          <p class="text-xs text-slate-500 mt-0.5 truncate">
            <NameOrTranslatedNameFromItemId :item-id="infoModalId" />
          </p>
        </div>
      </template>
      <template #body>
        <ContentMetadataPanel
          :key="infoModalId"
          :id="infoModalId"
          :partition="taxonomy.partition"
          embedded
        />
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('close')" @click="infoModalId = null" />
      </template>
    </PModal>

    <!-- Create/Edit Sequence Modal -->
    <CreateSequenceModal
      v-if="showCreateSequence || sequenceToEdit"
      :id="sequenceToEdit"
      :initial-item-ids="createSequenceInitialItemIds"
      @close="closeCreateSequenceModal"
      @created="onSequenceCreated"
      @updated="onSequenceUpdated"
    />

    <!-- Archive confirmation -->
    <PAlertDialog
      v-if="sequenceToArchive"
      variant="warning"
      width="520px"
      :title="t('archive-sequence')"
      :description="archiveConfirmDescription"
      :confirm-text="t('archive')"
      :cancel-text="t('cancel')"
      :confirm-loading="archiveConfirmLoading"
      @confirm="confirmArchiveSequence"
      @cancel="sequenceToArchive = null"
    />

    <!-- Success (Figma Explore: 520px, green icon circle, title + body, single Done) -->
    <PAlertDialog
      v-if="successDialog.show"
      variant="success"
      width="520px"
      :title="successDialog.message"
      :description="successDialog.subtitle"
      :confirm-text="t('done')"
      cancel-text=""
      @confirm="dismissSuccessDialog"
      @cancel="dismissSuccessDialog"
    />

    <!-- Sequence Preview Modal -->
    <SequencePreviewModal
      v-if="sequenceToPreview"
      :id="sequenceToPreview"
      @close="sequenceToPreview = null"
    />

    <!-- Sequence content workspace (view / reorder / delete / preview items) -->
    <SequenceContentModal
      v-if="sequenceToView"
      :id="sequenceToView"
      :archived="archivedSequenceIds.includes(sequenceToView)"
      :version="sequenceVersion"
      @close="sequenceToView = null"
      @changed="sequenceVersion++"
    />

    <!-- Copy & Modify Modal -->
    <CopyModifyModal
      v-if="copyModifyId"
      :id="copyModifyId"
      @close="copyModifyId = null"
      @created="onCopyModifyCreated"
    />

    <!-- Create Assignment Modal -->
    <CreateEditAssignmentModal
      v-if="createAssignmentId"
      :id="createAssignmentId"
      teacher
      :initial-content-ids="createAssignmentContentIds"
      @close="createAssignmentId = null; createAssignmentContentIds = []"
      @saved="onExploreAssignmentSaved"
    />

    <!-- View assignment details (from Explore “Go to assignment”) -->
    <ViewAssignmentDetailsModal
      v-if="viewAssignmentDetailsId"
      :id="viewAssignmentDetailsId"
      @close="viewAssignmentDetailsId = null"
      @edit="openEditFromAssignmentDetails"
    />

    <!-- Edit assignment (from details modal or elsewhere) -->
    <CreateEditAssignmentModal
      v-if="editAssignmentId"
      :id="editAssignmentId"
      teacher
      editing
      @close="editAssignmentId = null"
      @saved="editAssignmentId = null"
    />

    <ExploreAddPickerModal
      v-if="showAddPicker"
      :item-ids="pendingAddItems"
      :sequence-ids="pickerSequenceIds"
      :saving-assignment-id="assignmentSavingId"
      :assignment-result="assignmentAddResult"
      @close="closeAddPicker"
      @create-assignment="navigateToCreateAssignment"
      @create-sequence="navigateToCreateSequence"
      @confirm-sequence="id => addItemsToSequence(id, pendingAddItems)"
      @confirm-assignment="id => addItemsToAssignment(id, pendingAddItems)"
      @go-to-assignment="goToAssignmentFromPicker"
    />
  </div>
</template>

<script setup>
  import { ref, reactive, shallowRef, shallowReactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
  import { createDragAutoScroll } from '@/utils/drag-auto-scroll.js'
  import { useStore } from 'vuex'
  import { useRoute } from 'vue-router'
  import ContentMetadataPanel from './content-metadata-panel.vue'
  import TaggedContentCard from '@/components/tags/tagged-content-card.vue'
  import ContentBrowser from './content-browser.vue'
  import PreviewModal from '@/components/common/preview-modal.vue'
  import SequenceCard from './sequence-card.vue'
  import CreateSequenceModal from './create-sequence-modal.vue'
  import SequencePreviewModal from './sequence-preview-modal.vue'
  import SequenceContentModal from './sequence-content-modal.vue'
  import ExploreAddPickerModal from './explore-add-picker-modal.vue'
  import NameOrTranslatedNameFromItemId from './name-or-translated-name-from-item-id.vue'
  import CopyModifyModal from './copy-modify-modal.vue'
  import { v4 as uuid } from 'uuid'
  import CreateEditAssignmentModal from '@/pages/assignments/from-me/create-edit-assignment-modal.vue'
  import ViewAssignmentDetailsModal from '@/pages/assignments/from-me/view-assignment-details-modal.vue'
  import LucideIcon from '@/components/ui/LucideIcon.vue'
  import setTagging from '@/utils/set-tagging.js'
  import { MY_CONTENT_TAG } from '@/utils/constants.js'
  import { exploreTaxonomy } from '@/utils/explore-taxonomy.js'
  import TaggingModal from '@/components/tagging-modal.vue'
  import {
    nameCacheVersion, getCachedContentName, setCachedLegacyName, metadataCache, invalidate,
    getCachedTagHierarchy, prefetchBatch, invalidateNames,
    getContentMetadata, getContentType, getCachedPreviewMeta, patchPreviewMeta,
    setCachedContentName, loadExploreCache, persistSequencesPanelCache,
  } from '@/utils/content-cache.js'
  import { useContentLibrary, notifyTagIndexUpdated, registerMyContentItem } from '@/utils/useContentLibrary.js'
  import { openContentPreview } from '@/utils/open-content-preview.js'
  import {
    appendItemsToSequence,
    isValidSequenceAgentState,
    partitionSequenceMemberIds,
    SEQUENCE_DRAG_MIME,
    isSequenceActiveType,
  } from '@/utils/sequence-items.js'
  import { normalizeAssignmentContent } from '@/utils/assignment-content.js'
  import {
    loadExploreArchivedSequenceIds,
    setExploreSequenceArchived,
  } from '@/utils/explore-sequence-archive.js'
  import { loadExploreFavorites, toggleExploreFavorite } from '@/utils/explore-favorites.js'
  import { PButton, PCheckbox, PAlertDialog, PModal, PInput, PUnifiedFilter, PUnifiedFilterSection } from '@/components/ui/index.js'
  import { useFeedback } from '@/composables/useFeedback.js'
  import {
    defaultActiveStatusFilters,
    buildStatusFilterOptions,
    matchesStatusFilter,
  } from '@/utils/status-filter.js'
  import {
    defaultFavoritesFilters,
    buildFavoritesFilterOptions,
    isFavoritesFilterActive,
    matchesFavoritesFilter,
  } from '@/utils/explore-favorites-filter.js'
  import {
    defaultContentTypeFilters,
    buildContentTypeFilterOptions,
    isSequencesOnlyFilterActive,
    matchesContentTypeFilter,
  } from '@/utils/explore-content-type-filter.js'
  import { gridPerPageOptions } from '@/utils/pagination-options.js'

  const store = useStore()
  const route = useRoute()
  function t(slug) { return store.getters.t(slug) }

  const isTeacherExplore = computed(() => route.path.startsWith('/teacher'))
  const sequencesExpanded = ref(false)
  const sequencesListSplit = ref(false)
  const exploreGridColumns = ref(3)
  const SEQUENCES_EXPAND_MS = 420
  let exploreColumnsTimer = null

  function toggleSequencesExpanded() {
    clearTimeout(exploreColumnsTimer)
    if (sequencesExpanded.value) {
      sequencesListSplit.value = false
      sequencesExpanded.value = false
      exploreGridColumns.value = 3
      return
    }
    sequencesExpanded.value = true
    exploreColumnsTimer = setTimeout(() => {
      sequencesListSplit.value = true
      exploreGridColumns.value = 1
    }, 240)
  }
  const exploreGridPerPageOptions = computed(() => gridPerPageOptions(t))

  // ── Shared content library (composable with module-level shared state) ──
  const {
    loading,
    searchQuery: contentSearchQuery,
    myContent,
    currentContentList,
    filteredContentList,
    ensureLoaded,
  } = useContentLibrary(store)

  const browserRef = ref(null)
  const explorePageRef = ref(null)

  const dragAutoScroll = createDragAutoScroll(() => {
    const root = explorePageRef.value
    if (!root) return []
    return [
      root.querySelector('.sequences-list-scroll'),
      root.querySelector('.cb-scroll-body'),
    ].filter(Boolean)
  })

  function onExploreDragStart(e) {
    const types = e.dataTransfer?.types
    if (!types?.length) return
    const hasItem = [...types].some(t => t === 'text/plain' || t === 'text')
    if (hasItem) dragAutoScroll.start()

    // UIUX-113: ensure sequence drags are marked even if card cache missed type
    try {
      const id = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text')
      if (!id) return
      const alreadyMarked = [...types].some(
        (t) => String(t).toLowerCase() === SEQUENCE_DRAG_MIME,
      )
      if (alreadyMarked) return
      const meta = metadataCache.get(id)
      if (
        mySequenceIdSet.value.has(id)
        || isSequenceActiveType(meta?.active_type)
      ) {
        e.dataTransfer.setData(SEQUENCE_DRAG_MIME, id)
      }
    } catch {
      /* setData may throw if not in dragstart; ignore */
    }
  }

  function onExploreDragEnd() {
    dragAutoScroll.stop()
  }

  // ── Core state ──
  const infoModalId = ref(null)
  const previewing = ref(null)
  // Trunk tagging: icons/modal off on simplified study domains.
  // Only resolve visibility for the *visible page* of cards — never the full catalog.
  // A reactive{} map updated per-id over thousands of rows freezes the main thread.
  const taxonomy = exploreTaxonomy(store.getters.tagPartition)
  const showTaggingIcons = taxonomy.allowTagging
  const taggingContentId = ref(null)
  /** @type {import('vue').ShallowRef<Record<string, boolean>>} */
  const taggingIconVisibility = shallowRef({})
  let taggingLoadToken = 0

  function unwrapBrowserList(maybeRef) {
    if (!maybeRef) return null
    // defineExpose leaves ComputedRef unwrapped only in templates
    if (typeof maybeRef === 'object' && 'value' in maybeRef) return maybeRef.value
    return maybeRef
  }

  async function refreshTaggingIconsForVisibleIds(ids) {
    if (!showTaggingIcons || !ids?.length) return
    const token = ++taggingLoadToken
    const role = store.getters['roles/role']?.(store.state.user)
    const userId = store.state.user
    const prev = taggingIconVisibility.value
    const next = { ...prev }
    const pending = ids.filter((id) => id && !(id in next))
    if (!pending.length) return

    // Admin can tag anything — no per-item metadata fan-out
    if (role === 'admin') {
      for (const id of pending) next[id] = true
      if (token === taggingLoadToken) taggingIconVisibility.value = next
      return
    }

    // Teachers: my-content is owned; only fetch metadata for the rest (page-sized)
    const mine = new Set(myContent)
    const needMeta = []
    for (const id of pending) {
      if (mine.has(id)) next[id] = true
      else needMeta.push(id)
    }

    const CONCURRENCY = 6
    for (let i = 0; i < needMeta.length; i += CONCURRENCY) {
      if (token !== taggingLoadToken) return
      const chunk = needMeta.slice(i, i + CONCURRENCY)
      await Promise.all(
        chunk.map(async (id) => {
          try {
            const meta = metadataCache.get(id) || await getContentMetadata(id).catch(() => null)
            next[id] = meta?.owner === userId
          } catch {
            next[id] = false
          }
        }),
      )
    }
    if (token === taggingLoadToken) taggingIconVisibility.value = next
  }

  watch(
    () => {
      const browser = browserRef.value
      const pageIds = unwrapBrowserList(browser?.paginatedDisplayList)
      if (Array.isArray(pageIds)) return pageIds
      const all = unwrapBrowserList(browser?.displayList)
      if (Array.isArray(all)) return all
      return filteredContentList.value
    },
    (list) => {
      if (!showTaggingIcons || !list?.length) return
      void refreshTaggingIconsForVisibleIds(list)
    },
    { immediate: true },
  )
  const {
    successDialog,
    success: showSuccessDialog,
    dismissSuccess: dismissSuccessDialog,
    error: showError,
  } = useFeedback()

  // ── Selection state ──
  const selectedItems = shallowReactive(new Set())

  // ── Sequence state ──
  const mobileSeqExpanded = ref(false)
  const mySequenceIds = ref([])
  const sequencesLoading = ref(true)
  /** Spinner while sequences fetch or my-content list is not ready yet. */
  const sequencesPanelLoading = computed(
    () => (sequencesLoading.value || loading.value) && mySequenceIds.value.length === 0,
  )
  const sequenceVersion = ref(0)
  const showCreateSequence = ref(false)
  /** When creating a sequence from Explore add-picker, seed these content ids. */
  const createSequenceInitialItemIds = ref([])
  const sequenceToEdit = ref(null)
  const sequenceToPreview = ref(null)
  const sequenceToView = ref(null)
  const sequenceToArchive = ref(null)
  const sequenceToArchiveName = ref('')
  const archiveConfirmLoading = ref(false)
  const sequenceSearchQuery = ref('')
  const sequenceStatusFilters = ref(defaultActiveStatusFilters())
  const sequenceFavoritesFilters = ref(defaultFavoritesFilters())
  const contentFavoritesFilters = ref(defaultFavoritesFilters())
  const contentTypeFilters = ref(defaultContentTypeFilters())
  const sequenceStatusFilterOptions = computed(() => buildStatusFilterOptions(t))
  const favoritesFilterOptions = computed(() => buildFavoritesFilterOptions(t))
  const contentTypeFilterOptions = computed(() => buildContentTypeFilterOptions(t))
  const activeSequenceIds = ref([])
  const newestSequenceId = ref(null)

  // ── Copy & modify state ──
  const copyModifyId = ref(null)

  // ── Create assignment state ──
  const createAssignmentId = ref(null)
  const createAssignmentContentIds = ref([])
  const viewAssignmentDetailsId = ref(null)
  const editAssignmentId = ref(null)
  const archivedSequenceIds = ref([])

  const archivedSequenceIdSet = computed(() => new Set(archivedSequenceIds.value))
  const mySequenceIdSet = computed(() => new Set(mySequenceIds.value))

  const activeSequenceCount = computed(() => activeSequenceIds.value.length)

  const archiveConfirmDescription = computed(() => {
    const name = sequenceToArchiveName.value
    if (name) {
      return `Archive "${name}"? It will be removed from your active sequences. You can restore it later.`
    }
    return (
      t('archive-sequence-confirm')
    )
  })

  const displayedSequenceIds = computed(() => {
    void nameCacheVersion.value
    let ids = mySequenceIds.value
    if (isTeacherExplore.value) {
      ids = ids.filter(id => matchesStatusFilter(
        sequenceStatusFilters.value,
        archivedSequenceIdSet.value.has(id),
      ))
      ids = ids.filter(id => matchesFavoritesFilter(
        sequenceFavoritesFilters.value,
        id,
        favorites,
      ))
    }
    const q = sequenceSearchQuery.value.trim().toLowerCase()
    if (!q) return ids
    const lang = store.getters.language()
    return ids.filter(id => {
      const name = (getCachedContentName(id, lang) || '').toLowerCase()
      return name.includes(q)
    })
  })

  const sequenceEmptyMessage = computed(() => {
    if (isFavoritesFilterActive(sequenceFavoritesFilters.value)) {
      if (sequenceSearchQuery.value.trim()) {
        return t('no-favorites-match-search')
      }
      return t('no-favorites-yet')
    }
    if (sequenceSearchQuery.value.trim()) {
      return t('no-sequences-match-search')
    }
    return t('no-sequences-yet')
  })

  const contentEmptyMessage = computed(() => {
    const hasSearch = !!contentSearchQuery.value.trim()
    if (isSequencesOnlyFilterActive(contentTypeFilters.value)) {
      if (hasSearch) {
        return t('no-sequences-match-search')
      }
      return t('no-sequences-yet')
    }
    if (isFavoritesFilterActive(contentFavoritesFilters.value)) {
      if (hasSearch) {
        return t('no-favorites-match-search')
      }
      return t('no-favorites-yet')
    }
    return t('no-results-found')
  })

  const pickerSequenceIds = computed(() => activeSequenceIds.value)

  function handleCopyModify(id) {
    copyModifyId.value = id
  }

  async function handleExploreEdit(id) {
    if (!id) return
    let kind = getContentType(id)
    if (!kind) {
      const meta = await getContentMetadata(id)
      kind = meta ? getContentType(id) : 'item'
    }
    if (kind === 'assignment') {
      editAssignmentId.value = id
      return
    }
    if (kind === 'sequence') editSequence(id)
  }

  function handleExplorePreview(id) {
    void openContentPreview(id, { previewing, sequenceToPreview })
  }

  async function onCopyModifyCreated(id) {
    await ensureSequenceMetadataCached(id)
    registerMyContentItem(id)
    promoteActiveSequence(id)
    newestSequenceId.value = id
    await persistSequenceList(activeSequenceIds.value, archivedSequenceIds.value)
    copyModifyId.value = null
  }

  // ── Add picker state ──
  const showAddPicker = ref(false)
  const pendingAddItems = ref([])
  const TEACHER_ASSIGNMENT_TAG = 'teacher-created'
  const assignmentSavingId = ref(null)
  const assignmentAddResult = ref(null)

  async function addItemsToAssignment(assignmentId, itemIds) {
    if (!assignmentId || !itemIds?.length || assignmentSavingId.value) return
    assignmentSavingId.value = assignmentId
    let assignmentName = t('untitled')
    try {
      const st = await Agent.state(assignmentId)
      assignmentName = st?.name || assignmentName
    } catch { /* ignore */ }
    try {
      const state = await Agent.state(assignmentId)
      const content = normalizeAssignmentContent(state.content)
      let added = 0
      for (const id of itemIds) {
        if (!id || content.includes(id)) continue
        content.push(id)
        added++
      }
      if (added > 0) {
        state.content = content
        await Agent.synced()
        deselectAll()
      }
      assignmentAddResult.value = {
        id: assignmentId,
        name: assignmentName,
        added,
        duplicate: added === 0,
      }
    } catch (e) {
      console.error('[Explore] addItemsToAssignment failed', assignmentId, e)
      showError(t('something-went-wrong'))
    } finally {
      assignmentSavingId.value = null
    }
  }

  function goToAssignmentFromPicker() {
    const id = assignmentAddResult.value?.id
    closeAddPicker()
    if (id) viewAssignmentDetailsId.value = id
  }

  function openEditFromAssignmentDetails() {
    const id = viewAssignmentDetailsId.value
    viewAssignmentDetailsId.value = null
    if (id) editAssignmentId.value = id
  }

  // ── Favorites (Agent state `my-favorites` — content items + sequences) ──
  const favorites = reactive(new Set())
  let favoritesState = null

  async function loadFavorites() {
    try {
      const loaded = await loadExploreFavorites()
      favoritesState = loaded.state
      favorites.clear()
      loaded.ids.forEach(id => favorites.add(id))
    } catch (e) {
      console.warn('[Explore] loadFavorites failed', e)
    }
  }

  async function toggleFavorite(id) {
    try {
      favoritesState = await toggleExploreFavorite(id, favorites, favoritesState)
    } catch (e) {
      console.error('[Explore] toggleFavorite failed', id, e)
      showError(t('something-went-wrong'))
    }
  }

  // ── Content browser filter (hide archived sequences + optional favorites) ──
  function contentExploreFilter(list) {
    const archived = archivedSequenceIdSet.value
    let result = list.filter(id => !archived.has(id))
    if (isSequencesOnlyFilterActive(contentTypeFilters.value)) {
      result = result.filter(id => matchesContentTypeFilter(
        contentTypeFilters.value,
        id,
        mySequenceIdSet.value,
      ))
    }
    if (isFavoritesFilterActive(contentFavoritesFilters.value)) {
      result = result.filter(id => favorites.has(id))
    }
    return result
  }

  const allSelected = computed(() => {
    const list = browserRef.value?.displayList || filteredContentList.value
    if (!list.length) return false
    return list.every(id => selectedItems.has(id))
  })

  // ── Selection helpers ──
  function toggleSelection(id) {
    if (selectedItems.has(id)) selectedItems.delete(id)
    else selectedItems.add(id)
  }

  function toggleSelectAll() {
    if (allSelected.value) {
      deselectAll()
    } else {
      const list = browserRef.value?.displayList || filteredContentList.value
      list.forEach(id => selectedItems.add(id))
    }
  }

  function deselectAll() {
    selectedItems.clear()
  }

  // ── Sequence helpers ──
  function openSequenceContent(id) {
    if (archivedSequenceIdSet.value.has(id)) return
    sequenceToView.value = id
  }

  function onDropItemToSequence(seqId, payload) {
    const itemId = typeof payload === 'string' ? payload : payload?.itemId
    const insertIndex = typeof payload === 'object' && payload?.index != null
      ? payload.index
      : -1
    if (itemId) addItemsToSequence(seqId, [itemId], { insertIndex })
  }

  function editSequence(id) {
    if (archivedSequenceIdSet.value.has(id)) return
    sequenceToEdit.value = id
  }

  function closeCreateSequenceModal() {
    showCreateSequence.value = false
    sequenceToEdit.value = null
    createSequenceInitialItemIds.value = []
  }

  async function onSequenceCreated(id) {
    const seededFromPicker = createSequenceInitialItemIds.value.length > 0
    await ensureSequenceMetadataCached(id)
    registerMyContentItem(id)
    promoteActiveSequence(id)
    newestSequenceId.value = id
    await persistSequenceList(activeSequenceIds.value, archivedSequenceIds.value)
    closeCreateSequenceModal()
    if (seededFromPicker) {
      deselectAll()
      sequenceVersion.value++
    }
    showSuccessDialog(t('sequence-created-successfully'))
  }

  async function onSequenceUpdated(payload) {
    const id = payload?.id || sequenceToEdit.value
    sequenceToEdit.value = null
    if (id) {
      const name = payload?.name?.trim()
      const description = payload?.description != null
        ? String(payload.description).trim()
        : ''
      // Write the card cache first — do not invalidate, or a stale
      // refetch will flash "…" and can overwrite this patch.
      if (name) {
        setCachedLegacyName(id, name)
        setCachedContentName(id, name, store.getters.language())
      }
      const existing = getCachedPreviewMeta(id)
      patchPreviewMeta(id, {
        description,
        itemCount: existing?.itemCount ?? 1,
        isSequence: existing?.isSequence ?? true,
        kind: existing?.kind ?? 'sequence',
      })
      touchSequenceUpdated(id)
      promoteActiveSequence(id)
      sequenceVersion.value++
      showSuccessDialog(t('sequence-updated'))
      await persistSequenceList(activeSequenceIds.value, archivedSequenceIds.value)
      return
    }
    sequenceVersion.value++
    showSuccessDialog(t('sequence-updated'))
  }

  const archivingSequenceIds = new Set()

  function onRestoreSequence(id) {
    void restoreSequence(id).catch((e) => {
      console.error('[Explore] restoreSequence unhandled', id, e)
      showError(t('something-went-wrong'))
    })
  }

  async function confirmArchiveSequence() {
    const id = sequenceToArchive.value
    if (!id || archiveConfirmLoading.value) return
    archiveConfirmLoading.value = true
    try {
      await setExploreSequenceArchived(id, true)
      sequenceToArchive.value = null
      sequenceToArchiveName.value = ''
      if (sequenceToView.value === id) sequenceToView.value = null
      await loadMySequences({ silent: true })
      showSuccessDialog(
        'Sequence archived',
        'This sequence has been moved to your archived list. It no longer appears among active sequences or when adding content to assignments. You can restore it anytime from the sequences panel.',
      )
    } catch (e) {
      console.error('[Explore] archiveSequence failed', id, e)
      showError(t('something-went-wrong'))
    } finally {
      archiveConfirmLoading.value = false
    }
  }

  watch(sequenceToArchive, async (id) => {
    if (!id) {
      sequenceToArchiveName.value = ''
      return
    }
    try {
      const state = await Agent.state(id)
      sequenceToArchiveName.value = state?.name || ''
    } catch {
      sequenceToArchiveName.value = ''
    }
  })

  // ── Add to sequence/assignment ──
  function closeAddPicker() {
    showAddPicker.value = false
    pendingAddItems.value = []
    assignmentAddResult.value = null
    assignmentSavingId.value = null
  }

  function openAddPicker(itemIds) {
    pendingAddItems.value = itemIds
    assignmentAddResult.value = null
    showAddPicker.value = true
  }

  function handleAddItem(id) {
    openAddPicker([id])
  }

  function addSelectedToSequence() {
    openAddPicker([...selectedItems])
  }

  function navigateToCreateAssignment() {
    const contentIds = [...pendingAddItems.value]
    closeAddPicker()
    createAssignmentContentIds.value = contentIds
    createAssignmentId.value = uuid()
  }

  async function navigateToCreateSequence() {
    const { allowed, rejectedSequences } = await partitionSequenceMemberIds(
      pendingAddItems.value,
      { knownSequenceIds: mySequenceIdSet.value },
    )
    // UIUX-113: block pure-sequence selection; reuse existing generic error (no new copy)
    if (!allowed.length) {
      showError(t('something-went-wrong'))
      return
    }
    if (rejectedSequences.length) {
      // Mixed selection: still create with leaf items only
    }
    closeAddPicker()
    createSequenceInitialItemIds.value = allowed
    showCreateSequence.value = true
  }

  async function onExploreAssignmentSaved(meta) {
    const id = createAssignmentId.value
    if (id) {
      await store.dispatch('pila_tags/tag', { content_id: id, tag_type: 'teacher-created' })
    }
    createAssignmentId.value = null
    createAssignmentContentIds.value = []
    if (meta?.asDraft) {
      showSuccessDialog(t('draft-saved-successfully'))
    } else {
      showSuccessDialog(t('assignment-created-successfully'))
    }
  }

  async function addItemsToSequence(sequenceId, itemIds, { insertIndex = -1 } = {}) {
    if (!sequenceId || !itemIds?.length || archivedSequenceIdSet.value.has(sequenceId)) return
    try {
      const { added, rejectedSequences } = await appendItemsToSequence(sequenceId, itemIds, {
        insertIndex,
        knownSequenceIds: mySequenceIdSet.value,
      })
      if (!added) {
        // Nested sequence(s) only, or already present
        showError(
          rejectedSequences?.length
            ? t('something-went-wrong')
            : t('all-selected-already-in-sequence'),
        )
        return
      }
      showAddPicker.value = false
      pendingAddItems.value = []
      deselectAll()
      sequenceVersion.value++
      showSuccessDialog(
        added === 1
          ? t('one-item-added-to-sequence')
          : t('n-items-added-to-sequence').replace('{count}', String(added)),
      )
    } catch (e) {
      console.error('[Explore] addItemsToSequence failed', sequenceId, e)
      showError(t('something-went-wrong'))
    }
  }

  function touchSequenceUpdated(id) {
    if (!id) return
    const meta = metadataCache.get(id)
    metadataCache.set(id, {
      active_type: meta?.active_type || 'application/json;type=sequence',
      owner: meta?.owner,
      updated: new Date().toISOString(),
    })
  }

  async function ensureSequenceMetadataCached(id) {
    invalidate(id)
    const meta = await getContentMetadata(id).catch(() => null)
    if (meta?.updated) return
    if (meta) {
      metadataCache.set(id, { ...meta, updated: new Date().toISOString() })
      return
    }
    metadataCache.set(id, {
      active_type: 'application/json;type=sequence',
      updated: new Date().toISOString(),
    })
  }

  function sequenceUpdatedTimestamp(meta, id) {
    if (!meta?.updated) {
      if (id && id === newestSequenceId.value) return Date.now()
      return 0
    }
    const ts = new Date(meta.updated).getTime()
    return Number.isFinite(ts) ? ts : 0
  }

  function sortSequenceIdsNewestFirst(ids, updatedById) {
    return [...ids].sort((a, b) => (updatedById.get(b) ?? 0) - (updatedById.get(a) ?? 0))
  }

  function promoteActiveSequence(id) {
    if (!id || archivedSequenceIds.value.includes(id)) return
    activeSequenceIds.value = [id, ...activeSequenceIds.value.filter(x => x !== id)]
    mySequenceIds.value = [...activeSequenceIds.value, ...archivedSequenceIds.value]
  }

  function applySequenceLists(active, archived) {
    activeSequenceIds.value = active
    archivedSequenceIds.value = archived
    mySequenceIds.value = [...active, ...archived]
  }

  function seedSequencesFromMetadataCache() {
    const active = []
    for (const id of myContent) {
      const meta = metadataCache.get(id)
      if (meta?.active_type === 'application/json;type=sequence') active.push(id)
    }
    if (active.length) applySequenceLists(active, archivedSequenceIds.value)
  }

  async function applyCachedSequenceList() {
    try {
      const env = await Agent.environment()
      const userId = env?.auth?.user
      if (!userId) return false
      const cached = await loadExploreCache(userId)
      const seq = cached?.sequences
      if (!seq?.active?.length && !seq?.archived?.length) return false
      applySequenceLists(seq.active || [], seq.archived || [])
      return true
    } catch {
      return false
    }
  }

  /** Seed sequence ids from disk-cached my-content + metadata (before network). */
  async function seedSequencesFromExploreDiskCache() {
    try {
      const env = await Agent.environment()
      const userId = env?.auth?.user
      if (!userId) return false
      const cached = await loadExploreCache(userId)
      const ids = cached?.myContent
      if (!ids?.length) return false
      const active = []
      for (const id of ids) {
        const meta = metadataCache.get(id)
        if (meta?.active_type === 'application/json;type=sequence') active.push(id)
      }
      if (!active.length) return false
      applySequenceLists(active, cached?.sequences?.archived || archivedSequenceIds.value)
      return true
    } catch {
      return false
    }
  }

  let loadSequencesToken = 0

  async function persistSequenceList(active, archived) {
    try {
      const env = await Agent.environment()
      const userId = env?.auth?.user
      if (userId) await persistSequencesPanelCache(userId, { active, archived })
    } catch { /* ignore */ }
  }

  async function loadMySequences({ silent = false } = {}) {
    if (loading.value && myContent.length === 0) return

    const token = ++loadSequencesToken
    if (!silent && !mySequenceIds.value.length) sequencesLoading.value = true
    try {
      const ids = [...myContent]
      const metas = await Promise.all(
        ids.map(id => getContentMetadata(id).catch(() => null)),
      )
      const sequenceIds = ids.filter(
        (_, i) => metas[i]?.active_type === 'application/json;type=sequence',
      )

      const [archivedIdSet, states] = await Promise.all([
        loadExploreArchivedSequenceIds(),
        Promise.allSettled(sequenceIds.map(id => Agent.state(id))),
      ])

      const active = []
      const archived = []
      const updatedById = new Map(
        ids.map((id, i) => [id, sequenceUpdatedTimestamp(metas[i], id)]),
      )

      sequenceIds.forEach((id, i) => {
        const result = states[i]
        const state = result.status === 'fulfilled' ? result.value : null
        if (!isValidSequenceAgentState(state)) return
        if (state.name) setCachedLegacyName(id, state.name)
        if (archivedIdSet.has(id) || state.archived) archived.push(id)
        else active.push(id)
      })

      if (token !== loadSequencesToken) return
      const sortedActive = sortSequenceIdsNewestFirst(active, updatedById)
      const sortedArchived = sortSequenceIdsNewestFirst(archived, updatedById)
      applySequenceLists(sortedActive, sortedArchived)
      persistSequenceList(sortedActive, sortedArchived)

      const hierarchy = getCachedTagHierarchy()?.leafToCategory
      await prefetchBatch([...sortedActive, ...sortedArchived], store.getters.language(), taxonomy.partition, hierarchy)
    } finally {
      if (token === loadSequencesToken) sequencesLoading.value = false
    }
  }

  async function restoreSequence(id) {
    if (!id || archivingSequenceIds.has(id)) return
    archivingSequenceIds.add(id)
    try {
      await setExploreSequenceArchived(id, false)
      await loadMySequences({ silent: true })
      showSuccessDialog(
        'Sequence restored',
        'This sequence is back in your active list. You can edit it, add items, and include it in assignments again.',
      )
    } catch (e) {
      console.error('[Explore] restoreSequence failed', id, e)
      showError(t('something-went-wrong'))
    } finally {
      archivingSequenceIds.delete(id)
    }
  }

  // ── Invalidate name cache on language change ──
  watch(() => store.getters.language(), async (newLang, oldLang) => {
    if (newLang && oldLang && newLang !== oldLang) {
      invalidateNames()
      const allIds = currentContentList.value
      if (allIds.length) {
        await prefetchBatch(allIds, newLang, taxonomy.partition, getCachedTagHierarchy()?.leafToCategory)
        notifyTagIndexUpdated()
      }
    }
  })

  // Refresh sequences when my-content list changes (e.g. after Explore prefetch)
  watch(() => myContent.length, (len, prev) => {
    if (len === prev) return
    loadMySequences({ silent: mySequenceIds.value.length > 0 })
  })

  watch(loading, (isLoading, wasLoading) => {
    if (wasLoading && !isLoading) {
      loadMySequences({ silent: mySequenceIds.value.length > 0 })
    }
  })

  // ── Init: load my-content + sequences in parallel (shared ensureLoaded with ContentBrowser) ──
  onMounted(async () => {
    const root = explorePageRef.value
    if (root) {
      root.addEventListener('dragstart', onExploreDragStart)
      root.addEventListener('dragend', onExploreDragEnd)
      root.addEventListener('drop', onExploreDragEnd)
    }

    loadFavorites().catch(() => {})
    const exploreReady = ensureLoaded({ useDiskCache: true })

    const hadDiskList = await applyCachedSequenceList()
    if (!hadDiskList) {
      await seedSequencesFromExploreDiskCache()
      if (!mySequenceIds.value.length) seedSequencesFromMetadataCache()
    }
    if (mySequenceIds.value.length) sequencesLoading.value = false

    await exploreReady
    await loadMySequences({ silent: mySequenceIds.value.length > 0 })
  })

  onBeforeUnmount(() => {
    clearTimeout(exploreColumnsTimer)
    dragAutoScroll.stop()
    const root = explorePageRef.value
    if (root) {
      root.removeEventListener('dragstart', onExploreDragStart)
      root.removeEventListener('dragend', onExploreDragEnd)
      root.removeEventListener('drop', onExploreDragEnd)
    }
  })
</script>

<style scoped>
.explore-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.explore-page .page-heading {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.explore-columns {
  display: flex;
  flex-direction: row;
  gap: 12px;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  align-items: stretch;
}

.sequences-panel {
  box-sizing: border-box;
  flex: 0 0 auto;
  width: 264px;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.explore-columns--sequences-expanded .sequences-panel {
  width: calc(100% - 352px);
}

.content-library-card {
  box-sizing: border-box;
  flex: 0 0 auto;
  width: calc(100% - 276px);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  transition: width 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.explore-columns--sequences-expanded .content-library-card {
  width: 340px;
}

.sequences-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-content: start;
}
.sequences-list--split {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
.sequences-list > * {
  min-width: 0;
}

.sequences-card-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.sequences-heading {
  white-space: nowrap;
}

.sequences-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 12px;
  font-size: 13px;
  color: #64748b;
}

.sequences-card {
  background: white;
  border-radius: 12px;
  padding: 20px 12px 12px 12px;
  min-width: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sequences-card-header {
  flex-shrink: 0;
}

.sequences-list-scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  margin-top: 16px;
  padding-right: 2px;
  -webkit-overflow-scrolling: touch;
}

.content-library-card {
  display: flex;
  flex-direction: column;
  align-self: stretch;
}

.content-library-card .content-lib-header {
  flex-shrink: 0;
  margin-bottom: 16px;
  padding-bottom: 16px;
}

.content-library-card :deep(.content-browser--fill) {
  flex: 1;
  min-height: 0;
}

.sequences-filter {
  min-width: 0;
}

.content-lib-header {
  border-bottom: 1px solid #E2E8F0;
}

.content-lib-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  min-width: 0;
}

/* Selection toolbar */
.selection-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  margin-bottom: 16px;
}

.selection-count {
  font-size: 13px;
  font-weight: 500;
  color: #1e40af;
}

/* Metadata panel */
.metadata-panel {
  position: fixed;
  right: 0;
  top: 0;
  height: 100%;
  padding-bottom: 6rem;
  overflow: auto;
  background: white;
  border-left: 1px solid #e2e8f0;
  min-width: 200px;
  max-width: 30%;
  z-index: 10;
}

/* Mobile bottom action bar */
.mobile-bottom-bar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: white;
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
}


/* Mobile sequences (hidden on desktop) */
.mobile-sequences {
  display: none;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}
.mobile-seq-section {
  background: white;
  border-radius: 10px;
  padding: 12px;
}
.mobile-seq-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 8px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
}
.mobile-seq-selector-name {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mobile-seq-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Responsive: keep pane scroll on tablet when stacked */
@media (max-width: 1023px) {
  .explore-page {
    height: 100%;
    overflow: hidden;
  }

  .explore-columns {
    flex-direction: column;
  }

  .sequences-panel,
  .explore-columns--sequences-expanded .sequences-panel {
    width: 100%;
    height: 42%;
    min-height: 180px;
    transition: height 420ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .explore-columns--sequences-expanded .sequences-panel {
    height: 62%;
  }

  .content-library-card,
  .explore-columns--sequences-expanded .content-library-card {
    width: 100%;
    flex: 1 1 auto;
    min-height: 0;
  }

  .sequences-card {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .sequences-list-scroll {
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
  }
}

@media (max-width: 767px) {
  .sequences-panel {
    display: none;
  }
  .mobile-sequences {
    display: flex;
  }
  .explore-page--sequences-expanded .mobile-sequences {
    display: none;
  }
  .explore-columns--sequences-expanded .sequences-panel {
    display: flex;
    width: 100%;
    min-height: 0;
    max-height: none;
    animation: sequences-expand-in 280ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .explore-columns--sequences-expanded .content-library-card {
    display: none;
  }
  .explore-columns--sequences-expanded .sequences-list {
    grid-template-columns: minmax(0, 1fr);
  }
  .mobile-bottom-bar {
    display: block;
  }
  .selection-toolbar {
    display: none;
  }
  .metadata-panel {
    min-width: unset;
    max-width: unset;
    width: 100%;
    left: 0;
  }
}

@keyframes sequences-expand-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sequences-panel,
  .content-library-card {
    transition: none;
  }
  .explore-columns--sequences-expanded .sequences-panel {
    animation: none;
  }
}
</style>
