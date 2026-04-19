<template>
  <div class="page-container explore-page">
    <h1 class="page-heading explore-heading capitalize">{{ t('explore') }}</h1>

    <!-- Mobile: inline sequence section -->
    <div class="mobile-sequences">
      <PButton
        variant="primary"
        icon="fa-solid fa-plus"
        text="New sequence"
        class="w-full"
        @click="showCreateSequence = true"
      />
      <div class="mobile-seq-section">
        <h2 class="text-sm font-semibold text-zinc-950">My sequences ({{ mySequenceIds.length }})</h2>
        <p class="text-xs text-slate-500 mt-0.5">Organize content into learning sequences</p>
        <button class="mobile-seq-selector" @click="mobileSeqExpanded = !mobileSeqExpanded">
          <span class="mobile-seq-selector-name">
            {{ selectedSequenceName || 'Select a sequence' }}
          </span>
          <i :class="mobileSeqExpanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="text-xs text-slate-400" />
        </button>
        <div v-if="mobileSeqExpanded" class="mobile-seq-list">
          <SequenceCard
            v-for="seqId in mySequenceIds"
            :key="seqId + '-' + sequenceVersion"
            :id="seqId"
            :active="selectedSequence === seqId"
            :isNewest="newestSequenceId === seqId"
            @select="selectSequence(seqId); mobileSeqExpanded = false"
            @edit="editSequence(seqId)"
            @delete="sequenceToDelete = seqId"
            @preview="sequenceToPreview = seqId"
            @drop-item="itemId => addItemsToSequence(seqId, [itemId])"
          />
          <div v-if="!loading && !mySequenceIds.length" class="text-xs text-slate-400 text-center py-4">
            No sequences yet
          </div>
        </div>
      </div>
    </div>

    <div class="explore-columns">
      <!-- Left panel: My sequences (desktop) -->
      <aside class="sequences-panel">
        <div class="sequences-card">
          <h2 class="text-base font-semibold text-zinc-950">My sequences ({{ mySequenceIds.length }})</h2>
          <p class="text-sm text-slate-500 mt-1">Organize content into learning sequences</p>
          <PButton
            variant="primary"
            icon="fa-solid fa-plus"
            text="New sequence"
            class="mt-3 w-full"
            @click="showCreateSequence = true"
          />

          <!-- Sequence cards -->
          <div class="mt-4 flex flex-col gap-3">
            <SequenceCard
              v-for="seqId in mySequenceIds"
              :key="seqId + '-' + sequenceVersion"
              :id="seqId"
              :active="selectedSequence === seqId"
              :isNewest="newestSequenceId === seqId"
              @select="selectSequence(seqId)"
              @edit="editSequence(seqId)"
              @delete="sequenceToDelete = seqId"
              @preview="sequenceToPreview = seqId"
              @drop-item="itemId => addItemsToSequence(seqId, [itemId])"
            />
          </div>

          <!-- Empty state -->
          <div v-if="!loading && !mySequenceIds.length" class="mt-4 text-xs text-slate-400 text-center py-6">
            No sequences yet
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
                <i class="fa-solid fa-clipboard-list text-primary-600" />
                Explore content library
              </h2>
              <p class="text-xs text-slate-500 mt-1">Discover, customise, and add content to your assignments</p>
            </div>
            <PButton
              v-if="selectedItems.size"
              variant="primary"
              icon="fa-solid fa-plus"
              :text="`Add selected (${selectedItems.size})`"
              @click="addSelectedToSequence"
            />
          </div>
        </div>

        <!-- Desktop: Search bar with popular tags -->
        <div class="desktop-search search-wrapper mb-3 max-w-sm" ref="searchWrapperRef">
          <PInput
            v-model="searchQuery"
            placeholder="Search content title"
            icon="fa-solid fa-magnifying-glass"
            @focus="showSearchDropdown = true"
          />
          <div v-if="showSearchDropdown && popularTags.length && !searchQuery" class="search-dropdown">
            <div class="search-dropdown-header">Popular tags</div>
            <button
              v-for="tag in popularTags"
              :key="tag.key + ':' + tag.value"
              class="search-dropdown-item"
              @mousedown.prevent="applyPopularTag(tag)"
            >
              <span class="search-dropdown-tag">{{ tag.label }}</span>
              <span class="search-dropdown-count">{{ tag.count }}</span>
            </button>
          </div>
        </div>

        <!-- Mobile: compact toolbar -->
        <div class="mobile-toolbar">
          <!-- Search toggle -->
          <button class="mobile-toolbar-btn" @click="mobileSearchExpanded = !mobileSearchExpanded">
            <i class="fa-solid fa-magnifying-glass" />
          </button>
          <!-- View toggles -->
          <span class="toolbar-label">View as:</span>
          <div class="icon-toggle-container">
            <button class="icon-toggle" :class="{ 'icon-toggle-active': viewMode === 'grid' }" @click="viewMode = 'grid'">
              <i class="fa-solid fa-table-cells" />
            </button>
            <button class="icon-toggle" :class="{ 'icon-toggle-active': viewMode === 'list' }" @click="viewMode = 'list'">
              <i class="fa-solid fa-list" />
            </button>
          </div>
          <!-- Sort -->
          <button class="mobile-toolbar-btn" :class="{ 'mobile-toolbar-btn-active': showMobileSort }" @click="showMobileSort = !showMobileSort">
            <i class="fa-solid fa-sort" /> Sort
          </button>
          <!-- Filter -->
          <button class="mobile-toolbar-btn" :class="{ 'mobile-toolbar-btn-active': hasActiveFilters }" @click="showMobileFilters = true">
            <i class="fa-solid fa-filter" /> Filter
            <span v-if="hasActiveFilters" class="mobile-filter-dot" />
          </button>
        </div>

        <!-- Mobile: expandable search input -->
        <div v-if="mobileSearchExpanded" class="mobile-search-expanded search-wrapper mb-3">
          <PInput
            v-model="searchQuery"
            placeholder="Search"
            icon="fa-solid fa-magnifying-glass"
            autofocus
          />
        </div>

        <!-- Mobile: sort panel -->
        <div v-if="showMobileSort" class="mobile-sort-panel">
          <div class="mobile-sort-group">
            <span class="toolbar-label">Show:</span>
            <PTabs v-model="activeShowTab" :tabs="showTabs" />
          </div>
          <div class="mobile-sort-group">
            <span class="toolbar-label">Type:</span>
            <PTabs v-model="activeTypeTab" :tabs="typeTabs" />
          </div>
        </div>

        <!-- Mobile: filter drawer -->
        <MobileFilterDrawer
          v-if="showMobileFilters"
          :filters="filterDefinitions"
          :activeFilters="activeFilters"
          @close="showMobileFilters = false"
          @update:filter="handleMobileFilterUpdate"
          @reset="resetAllFilters"
        />

        <!-- Desktop: Toolbar: view toggles + content tabs + type tabs -->
        <div class="toolbar-row desktop-toolbar">
          <!-- View toggles -->
          <div class="toolbar-group">
            <span class="toolbar-label">View as:</span>
            <div class="icon-toggle-container">
              <button
                class="icon-toggle"
                :class="{ 'icon-toggle-active': viewMode === 'grid' }"
                @click="viewMode = 'grid'"
              >
                <i class="fa-solid fa-table-cells" />
              </button>
              <button
                class="icon-toggle"
                :class="{ 'icon-toggle-active': viewMode === 'list' }"
                @click="viewMode = 'list'"
              >
                <i class="fa-solid fa-list" />
              </button>
            </div>
          </div>

          <!-- Show tabs -->
          <div class="toolbar-group">
            <span class="toolbar-label">Show:</span>
            <PTabs v-model="activeShowTab" :tabs="showTabs" />
          </div>

          <!-- Type tabs -->
          <div class="toolbar-group">
            <span class="toolbar-label">Type:</span>
            <PTabs v-model="activeTypeTab" :tabs="typeTabs" />
          </div>

          <!-- Select All button -->
          <button
            v-if="filteredContentList.length"
            class="select-all-btn"
            @click="toggleSelectAll"
          >
            {{ allSelected ? 'Deselect All' : 'Select All' }}
          </button>
        </div>

        <!-- Filter chips (desktop only) -->
        <div class="filter-chips-row desktop-toolbar">
          <FilterDropdown
            v-for="f in filterDefinitions"
            :key="f.key"
            :label="f.label"
            :options="f.options"
            :modelValue="activeFilters[f.key] || []"
            @update:modelValue="val => activeFilters[f.key] = val"
          />
        </div>

        <!-- Selection toolbar -->
        <div v-if="selectedItems.size" class="selection-toolbar">
          <PCheckbox
            :modelValue="allSelected"
            @update:modelValue="toggleSelectAll"
          />
          <span class="selection-count">{{ selectedItems.size }} item(s) selected</span>
          <div style="flex:1" />
          <PButton variant="ghost" size="sm" text="Deselect all" @click="deselectAll" />
          <PButton
            variant="primary"
            size="sm"
            icon="fa-solid fa-plus"
            :text="`Add selected (${selectedItems.size})`"
            @click="addSelectedToSequence"
          />
        </div>

        <!-- Empty state: selected sequence with no items -->
        <div v-if="selectedSequence && selectedSequenceEmpty" class="empty-sequence-state">
          <i class="fa-solid fa-magnifying-glass empty-sequence-icon" />
          <h3 class="text-base font-semibold text-zinc-950">No item in this sequence</h3>
          <p class="text-sm text-slate-500 mt-1">Start browsing to add content in this sequence</p>
          <PButton
            variant="primary"
            text="Browse content"
            class="mt-4"
            @click="selectedSequence = null"
          />
        </div>

        <!-- Content grid -->
        <div v-else-if="loading" class="py-8 text-center text-slate-500">
          <i class="fa fa-spinner fa-spin mr-2" />Loading...
        </div>
        <NoResultsFound v-else-if="!filteredContentList.length" />

        <!-- Grid view -->
        <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div
            v-for="(id, index) in filteredContentList"
            :key="id + index"
          >
            <TaggedContentCard
              :id="id"
              :selected="selfSelected === id"
              :checked="selectedItems.has(id)"
              :removable="myContent.includes(id)"
              :source="myContent.includes(id) ? 'mine' : 'pila'"
              :grades="getItemTagLabels(id)"
              @click="() => {
                if (selfSelected === id) selfSelected = null
                else selfSelected = id
                $emit('select', selfSelected)
              }"
              @toggle-select="toggleSelection(id)"
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

        <!-- List view -->
        <div v-else class="content-list-view">
          <ContentListRow
            v-for="(id, index) in filteredContentList"
            :key="id + index"
            :id="id"
            :checked="selectedItems.has(id)"
            :source="myContent.includes(id) ? 'mine' : 'pila'"
            @toggle-select="toggleSelection(id)"
            @preview="previewing = id"
            @add="handleAddItem(id)"
            @click="() => {
              if (selfSelected === id) selfSelected = null
              else selfSelected = id
              $emit('select', selfSelected)
            }"
          />
        </div>

        <!-- Success toast -->
        <Transition name="fade">
          <div v-if="successMessage" class="success-toast">
            <PAlert variant="success" closable @close="successMessage = ''">
              {{ successMessage }}
            </PAlert>
          </div>
        </Transition>

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
        icon="fa-solid fa-plus"
        :text="`Add selected (${selectedItems.size}) to &quot;${selectedSequenceName || 'sequence'}&quot;`"
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
      title="Are you sure you want to delete this sequence?"
      description="This action cannot be undone. All items in the sequence will be removed."
      confirmText="Delete"
      cancelText="Cancel"
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
      @created="showSuccess('Assignment created successfully')"
    />

    <!-- Add item/sequence picker -->
    <PModal
      v-if="showAddPicker"
      :title="addPickerStep === 'choose' ? 'Add item/sequence' : addPickerStep === 'sequence' ? 'Add to sequence' : 'Add to assignment'"
      width="480px"
      @close="closeAddPicker"
    >
      <template #body>
        <!-- Step 1: Choose type -->
        <div v-if="addPickerStep === 'choose'">
          <p class="text-sm text-slate-500 mb-4">Add the selected item/sequence to an existing assignment or create a new assignment.</p>
          <div class="add-picker-cards">
            <button class="add-picker-card" @click="addPickerStep = 'assignment'">
              <i class="fa-solid fa-clipboard-list add-picker-card-icon" />
              <span class="add-picker-card-label">Add to assignment</span>
            </button>
            <button class="add-picker-card" @click="addPickerStep = 'sequence'">
              <i class="fa-solid fa-layer-group add-picker-card-icon" />
              <span class="add-picker-card-label">Add to sequence</span>
            </button>
          </div>
        </div>

        <!-- Step 2a: Choose sequence -->
        <div v-else-if="addPickerStep === 'sequence'">
          <p class="text-sm text-slate-500 mb-4">Choose a sequence to add {{ pendingAddItems.length }} item(s) to:</p>
          <div class="flex flex-col gap-2">
            <button
              v-for="seqId in mySequenceIds"
              :key="seqId"
              class="add-picker-option"
              @click="addItemsToSequence(seqId, pendingAddItems)"
            >
              <i class="fa-solid fa-layer-group text-primary-600" />
              <SequenceName :id="seqId" />
            </button>
            <button class="add-picker-option add-picker-new" @click="closeAddPicker(); showCreateSequence = true">
              <i class="fa-solid fa-plus text-primary-600" />
              <span>Create new sequence</span>
            </button>
          </div>
        </div>

        <!-- Step 2b: Choose assignment -->
        <div v-else-if="addPickerStep === 'assignment'">
          <p class="text-sm text-slate-500 mb-4">Choose an assignment or create a new one:</p>
          <div class="flex flex-col gap-2">
            <button class="add-picker-option add-picker-new" @click="navigateToCreateAssignment">
              <i class="fa-solid fa-plus text-primary-600" />
              <span>Create new assignment</span>
            </button>
          </div>
        </div>
      </template>

      <template v-if="addPickerStep !== 'choose'" #footer>
        <PButton variant="ghost" text="Back" icon="fa-solid fa-chevron-left" @click="addPickerStep = 'choose'" />
      </template>
    </PModal>
  </div>
