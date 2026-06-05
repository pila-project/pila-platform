<template>
  <div class="page-container explore-page">
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
        <h2 class="sequences-heading text-sm font-semibold text-zinc-950">
          {{ t('my-sequences') }}<span v-if="!sequencesPanelLoading"> ({{ activeSequenceCount }})</span>
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">{{ t('organize-content-into-learning-sequences') }}</p>
        <PInput
          v-model="sequenceSearchQuery"
          class="mt-2"
          :placeholder="t('search-sequences') || 'Search sequences'"
          icon="lucide:search"
        />
        <button class="mobile-seq-selector" @click="mobileSeqExpanded = !mobileSeqExpanded">
          <span class="mobile-seq-selector-name">
            {{ selectedSequenceName || t('select-a-sequence') }}
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
              :active="selectedSequence === seqId"
              :archived="archivedSequenceIds.includes(seqId)"
              :favorited="favorites.has(seqId)"
              :isNewest="newestSequenceId === seqId"
              :version="sequenceVersion"
              @select="selectSequence(seqId); mobileSeqExpanded = false"
              @toggle-favorite="toggleFavorite(seqId)"
              @edit="editSequence(seqId)"
              @archive="sequenceToArchive = seqId"
              @restore="onRestoreSequence(seqId)"
              @preview="sequenceToPreview = seqId"
              @drop-item="payload => onDropItemToSequence(seqId, payload)"
            />
            <div v-if="!displayedSequenceIds.length && !sequencesPanelLoading" class="text-xs text-slate-400 text-center py-4">
              {{ sequenceSearchQuery ? (t('no-sequences-match-search') || 'No sequences match your search') : t('no-sequences-yet') }}
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="explore-columns">
      <!-- Left panel: My sequences (desktop) -->
      <aside class="sequences-panel">
        <div class="sequences-card">
          <h2 class="sequences-heading text-base font-semibold text-zinc-950">
            {{ t('my-sequences') }}<span v-if="!sequencesPanelLoading"> ({{ activeSequenceCount }})</span>
          </h2>
          <p class="text-sm text-slate-500 mt-1">{{ t('organize-content-into-learning-sequences') }}</p>
          <PInput
            v-model="sequenceSearchQuery"
            class="mt-3"
            :placeholder="t('search-sequences') || 'Search sequences'"
            icon="lucide:search"
          />
          <PButton
            variant="primary"
            icon="lucide:plus"
            :text="t('new-sequence')"
            class="mt-3 w-full"
            @click="showCreateSequence = true"
          />

          <!-- Sequence cards -->
          <div v-if="sequencesPanelLoading" class="sequences-loading mt-4" aria-busy="true">
            <LucideIcon name="loader-2" :size="14" :spin="true" />
            {{ t('loading') }}
          </div>
          <div v-else class="mt-4 flex flex-col gap-3">
            <SequenceCard
              v-for="seqId in displayedSequenceIds"
              :key="seqId"
              :id="seqId"
              :active="selectedSequence === seqId"
              :archived="archivedSequenceIds.includes(seqId)"
              :favorited="favorites.has(seqId)"
              :isNewest="newestSequenceId === seqId"
              :version="sequenceVersion"
              @select="selectSequence(seqId)"
              @toggle-favorite="toggleFavorite(seqId)"
              @edit="editSequence(seqId)"
              @archive="sequenceToArchive = seqId"
              @restore="onRestoreSequence(seqId)"
              @preview="sequenceToPreview = seqId"
              @drop-item="payload => onDropItemToSequence(seqId, payload)"
            />
            <div v-if="!displayedSequenceIds.length" class="text-xs text-slate-400 text-center py-6">
              {{ sequenceSearchQuery ? (t('no-sequences-match-search') || 'No sequences match your search') : t('no-sequences-yet') }}
            </div>
          </div>
        </div>
      </aside>

      <!-- Right panel: Content library -->
      <div class="content-card content-library-card flex-1 min-w-0">
        <!-- Section header -->
        <div class="content-lib-header">
          <div class="flex items-center justify-between">
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
          :columns="3"
          :per-page="12"
          :per-page-options="[12, 24, 48]"
          :extra-filter="contentExploreFilter"
          use-disk-cache
        >
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

            <!-- Empty state: selected sequence with no items -->
            <div v-if="selectedSequence && selectedSequenceEmpty" class="empty-sequence-state">
              <LucideIcon name="search" :size="48" class="text-slate-300 mb-4" />
              <h3 class="text-base font-semibold text-zinc-950">{{ t('no-item-in-this-sequence') }}</h3>
              <p class="text-sm text-slate-500 mt-1">{{ t('start-browsing-to-add-content') }}</p>
              <PButton
                variant="primary"
                :text="t('browse-content')"
                class="mt-4"
                @click="selectedSequence = null"
              />
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
              show-copy-modify
              @info="infoModalId = id"
              @toggle-select="toggleSelection(id)"
              @toggle-favorite="toggleFavorite(id)"
              @preview="previewing = id"
              @remove="() => {
                setTagging({ tag: MY_CONTENT_TAG, target: id, value: null })
                myContent.splice(myContent.indexOf(id), 1)
              }"
              @add="handleAddItem(id)"
              @copy-modify="handleCopyModify(id)"
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
      width="480px"
      no-pad-body
      @close="infoModalId = null"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('content-info') || 'Content info' }}</h2>
          <p class="text-xs text-slate-500 mt-0.5 truncate">
            <NameOrTranslatedNameFromItemId :item-id="infoModalId" />
          </p>
        </div>
      </template>
      <template #body>
        <ContentMetadataPanel
          :key="infoModalId"
          :id="infoModalId"
          :partition="partition"
          embedded
        />
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('close') || 'Close'" @click="infoModalId = null" />
      </template>
    </PModal>

    <!-- Create/Edit Sequence Modal -->
    <CreateSequenceModal
      v-if="showCreateSequence || sequenceToEdit"
      :id="sequenceToEdit"
      @close="showCreateSequence = false; sequenceToEdit = null"
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
      :confirm-text="t('archive-sequence')"
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

    <!-- Edit assignment (from Explore “Go to assignment”) -->
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
      @confirm-sequence="id => addItemsToSequence(id, pendingAddItems)"
      @confirm-assignment="id => addItemsToAssignment(id, pendingAddItems)"
      @go-to-assignment="goToAssignmentFromPicker"
    />
  </div>
