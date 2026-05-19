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
        <h2 class="text-sm font-semibold text-zinc-950">{{ t('my-sequences') }} ({{ mySequenceIds.length }})</h2>
        <p class="text-xs text-slate-500 mt-0.5">{{ t('organize-content-into-learning-sequences') }}</p>
        <button class="mobile-seq-selector" @click="mobileSeqExpanded = !mobileSeqExpanded">
          <span class="mobile-seq-selector-name">
            {{ selectedSequenceName || t('select-a-sequence') }}
          </span>
          <LucideIcon :name="mobileSeqExpanded ? 'chevron-up' : 'chevron-down'" :size="12" class="text-slate-400" />
        </button>
        <div v-if="mobileSeqExpanded" class="mobile-seq-list">
          <SequenceCard
            v-for="seqId in mySequenceIds"
            :key="seqId"
            :id="seqId"
            :active="selectedSequence === seqId"
            :isNewest="newestSequenceId === seqId"
            :version="sequenceVersion"
            @select="selectSequence(seqId); mobileSeqExpanded = false"
            @edit="editSequence(seqId)"
            @delete="sequenceToDelete = seqId"
            @archive="archiveSequence(seqId)"
            @preview="sequenceToPreview = seqId"
            @drop-item="itemId => addItemsToSequence(seqId, [itemId])"
          />
          <div v-if="!loading && !mySequenceIds.length" class="text-xs text-slate-400 text-center py-4">
            {{ t('no-sequences-yet') }}
          </div>
        </div>
      </div>
    </div>

    <div class="explore-columns">
      <!-- Left panel: My sequences (desktop) -->
      <aside class="sequences-panel">
        <div class="sequences-card">
          <h2 class="text-base font-semibold text-zinc-950">{{ t('my-sequences') }} ({{ mySequenceIds.length }})</h2>
          <p class="text-sm text-slate-500 mt-1">{{ t('organize-content-into-learning-sequences') }}</p>
          <PButton
            variant="primary"
            icon="lucide:plus"
            :text="t('new-sequence')"
            class="mt-3 w-full"
            @click="showCreateSequence = true"
          />

          <!-- Sequence cards -->
          <div class="mt-4 flex flex-col gap-3">
            <SequenceCard
              v-for="seqId in mySequenceIds"
              :key="seqId"
              :id="seqId"
              :active="selectedSequence === seqId"
              :isNewest="newestSequenceId === seqId"
              :version="sequenceVersion"
              @select="selectSequence(seqId)"
              @edit="editSequence(seqId)"
              @delete="sequenceToDelete = seqId"
              @archive="archiveSequence(seqId)"
              @preview="sequenceToPreview = seqId"
              @drop-item="itemId => addItemsToSequence(seqId, [itemId])"
            />
          </div>

          <!-- Empty state -->
          <div v-if="!loading && !mySequenceIds.length" class="mt-4 text-xs text-slate-400 text-center py-6">
            {{ t('no-sequences-yet') }}
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
          :extra-filter="sequenceFilterFn"
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
              :selected="selfSelected === id"
              :checked="selectedItems.has(id)"
              :removable="myContent.includes(id)"
              :source="source"
              :grades="grades"
              :favorited="favorites.has(id)"
              @click="() => {
                if (selfSelected === id) selfSelected = null
                else selfSelected = id
                $emit('select', selfSelected)
              }"
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

    <!-- Metadata side panel -->
    <div
      v-if="selfSelected"
      class="metadata-panel"
    >
      <ContentMetadataPanel
        :key="selfSelected"
        @back="selfSelected = null"
        :id="selfSelected"
        :partition="partition"
      />
    </div>

    <!-- Create/Edit Sequence Modal -->
    <CreateSequenceModal
      v-if="showCreateSequence || sequenceToEdit"
      :id="sequenceToEdit"
      @close="showCreateSequence = false; sequenceToEdit = null"
      @created="onSequenceCreated"
      @updated="onSequenceUpdated"
    />

    <!-- Delete Confirmation -->
    <PAlertDialog
      v-if="sequenceToDelete"
      variant="error"
      :title="t('delete-sequence')"
      :description="sequenceToDeleteName ? `Are you sure you want to delete &quot;${sequenceToDeleteName}&quot;? This action cannot be undone.` : t('this-will-permanently-delete-the-sequence-and-cannot-be-undone')"
      :confirmText="t('delete-sequence')"
      :cancelText="t('cancel')"
      @confirm="confirmDeleteSequence"
      @cancel="sequenceToDelete = null"
    />

    <!-- Success Confirmation -->
    <PAlertDialog
      v-if="successDialog.show"
      variant="success"
      :title="successDialog.message"
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
    <CreateAssignmentModal
      v-if="showCreateAssignment"
      :contentIds="createAssignmentContentIds"
      @close="showCreateAssignment = false; createAssignmentContentIds = []"
      @created="showSuccessDialog(t('assignment-created-successfully'))"
    />

    <!-- Add item/sequence picker -->
    <PModal
      v-if="showAddPicker"
      :title="addPickerStep === 'choose' ? t('add-item-or-sequence') : addPickerStep === 'sequence' ? t('add-to-sequence') : t('add-to-assignment')"
      width="520px"
      @close="closeAddPicker"
    >
      <template #body>
        <!-- Step 1: Choose type -->
        <div v-if="addPickerStep === 'choose'">
          <p class="text-sm text-slate-500 mb-4">{{ t('add-picker-description') }}</p>
          <div class="add-picker-cards">
            <button class="add-picker-card" @click="addPickerStep = 'assignment'">
              <LucideIcon name="clipboard-list" :size="24" class="add-picker-card-icon" />
              <span class="add-picker-card-label">{{ t('add-to-assignment') }}</span>
            </button>
            <button class="add-picker-card" @click="addPickerStep = 'sequence'">
              <LucideIcon name="layers" :size="24" class="add-picker-card-icon" />
              <span class="add-picker-card-label">{{ t('add-to-sequence') }}</span>
            </button>
          </div>
        </div>

        <!-- Step 2a: Choose sequence -->
        <div v-else-if="addPickerStep === 'sequence'">
          <p class="text-sm text-slate-500 mb-4">{{ t('choose-sequence-to-add') }}:</p>
          <div class="flex flex-col gap-2">
            <button
              v-for="seqId in mySequenceIds"
              :key="seqId"
              class="add-picker-option"
              @click="addItemsToSequence(seqId, pendingAddItems)"
            >
              <LucideIcon name="layers" :size="14" class="text-primary-600" />
              <SequenceName :id="seqId" />
            </button>
            <button class="add-picker-option add-picker-new" @click="closeAddPicker(); showCreateSequence = true">
              <LucideIcon name="plus" :size="14" class="text-primary-600" />
              <span>{{ t('create-new-sequence') }}</span>
            </button>
          </div>
        </div>

        <!-- Step 2b: Choose assignment -->
        <div v-else-if="addPickerStep === 'assignment'">
          <p class="text-sm text-slate-500 mb-4">{{ t('choose-assignment-or-create') }}:</p>
          <div class="flex flex-col gap-2">
            <button class="add-picker-option add-picker-new" @click="navigateToCreateAssignment">
              <LucideIcon name="plus" :size="14" class="text-primary-600" />
              <span>{{ t('create-new-assignment') }}</span>
            </button>
          </div>
        </div>
      </template>

      <template v-if="addPickerStep !== 'choose'" #footer>
        <PButton variant="ghost" :text="t('back')" icon="lucide:chevron-left" @click="addPickerStep = 'choose'" />
      </template>
    </PModal>
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
  import SequenceName from './sequence-name.vue'
  import CopyModifyModal from './copy-modify-modal.vue'
  import CreateAssignmentModal from './create-assignment-modal.vue'
  import LucideIcon from '@/components/ui/LucideIcon.vue'
  import setTagging from '@/utils/set-tagging.js'
  import { MY_CONTENT_TAG } from '@/utils/constants.js'
  import {
    nameCache, metadataCache,
    getCachedTagHierarchy, prefetchBatch, invalidateNames,
  } from '@/utils/content-cache.js'
  import { useContentLibrary } from '@/utils/useContentLibrary.js'
  import { PButton, PCheckbox, PAlertDialog, PModal } from '@/components/ui/index.js'
  import { useSuccessDialog } from '@/utils/useSuccessDialog.js'

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
  const selfSelected = ref(null)
  const previewing = ref(null)
  const { successDialog, showSuccessDialog, dismissSuccessDialog } = useSuccessDialog()

  // ── Selection state ──
  const selectedItems = shallowReactive(new Set())

  // ── Sequence state ──
  const mobileSeqExpanded = ref(false)
  const mySequenceIds = ref([])
  const sequenceVersion = ref(0)
  const selectedSequence = ref(null)
  const showCreateSequence = ref(false)
  const sequenceToEdit = ref(null)
  const sequenceToDelete = ref(null)
  const sequenceToDeleteName = ref('')
  const sequenceToPreview = ref(null)
  const selectedSequenceEmpty = ref(true)
  const selectedSequenceItems = ref([])
  const newestSequenceId = ref(null)

  // ── Copy & modify state ──
  const copyModifyId = ref(null)

  // ── Create assignment state ──
  const showCreateAssignment = ref(false)
  const createAssignmentContentIds = ref([])

  function handleCopyModify(id) {
    copyModifyId.value = id
  }

  function onCopyModifyCreated(id) {
    if (!myContent.includes(id)) myContent.push(id)
    copyModifyId.value = null
    showSuccessDialog(t('content-copied-successfully'))
  }

  // ── Add picker state ──
  const showAddPicker = ref(false)
  const pendingAddItems = ref([])
  const addPickerStep = ref('choose')

  // ── Favorites state ──
  const favorites = reactive(new Set())
  let favoritesState = null

  async function loadFavorites() {
    favoritesState = await Agent.state('my-favorites')
    if (favoritesState && Array.isArray(favoritesState.items)) {
      favoritesState.items.forEach(id => favorites.add(id))
    }
  }

  async function toggleFavorite(id) {
    if (favorites.has(id)) {
      favorites.delete(id)
    } else {
      favorites.add(id)
    }
    if (!favoritesState) favoritesState = await Agent.state('my-favorites')
    favoritesState.items = [...favorites]
  }

  // ── Sequence filter for ContentBrowser ──
  function sequenceFilterFn(list) {
    if (selectedSequence.value && selectedSequenceItems.value.length) {
      const seqItems = new Set(selectedSequenceItems.value)
      return list.filter(id => seqItems.has(id))
    }
    return list
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
    const state = await Agent.state(id)
    const items = state.items || []
    selectedSequenceItems.value = items
    selectedSequenceEmpty.value = items.length === 0
  }

  function editSequence(id) {
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

  async function archiveSequence(id) {
    const state = await Agent.state(id)
    state.archived = true
    await Agent.synced()
    mySequenceIds.value = mySequenceIds.value.filter(s => s !== id)
    if (selectedSequence.value === id) selectedSequence.value = null
    showSuccessDialog(t('sequence-archived'))
  }

  async function confirmDeleteSequence() {
    const id = sequenceToDelete.value
    if (!id) return
    const state = await Agent.state(id)
    state.archived = true
    await Agent.synced()
    mySequenceIds.value = mySequenceIds.value.filter(s => s !== id)
    if (selectedSequence.value === id) selectedSequence.value = null
    sequenceToDelete.value = null
    sequenceToDeleteName.value = ''
    showSuccessDialog(t('sequence-deleted'))
  }

  watch(sequenceToDelete, async (id) => {
    if (!id) { sequenceToDeleteName.value = ''; return }
    const state = await Agent.state(id)
    sequenceToDeleteName.value = state?.name || ''
  })

  // ── Add to sequence/assignment ──
  function closeAddPicker() {
    showAddPicker.value = false
    pendingAddItems.value = []
    addPickerStep.value = 'choose'
  }

  function openAddPicker(itemIds) {
    pendingAddItems.value = itemIds
    addPickerStep.value = 'choose'
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
    showCreateAssignment.value = true
  }

  async function addItemsToSequence(sequenceId, itemIds) {
    const state = await Agent.state(sequenceId)
    if (!state.items) state.items = []
    for (const id of itemIds) {
      if (!state.items.includes(id)) {
        state.items.push(id)
      }
    }
    await Agent.synced()
    showAddPicker.value = false
    pendingAddItems.value = []
    deselectAll()
    if (selectedSequence.value === sequenceId) {
      selectedSequenceEmpty.value = false
      selectedSequenceItems.value = state.items || []
    }
    sequenceVersion.value++
    showSuccessDialog(itemIds.length + ' ' + t('items-added-to-sequence'))
  }

  function loadMySequences() {
    const sequenceIds = []
    for (const id of myContent) {
      const meta = metadataCache.get(id)
      if (meta?.active_type === 'application/json;type=sequence') {
        sequenceIds.push(id)
      }
    }
    mySequenceIds.value = sequenceIds
  }

  watch(selectedSequence, async (id) => {
    if (id) await loadSequenceItems(id)
  })

  // ── Invalidate name cache on language change ──
  watch(() => store.getters.language(), async (newLang, oldLang) => {
    if (newLang && oldLang && newLang !== oldLang) {
      invalidateNames()
      const allIds = currentContentList.value
      if (allIds.length) {
        await prefetchBatch(allIds, newLang, store.getters.tagPartition, getCachedTagHierarchy()?.leafToCategory)
      }
    }
  })

  // ── Load sequences once content data is ready ──
  watch(loading, (val) => {
    if (!val) loadMySequences()
  })

  // ── Init (favorites — data loading handled by ContentBrowser) ──
  onMounted(() => {
    loadFavorites().catch(() => {})
    if (!loading.value) loadMySequences()
  })
</script>

<style scoped>
.explore-columns {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.sequences-panel {
  width: 247px;
  flex-shrink: 0;
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



/* Add picker cards */
.add-picker-cards {
  display: flex;
  gap: 12px;
}
.add-picker-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 150ms;
}
.add-picker-card:hover {
  border-color: #2563eb;
  background: #eff6ff;
}
.add-picker-card-icon {
  color: #2563eb;
}
.add-picker-card-label {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

/* Add picker list options */
.add-picker-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  color: #334155;
  text-align: left;
  transition: all 150ms;
}
.add-picker-option:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}
.add-picker-new {
  border-style: dashed;
  color: #2563eb;
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