</template>

<script setup>
  import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
  import { useStore } from 'vuex'
  import { useRouter } from 'vue-router'
  import ContentMetadataPanel from './content-metadata-panel.vue'
  import NoResultsFound from '@/components/common/no-results-found.vue'
  import TaggedContentCard from '@/components/tags/tagged-content-card.vue'
  import ContentListRow from './content-list-row.vue'
  import PreviewModal from '@/components/common/preview-modal.vue'
  import FilterDropdown from './filter-dropdown.vue'
  import SequenceCard from './sequence-card.vue'
  import CreateSequenceModal from './create-sequence-modal.vue'
  import SequencePreviewModal from './sequence-preview-modal.vue'
  import SequenceName from './sequence-name.vue'
  import CopyModifyModal from './copy-modify-modal.vue'
  import CreateAssignmentModal from './create-assignment-modal.vue'
  import MobileFilterDrawer from './mobile-filter-drawer.vue'
  import setTagging from '@/utils/set-tagging.js'
  import getName from '@/utils/name-and-translation-for-content.js'
  import { MY_CONTENT_TAG } from '@/utils/constants.js'
  import { PInput, PButton, PCheckbox, PAlert, PAlertDialog, PModal, PTabs } from '@/components/ui/index.js'

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
  const viewMode = ref('grid')
  const activeShowTab = ref('all')
  const activeTypeTab = ref('all')
  const successMessage = ref('')

  // ── Filter state ──
  const activeFilters = reactive({})
  const nameCache = reactive(new Map())
  const itemTypeCache = reactive(new Map())
  const itemTags = reactive(new Map())

  // ── Tag hierarchy (loaded from backend) ──
  const tagCategories = ref([])            // [{ id, name, leafIds }]
  const tagNameCache = reactive(new Map()) // tagUUID → resolved name
  const leafToCategory = reactive(new Map()) // leafUUID → categoryUUID

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
    showSuccess('Content successfully copied and modified')
  }

  // ── Add picker state ──
  const showAddPicker = ref(false)
  const pendingAddItems = ref([])
  const addPickerStep = ref('choose') // 'choose' | 'sequence' | 'assignment'

  const showTabs = [
    { label: 'All content', key: 'all' },
    { label: 'PILA content', key: 'pila' },
    { label: 'My content', key: 'mine' },
  ]

  const typeTabs = [
    { label: 'All', key: 'all' },
    { label: 'Items', key: 'items' },
    { label: 'Sequences', key: 'sequences' },
  ]

  // ── Mobile toolbar state ──
  const showMobileSort = ref(false)
  const showMobileFilters = ref(false)
  const mobileSearchExpanded = ref(false)

  const hasActiveFilters = computed(() => {
    return Object.values(activeFilters).some(v => v && v.length > 0)
  })

  function handleMobileFilterUpdate(key, values) {
    activeFilters[key] = values
  }

  function resetAllFilters() {
    for (const key of Object.keys(activeFilters)) {
      activeFilters[key] = []
    }
    showMobileFilters.value = false
  }

  // ── Search dropdown ──
  const showSearchDropdown = ref(false)
  const searchWrapperRef = ref(null)

  const popularTags = computed(() => {
    const allTags = []
    for (const cat of tagCategories.value.slice(0, 3)) {
      for (const opt of uniqueTagValues(cat.id).slice(0, 5)) {
        allTags.push({ key: cat.id, value: opt.value, label: `${cat.name}: ${opt.label}`, count: opt.count })
      }
    }
    return allTags.sort((a, b) => b.count - a.count).slice(0, 10)
  })

  function applyPopularTag(tag) {
    if (!activeFilters[tag.key]) activeFilters[tag.key] = []
    if (!activeFilters[tag.key].includes(tag.value)) {
      activeFilters[tag.key] = [...(activeFilters[tag.key] || []), tag.value]
    }
    showSearchDropdown.value = false
  }

  function closeSearchDropdown(e) {
    if (searchWrapperRef.value && !searchWrapperRef.value.contains(e.target)) {
      showSearchDropdown.value = false
    }
  }

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
    for (const [, tags] of itemTags) {
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

    // Search by name
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(id => {
        const name = nameCache.get(id)
        return name ? name.toLowerCase().includes(q) : true
      })
    }

    // Type filter
    if (activeTypeTab.value !== 'all') {
      list = list.filter(id => {
        const type = itemTypeCache.get(id)
        if (activeTypeTab.value === 'sequences') return type === 'sequence'
        return type !== 'sequence'
      })
    }

    // Tag-based filters
    for (const [key, selected] of Object.entries(activeFilters)) {
      if (selected && selected.length) {
        list = list.filter(id => {
          const tags = itemTags.get(id)
          if (!tags || !tags[key]) return false
          const vals = Array.isArray(tags[key]) ? tags[key] : [tags[key]]
          return selected.some(v => vals.includes(v))
        })
      }
    }

    return list
  })

  const selectedSequenceName = computed(() => {
    if (!selectedSequence.value) return ''
    return nameCache.get(selectedSequence.value) || 'Untitled'
  })

  const allSelected = computed(() => {
    if (!filteredContentList.value.length) return false
    return filteredContentList.value.every(id => selectedItems.has(id))
  })

  // ── Tag label helpers ──
  function getItemTagLabels(id) {
    const tags = itemTags.get(id) || {}
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
    } else {
      selectedSequence.value = id
      checkSequenceEmpty(id)
    }
  }

  async function checkSequenceEmpty(id) {
    const state = await Agent.state(id)
    selectedSequenceEmpty.value = !state.items || state.items.length === 0
  }

  function editSequence(id) {
    sequenceToEdit.value = id
  }

  async function onSequenceCreated(id) {
    if (!myContent.includes(id)) myContent.push(id)
    itemTypeCache.set(id, 'sequence')
    mySequenceIds.value.unshift(id)
    newestSequenceId.value = id
    showCreateSequence.value = false
    showSuccess('Sequence created successfully')
  }

  async function onSequenceUpdated() {
    sequenceToEdit.value = null
    showSuccess('Sequence updated')
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
    showSuccess('Sequence deleted')
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
    }
    // Force sequence cards to re-render so they show the new items
    sequenceVersion.value++
    showSuccess(`${itemIds.length} item(s) added to sequence`)
  }

  // ── Toast ──
  function showSuccess(msg) {
    successMessage.value = msg
    setTimeout(() => successMessage.value = '', 3000)
  }

  // ── Tag hierarchy loading ──
  async function resolveTagName(tagId) {
    if (tagNameCache.has(tagId)) return tagNameCache.get(tagId)
    try {
      const { name } = await Agent.state(tagId)
      tagNameCache.set(tagId, name || tagId.slice(0, 8))
      return name || tagId.slice(0, 8)
    } catch {
      tagNameCache.set(tagId, tagId.slice(0, 8))
      return tagId.slice(0, 8)
    }
  }

  async function loadTagHierarchy() {
    const cats = await Agent.query(
      'taggings-targeting-tags', [partition, competencyTag], 'tags.knowlearning.systems'
    ).catch(() => [])

    const categories = []
    for (const cat of cats) {
      const catId = cat.target
      const catName = await resolveTagName(catId)

      const leaves = await Agent.query(
        'taggings-targeting-tags', [partition, catId], 'tags.knowlearning.systems'
      ).catch(() => [])

      const leafIds = leaves.map(l => l.target)

      await Promise.allSettled(
        leafIds.map(async (leafId) => {
          leafToCategory.set(leafId, catId)
          await resolveTagName(leafId)
        })
      )

      categories.push({ id: catId, name: catName, leafIds })
    }

    tagCategories.value = categories
  }

  // ── Data loading ──
  async function loadContentData() {
    loading.value = true

    // Load tag hierarchy first so we can map per-item tags to categories
    await loadTagHierarchy()

    // Fetch tagged content
    const result = await Agent.query('taggings-for-tag', [partition, tag], 'tags.knowlearning.systems')
    taggedContent.value = result

    // Build all content IDs set
    const allIds = [...new Set([...result.map(t => t.target), ...myContent])]

    // Load names, types, and tags in parallel batches
    const loadPromises = allIds.map(async (id) => {
      try {
        // Load name
        const name = await getName(id, store.getters.language())
        if (name) nameCache.set(id, name)

        // Load type (item vs sequence)
        const metadata = await Agent.metadata(id)
        if (metadata.active_type === 'application/json;type=sequence') {
          itemTypeCache.set(id, 'sequence')
        } else {
          itemTypeCache.set(id, 'item')
        }

        // Load tags for this item, mapped to categories
        const tagData = await Agent.query(
          'taggings-for-target', [partition, id], 'tags.knowlearning.systems'
        ).catch(() => [])

        if (tagData.length) {
          const tags = {}
          for (const t of tagData) {
            const catId = leafToCategory.get(t.tag)
            if (catId) {
              if (!tags[catId]) tags[catId] = []
              if (!tags[catId].includes(t.tag)) tags[catId].push(t.tag)
            }
          }
          itemTags.set(id, tags)
        }
      } catch (e) {
        // Silently skip items that fail to load
      }
    })

    await Promise.allSettled(loadPromises)

    // Load sequences
    await loadMySequences()

    loading.value = false
  }

  async function loadMySequences() {
    const sequenceIds = []
    for (const id of myContent) {
      const type = itemTypeCache.get(id)
      if (type === 'sequence') {
        sequenceIds.push(id)
      }
    }
    mySequenceIds.value = sequenceIds
  }

  // ── Watch selected sequence ──
  watch(selectedSequence, async (id) => {
    if (id) await checkSequenceEmpty(id)
  })

  // ── Lifecycle ──
  onMounted(() => document.addEventListener('click', closeSearchDropdown))
  onBeforeUnmount(() => document.removeEventListener('click', closeSearchDropdown))

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