</template>

<script setup>
  import { ref, reactive, shallowReactive, computed, watch, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import { useRouter } from 'vue-router'
  import ContentMetadataPanel from './content-metadata-panel.vue'
  import TaggedContentCard from '@/components/tags/tagged-content-card.vue'
  import ContentBrowser from './content-browser.vue'
  import PreviewModal from '@/components/common/preview-modal.vue'
  import SequenceCard from './sequence-card.vue'
  import CreateSequenceModal from './create-sequence-modal.vue'
  import SequencePreviewModal from './sequence-preview-modal.vue'
  import ExploreAddPickerModal from './explore-add-picker-modal.vue'
  import NameOrTranslatedNameFromItemId from './name-or-translated-name-from-item-id.vue'
  import CopyModifyModal from './copy-modify-modal.vue'
  import { v4 as uuid } from 'uuid'
  import CreateEditAssignmentModal from '@/pages/assignments/from-me/create-edit-assignment-modal.vue'
  import LucideIcon from '@/components/ui/LucideIcon.vue'
  import setTagging from '@/utils/set-tagging.js'
  import { MY_CONTENT_TAG } from '@/utils/constants.js'
  import {
    nameCache, metadataCache, invalidate,
    getCachedTagHierarchy, prefetchBatch, invalidateNames,
    getContentMetadata, loadExploreCache, persistSequencesPanelCache,
  } from '@/utils/content-cache.js'
  import { useContentLibrary, notifyTagIndexUpdated } from '@/utils/useContentLibrary.js'
  import {
    readSequenceItemIds,
    appendItemsToSequence,
  } from '@/utils/sequence-items.js'
  import { normalizeAssignmentContent } from '@/utils/assignment-content.js'
  import {
    loadExploreArchivedSequenceIds,
    setExploreSequenceArchived,
  } from '@/utils/explore-sequence-archive.js'
  import { loadExploreFavorites, toggleExploreFavorite } from '@/utils/explore-favorites.js'
  import { PButton, PCheckbox, PAlertDialog, PModal, PInput } from '@/components/ui/index.js'
  import { useFeedback } from '@/composables/useFeedback.js'

  const store = useStore()
  const router = useRouter()
  function t(slug) { return store.getters.t(slug) }

  // ── Shared content library (composable with module-level shared state) ──
  const {
    loading,
    myContent,
    myContentIds,
    currentContentList,
    filteredContentList,
  } = useContentLibrary(store)

  const browserRef = ref(null)

  // ── Core state ──
  const infoModalId = ref(null)
  const previewing = ref(null)
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
  /** Spinner only when we have nothing to show yet (not blocked on full Explore load). */
  const sequencesPanelLoading = computed(
    () => sequencesLoading.value && mySequenceIds.value.length === 0,
  )
  const sequenceVersion = ref(0)
  const selectedSequence = ref(null)
  const showCreateSequence = ref(false)
  const sequenceToEdit = ref(null)
  const sequenceToPreview = ref(null)
  const sequenceToArchive = ref(null)
  const sequenceToArchiveName = ref('')
  const archiveConfirmLoading = ref(false)
  const sequenceSearchQuery = ref('')
  const activeSequenceIds = ref([])
  const selectedSequenceEmpty = ref(true)
  const selectedSequenceItems = ref([])
  const newestSequenceId = ref(null)

  // ── Copy & modify state ──
  const copyModifyId = ref(null)

  // ── Create assignment state ──
  const createAssignmentId = ref(null)
  const createAssignmentContentIds = ref([])
  const editAssignmentId = ref(null)
  const archivedSequenceIds = ref([])

  const archivedSequenceIdSet = computed(() => new Set(archivedSequenceIds.value))

  const activeSequenceCount = computed(() => activeSequenceIds.value.length)

  const archiveConfirmDescription = computed(() => {
    const name = sequenceToArchiveName.value
    if (name) {
      return `Archive "${name}"? It will be removed from your active sequences. You can restore it later.`
    }
    return (
      t('archive-sequence-confirm')
      || 'Archive this sequence? It will be removed from your active sequences. You can restore it later.'
    )
  })

  const displayedSequenceIds = computed(() => {
    const q = sequenceSearchQuery.value.trim().toLowerCase()
    if (!q) return mySequenceIds.value
    return mySequenceIds.value.filter(id => {
      const name = (nameCache.get(id) || '').toLowerCase()
      return name.includes(q)
    })
  })

  const pickerSequenceIds = computed(() => activeSequenceIds.value)

  function handleCopyModify(id) {
    copyModifyId.value = id
  }

  function onCopyModifyCreated(id) {
    if (!myContent.includes(id)) myContent.push(id)
    myContentIds.add(id)
    metadataCache.set(id, { active_type: 'application/json;type=sequence' })
    invalidate(id)
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
      showError(t('something-went-wrong') || 'Something went wrong')
    } finally {
      assignmentSavingId.value = null
    }
  }

  function goToAssignmentFromPicker() {
    const id = assignmentAddResult.value?.id
    closeAddPicker()
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
      showError(t('something-went-wrong') || 'Something went wrong')
    }
  }

  // ── Content browser filter (sequence scope + hide archived sequences) ──
  function contentExploreFilter(list) {
    const archived = archivedSequenceIdSet.value
    let result = list.filter(id => !archived.has(id))
    if (selectedSequence.value && !archived.has(selectedSequence.value) && selectedSequenceItems.value.length) {
      const seqItems = new Set(selectedSequenceItems.value)
      result = result.filter(id => seqItems.has(id))
    }
    return result
  }

  const selectedSequenceName = computed(() => {
    if (!selectedSequence.value) return ''
    return nameCache.get(selectedSequence.value) || t('untitled')
  })

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
  function selectSequence(id) {
    if (archivedSequenceIdSet.value.has(id)) return
    if (selectedSequence.value === id) {
      selectedSequence.value = null
      selectedSequenceItems.value = []
      selectedSequenceEmpty.value = true
    } else {
      selectedSequence.value = id
      loadSequenceItems(id)
    }
  }

  async function loadSequenceItems(id) {
    try {
      const items = await readSequenceItemIds(id)
      selectedSequenceItems.value = items
      selectedSequenceEmpty.value = items.length === 0
    } catch (e) {
      console.warn('[Explore] loadSequenceItems failed', id, e)
      selectedSequenceItems.value = []
      selectedSequenceEmpty.value = true
    }
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

  async function onSequenceCreated(id) {
    if (!myContent.includes(id)) myContent.push(id)
    metadataCache.set(id, { active_type: 'application/json;type=sequence' })
    mySequenceIds.value.unshift(id)
    newestSequenceId.value = id
    showCreateSequence.value = false
    showSuccessDialog(t('sequence-created-successfully'))
  }

  async function onSequenceUpdated() {
    sequenceToEdit.value = null
    showSuccessDialog(t('sequence-updated'))
  }

  const archivingSequenceIds = new Set()

  function onRestoreSequence(id) {
    void restoreSequence(id).catch((e) => {
      console.error('[Explore] restoreSequence unhandled', id, e)
      showError(t('something-went-wrong') || 'Something went wrong')
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
      if (selectedSequence.value === id) {
        selectedSequence.value = null
        selectedSequenceItems.value = []
        selectedSequenceEmpty.value = true
      }
      await loadMySequences({ silent: true })
      showSuccessDialog(
        'Sequence archived',
        'This sequence has been moved to your archived list. It no longer appears among active sequences or when adding content to assignments. You can restore it anytime from the sequences panel.',
      )
    } catch (e) {
      console.error('[Explore] archiveSequence failed', id, e)
      showError(t('something-went-wrong') || 'Something went wrong')
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
    if (selectedSequence.value) {
      addItemsToSequence(selectedSequence.value, [id])
    } else {
      openAddPicker([id])
    }
  }

  function addSelectedToSequence() {
    const items = [...selectedItems]
    if (selectedSequence.value) {
      addItemsToSequence(selectedSequence.value, items)
    } else {
      openAddPicker(items)
    }
  }

  function navigateToCreateAssignment() {
    const contentIds = [...pendingAddItems.value]
    closeAddPicker()
    createAssignmentContentIds.value = contentIds
    createAssignmentId.value = uuid()
  }

  async function onExploreAssignmentSaved() {
    const id = createAssignmentId.value
    if (id) {
      await store.dispatch('pila_tags/tag', { content_id: id, tag_type: 'teacher-created' })
    }
    createAssignmentId.value = null
    createAssignmentContentIds.value = []
    showSuccessDialog(t('assignment-created-successfully'))
  }

  async function addItemsToSequence(sequenceId, itemIds, { insertIndex = -1 } = {}) {
    if (!sequenceId || !itemIds?.length || archivedSequenceIdSet.value.has(sequenceId)) return
    try {
      const { added, items } = await appendItemsToSequence(sequenceId, itemIds, { insertIndex })
      if (!added) return
      showAddPicker.value = false
      pendingAddItems.value = []
      deselectAll()
      if (selectedSequence.value === sequenceId) {
        selectedSequenceItems.value = items
        selectedSequenceEmpty.value = items.length === 0
      }
      sequenceVersion.value++
      showSuccessDialog(
        added === 1 ? '1 item added to sequence' : `${added} items added to sequence`,
      )
    } catch (e) {
      console.error('[Explore] addItemsToSequence failed', sequenceId, e)
      showError(t('something-went-wrong') || 'Something went wrong')
    }
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
      if (!seq?.active?.length) return false
      applySequenceLists(seq.active, seq.archived || [])
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
      sequenceIds.forEach((id, i) => {
        const result = states[i]
        const state = result.status === 'fulfilled' ? result.value : null
        if (state?.name) nameCache.set(id, state.name)
        if (archivedIdSet.has(id) || state?.archived) archived.push(id)
        else active.push(id)
      })

      if (token !== loadSequencesToken) return
      applySequenceLists(active, archived)
      persistSequenceList(active, archived)

      const partition = store.getters.tagPartition
      const hierarchy = getCachedTagHierarchy()?.leafToCategory
      await prefetchBatch([...active, ...archived], store.getters.language(), partition, hierarchy)
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
      showError(t('something-went-wrong') || 'Something went wrong')
    } finally {
      archivingSequenceIds.delete(id)
    }
  }

  watch(selectedSequence, async (id) => {
    if (id && archivedSequenceIdSet.value.has(id)) {
      selectedSequence.value = null
      return
    }
    if (id) await loadSequenceItems(id)
  })

  // ── Invalidate name cache on language change ──
  watch(() => store.getters.language(), async (newLang, oldLang) => {
    if (newLang && oldLang && newLang !== oldLang) {
      invalidateNames()
      const allIds = currentContentList.value
      if (allIds.length) {
        await prefetchBatch(allIds, newLang, store.getters.tagPartition, getCachedTagHierarchy()?.leafToCategory)
        notifyTagIndexUpdated()
      }
    }
  })

  // Refresh sequences when my-content list changes (e.g. after Explore prefetch)
  watch(() => myContent.length, () => {
    loadMySequences({ silent: mySequenceIds.value.length > 0 })
  })

  watch(loading, (val) => {
    if (!val) loadMySequences({ silent: mySequenceIds.value.length > 0 })
  })

  // ── Init (favorites — data loading handled by ContentBrowser) ──
  onMounted(async () => {
    loadFavorites().catch(() => {})
    const hadDiskList = await applyCachedSequenceList()
    if (!hadDiskList) seedSequencesFromMetadataCache()
    if (hadDiskList || mySequenceIds.value.length) sequencesLoading.value = false
    loadMySequences({ silent: mySequenceIds.value.length > 0 })
  })
</script>

<style scoped>
.explore-columns {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.sequences-panel {
  width: 264px;
  flex-shrink: 0;
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
}

.content-lib-header {
  padding-bottom: 20px;
  margin-bottom: 22px;
  border-bottom: 1px solid #E2E8F0;
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

/* Empty sequence state */
.empty-sequence-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
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

/* Responsive */
@media (max-width: 1023px) {
  .explore-columns {
    flex-direction: column;
  }
  .sequences-panel {
    width: 100%;
  }
}

@media (max-width: 767px) {
  .sequences-panel {
    display: none;
  }
  .mobile-sequences {
    display: flex;
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
</style>
