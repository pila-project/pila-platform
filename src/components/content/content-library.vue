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
              <p class="text-xs text-slate-500 mt-1">{{ t('discover-customise-and-add-content') }}</p>
            </div>
            <PButton
              v-if="selectedItems.size"
              variant="primary"
              icon="lucide:plus"
              :text="t('add-selected') + ' (' + selectedItems.size + ')'"
              @click="addSelectedToSequence"
            />
          </div>
        </div>

        <!-- Search + Show tabs -->
        <div class="explore-toolbar">
          <PUnifiedFilter
            v-model:searchQuery="searchQuery"
            :placeholder="t('search-content-title')"
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

          <div class="toolbar-group">
            <span class="toolbar-label">{{ t('show') }}:</span>
            <PTabs v-model="activeShowTab" :tabs="showTabs" />
          </div>
        </div>

        <!-- Selection toolbar -->
        <div v-if="selectedItems.size" class="selection-toolbar">
          <PCheckbox
            :modelValue="allSelected"
            @update:modelValue="toggleSelectAll"
          />
          <span class="selection-count">{{ selectedItems.size }} {{ t('items-selected') }}</span>
          <div style="flex:1" />
          <PButton variant="ghost" size="sm" :text="t('deselect-all')" @click="deselectAll" />
          <PButton
            variant="primary"
            size="sm"
            icon="lucide:plus"
            :text="t('add-selected') + ' (' + selectedItems.size + ')'"
            @click="addSelectedToSequence"
          />
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

        <!-- Content grid -->
        <div v-else-if="loading" class="py-8 text-center text-slate-500">
          <LucideIcon name="loader-2" :size="14" :spin="true" class="inline mr-2" />{{ t('loading') }}...
        </div>
        <NoResultsFound v-else-if="!filteredContentList.length" />

        <!-- Content grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div
            v-for="(id, index) in paginatedContentList"
            :key="id + index"
          >
            <TaggedContentCard
              :id="id"
              :selected="selfSelected === id"
              :checked="selectedItems.has(id)"
              :removable="myContent.includes(id)"
              :source="myContent.includes(id) ? 'mine' : 'pila'"
              :grades="getItemTagLabels(id)"
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
          </div>
        </div>

        <!-- Pagination -->
        <PPagination
          v-if="filteredContentList.length > contentPerPage"
          :totalItems="filteredContentList.length"
          :currentPage="contentPage"
          :perPage="contentPerPage"
          :perPageOptions="[12, 24, 48]"
          @update:currentPage="contentPage = $event"
          @update:perPage="contentPerPage = $event; contentPage = 1"
        />


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
      :title="t('confirm-delete-sequence')"
      :description="t('delete-sequence-warning')"
      :confirmText="t('delete')"
      :cancelText="t('cancel')"
      @confirm="confirmDeleteSequence"
      @cancel="sequenceToDelete = null"
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
      @created="showSuccess(t('assignment-created-successfully'))"
    />

    <!-- Add item/sequence picker -->
    <PModal
      v-if="showAddPicker"
      :title="addPickerStep === 'choose' ? t('add-item-or-sequence') : addPickerStep === 'sequence' ? t('add-to-sequence') : t('add-to-assignment')"
      width="480px"
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
  import { ref, reactive, computed, watch, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import { useRouter } from 'vue-router'
  import ContentMetadataPanel from './content-metadata-panel.vue'
  import NoResultsFound from '@/components/common/no-results-found.vue'
  import TaggedContentCard from '@/components/tags/tagged-content-card.vue'
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
    getContentName, getContentMetadata, getContentTags, getTagName,
    nameCache, metadataCache, tagCache, tagNameCache,
    loadTagHierarchy, getCachedTagHierarchy,
    prefetchBatch, invalidate, invalidateNames,
  } from '@/utils/content-cache.js'
  import { PButton, PCheckbox, PAlert, PAlertDialog, PModal, PTabs, PPagination, PUnifiedFilter, PUnifiedFilterSection } from '@/components/ui/index.js'
  import { useToast } from '@/utils/useToast.js'

  const store = useStore()
  const router = useRouter()
  function t(slug) { return store.getters.t(slug) }

  const partition = store.getters.tagPartition
  const tag = '1a53db50-e248-11ee-ab5f-07f4a7408770'
  const competencyTag = 'f760dad0-f133-11ee-804e-27f76a81958c'
  const user = ref(null)

  // ── Core state ──
  const loading = ref(true)
  const taggedContent = ref([])
  const selfSelected = ref(null)
  const previewing = ref(null)
  const searchQuery = ref('')
  const activeShowTab = ref('all')
  const { success: showSuccess } = useToast()

  // ── Pagination state ──
  const contentPage = ref(1)
  const contentPerPage = ref(12)

  // ── Filter state ──
  const activeFilters = reactive({})

  // ── Tag hierarchy (view-local ref, populated from cache) ──
  const tagCategories = ref([])

  // ── Selection state ──
  const selectedItems = reactive(new Set())

  // ── Sequence state ──
  const mobileSeqExpanded = ref(false)
  const mySequenceIds = ref([])
  const sequenceVersion = ref(0) // bump to force SequenceCard re-render
  const selectedSequence = ref(null)
  const showCreateSequence = ref(false)
  const sequenceToEdit = ref(null)
  const sequenceToDelete = ref(null)
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
    showSuccess(t('content-copied-successfully'))
  }

  // ── Add picker state ──
  const showAddPicker = ref(false)
  const pendingAddItems = ref([])
  const addPickerStep = ref('choose') // 'choose' | 'sequence' | 'assignment'

  // ── Show tabs (outside search bar) ──
  const showTabs = computed(() => [
    { label: t('all-content'), key: 'all' },
    { label: t('pila-content'), key: 'pila' },
    { label: t('my-content'), key: 'mine' },
  ])

  // ── Filter definitions (dynamic from tag hierarchy) ──
  const filterDefinitions = computed(() => {
    return tagCategories.value.map(cat => ({
      key: cat.id,
      label: cat.name,
      options: uniqueTagValues(cat.id)
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
        count
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }

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

  // ── Content data ──
  const myContent = reactive([])

  const currentContentList = computed(() => {
    let l = taggedContent.value.map(t => t.target)
    if (activeShowTab.value === 'mine') return [...myContent]
    if (activeShowTab.value === 'pila') return l
    return [...new Set([...l, ...myContent])]
  })

  const filteredContentList = computed(() => {
    let list = currentContentList.value

    // Filter by selected sequence
    if (selectedSequence.value && selectedSequenceItems.value.length) {
      const seqItems = new Set(selectedSequenceItems.value)
      list = list.filter(id => seqItems.has(id))
    }

    // Search by name
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(id => {
        const name = nameCache.get(id)
        return name ? name.toLowerCase().includes(q) : true
      })
    }

    // Tag-based filters
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

  // Reset page when filters change
  watch([searchQuery, activeShowTab, () => JSON.stringify(activeFilters)], () => {
    contentPage.value = 1
  })

  const selectedSequenceName = computed(() => {
    if (!selectedSequence.value) return ''
    return nameCache.get(selectedSequence.value) || t('untitled')
  })

  const allSelected = computed(() => {
    if (!filteredContentList.value.length) return false
    return filteredContentList.value.every(id => selectedItems.has(id))
  })

  // ── Tag label helpers ──
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

  // ── Selection helpers ──
  function toggleSelection(id) {
    if (selectedItems.has(id)) selectedItems.delete(id)
    else selectedItems.add(id)
  }

  function toggleSelectAll() {
    if (allSelected.value) {
      deselectAll()
    } else {
      filteredContentList.value.forEach(id => selectedItems.add(id))
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
    showSuccess(t('sequence-created-successfully'))
  }

  async function onSequenceUpdated() {
    sequenceToEdit.value = null
    showSuccess(t('sequence-updated'))
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
    showSuccess(t('sequence-deleted'))
  }

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
    // Force sequence cards to re-render so they show the new items
    sequenceVersion.value++
    showSuccess(itemIds.length + ' ' + t('items-added-to-sequence'))
  }

  // ── Data loading (cache-backed) ──
  async function loadContentData() {
    loading.value = true

    // Load tag hierarchy (cached — instant on revisit)
    const hierarchy = await loadTagHierarchy(partition, competencyTag)
    tagCategories.value = hierarchy.categories
    for (const cat of hierarchy.categories) {
      if (!activeFilters[cat.id]) activeFilters[cat.id] = []
    }

    // Fetch tagged content list (lightweight — just IDs)
    const result = await Agent.query('taggings-for-tag', [partition, tag], 'tags.knowlearning.systems')
    taggedContent.value = result

    // Build all content IDs set
    const allIds = [...new Set([...result.map(t => t.target), ...myContent])]

    // Batch prefetch names, metadata, images, tags (cache-first — instant on revisit)
    await prefetchBatch(allIds, store.getters.language(), partition, hierarchy.leafToCategory)

    // Load sequences
    loadMySequences()

    loading.value = false
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

  // ── Watch selected sequence ──
  watch(selectedSequence, async (id) => {
    if (id) await loadSequenceItems(id)
  })

  // ── Invalidate name cache on language change ──
  watch(() => store.getters.language(), async (newLang, oldLang) => {
    if (newLang && oldLang && newLang !== oldLang) {
      invalidateNames()
      const allIds = currentContentList.value
      if (allIds.length) {
        await prefetchBatch(allIds, newLang, partition, getCachedTagHierarchy()?.leafToCategory)
      }
    }
  })

  // ── Init (all async calls go here, no top-level await) ──
  onMounted(async () => {
    try {
      const env = await Agent.environment()
      user.value = env.auth.user

      // Load my content
      const myContentResult = await Agent.query(
        'taggings-for-tag', [user.value, MY_CONTENT_TAG], 'tags.knowlearning.systems'
      ).catch(() => [])
      myContentResult.forEach(t => myContent.push(t.target))

      // Load favorites
      loadFavorites().catch(() => {})

      // Load main content data (includes tag hierarchy)
      await loadContentData()
    } catch (e) {
      console.error('[content-library] init error:', e)
      loading.value = false
    }
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

/* Explore toolbar */
.explore-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.explore-toolbar :deep(.unified-filter) {
  flex: 1;
  min-width: 0;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}


.toolbar-label {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  white-space: nowrap;
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
  .explore-toolbar {
    flex-direction: column;
    align-items: stretch;
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