/* Search dropdown */
.search-wrapper {
  position: relative;
}
.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 30;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  margin-top: 4px;
  overflow: hidden;
}
.search-dropdown-header {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.05em;
}
.search-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 100ms;
}
.search-dropdown-item:hover {
  background: #f8fafc;
}
.search-dropdown-tag {
  font-size: 13px;
  color: #334155;
}
.search-dropdown-count {
  font-size: 12px;
  color: #94a3b8;
}

/* Toolbar */
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-label {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  white-space: nowrap;
}

.icon-toggle-container {
  display: flex;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.icon-toggle {
  padding: 6px 10px;
  background: white;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 14px;
  transition: all 150ms;
}
.icon-toggle:not(:last-child) {
  border-right: 1px solid #e2e8f0;
}
.icon-toggle-active {
  background: #eff6ff;
  color: #2563eb;
}


.select-all-btn {
  margin-left: auto;
  padding: 6px 14px;
  border: 1px solid #2563eb;
  border-radius: 6px;
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: #2563eb;
  cursor: pointer;
  transition: all 150ms;
  white-space: nowrap;
}
.select-all-btn:hover {
  background: #eff6ff;
}

/* Filter chips row */
.filter-chips-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
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

.empty-sequence-icon {
  font-size: 48px;
  color: #cbd5e1;
  margin-bottom: 16px;
}

/* List view */
.content-list-view {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: #e2e8f0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

/* Success toast */
.success-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 60;
  min-width: 280px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
  font-size: 24px;
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

/* Mobile toolbar (hidden on desktop) */
.mobile-toolbar {
  display: none;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.mobile-toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  position: relative;
}
.mobile-toolbar-btn:hover {
  background: #f8fafc;
}
.mobile-toolbar-btn-active {
  border-color: #2563eb;
  color: #2563eb;
}
.mobile-filter-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2563eb;
}
.mobile-search-expanded {
  display: none;
}
.mobile-sort-panel {
  display: none;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 12px;
}
.mobile-sort-group {
  display: flex;
  align-items: center;
  gap: 8px;
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
  .toolbar-row {
    gap: 8px;
  }
  .filter-chips-row {
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;
  }
}

@media (max-width: 767px) {
  .sequences-panel {
    display: none;
  }
  .mobile-sequences {
    display: flex;
  }
  .desktop-search {
    display: none;
  }
  .desktop-toolbar {
    display: none !important;
  }
  .mobile-toolbar {
    display: flex;
  }
  .mobile-search-expanded {
    display: block;
  }
  .mobile-sort-panel {
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
