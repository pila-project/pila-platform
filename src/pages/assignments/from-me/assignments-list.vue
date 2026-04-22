<template>
  <div class="page-container assign-page">
    <h1 class="page-heading assign-heading capitalize">{{ t('assign-and-monitor') }}</h1>

    <div class="content-card assign-card">
      <!-- Card header -->
      <div class="assign-card-header">
        <div class="assign-card-title-row">
          <div>
            <h2 class="card-section-title flex items-center gap-2">
              <i class="fa-solid fa-clipboard-list text-primary-600" />
              <span class="capitalize">{{ t('assignments') }}</span>
            </h2>
            <p class="card-section-subtitle">Create and manage assignments for your students</p>
          </div>
          <PButton
            variant="primary"
            icon="fa-solid fa-plus"
            text="New Assignment"
            class="assign-new-btn"
            @click="add"
          />
        </div>
      </div>

      <!-- Search + Filters -->
      <div class="assign-controls">
        <div class="assign-search">
          <PInput
            v-model="searchQuery"
            placeholder="Search assignments"
            icon="fa-solid fa-magnifying-glass"
          />
        </div>
        <!-- Mobile filters toggle -->
        <button
          class="mobile-filters-btn"
          :class="{ active: showMobileFilters }"
          @click="showMobileFilters = !showMobileFilters"
        >
          <i class="fa-solid fa-sliders" />
          Filters
          <span v-if="activeFilterCount" class="mobile-filter-badge">{{ activeFilterCount }}</span>
        </button>
        <!-- Desktop filter dropdowns -->
        <div class="assign-filters" :class="{ 'filters-open': showMobileFilters }">
          <FilterDropdown
            label="Status"
            :options="statusOptions"
            v-model="statusFilter"
          />
          <FilterDropdown
            label="Assignment type"
            :options="typeOptions"
            v-model="typeFilter"
          />
          <button class="filter-chip-btn" disabled>
            Assigned To
            <i class="fa-solid fa-chevron-down chevron" />
          </button>
          <button class="filter-chip-btn" disabled>
            Due Date Range
            <i class="fa-solid fa-chevron-down chevron" />
          </button>
        </div>
      </div>

      <!-- Data table -->
      <div class="assign-table-wrapper">
        <table class="assign-table">
          <thead>
            <tr class="assign-table-header">
              <th class="assign-th assign-th-checkbox">
                <input
                  type="checkbox"
                  class="assign-checkbox"
                  :checked="allSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th class="assign-th assign-th-title">Assignment Title <i class="fa-solid fa-sort assign-sort-icon" /></th>
              <th class="assign-th assign-th-date">Due Date <i class="fa-solid fa-sort assign-sort-icon" /></th>
              <th class="assign-th assign-th-status">Publication status <i class="fa-solid fa-sort assign-sort-icon" /></th>
              <th class="assign-th assign-th-assigned">Assigned to</th>
              <th class="assign-th assign-th-submissions">Assignment submissions</th>
              <th class="assign-th assign-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="assignmentsForActiveTable.length === 0" class="assign-row">
              <td colspan="7" class="assign-td text-center" style="padding: 32px 16px; color: #64748b;">
                {{ searchQuery || statusFilter.length || typeFilter.length ? 'No assignments match your filters' : t('no-data-available') }}
              </td>
            </tr>
            <tr
              v-for="item in assignmentsForActiveTable"
              :key="item"
              class="assign-row"
              :class="{ 'assign-row-selected': current === item }"
              @click="handleRowClick(item)"
            >
              <!-- Checkbox -->
              <td class="assign-td assign-td-checkbox" @click.stop>
                <input
                  type="checkbox"
                  class="assign-checkbox"
                  :checked="selectedRows.has(item)"
                  @change="toggleRowSelection(item)"
                />
              </td>
              <!-- Assignment Title -->
              <td class="assign-td assign-td-title">
                <div class="assign-cell-title">
                  <vueScopeComponent :id="item" :path="['name']" />
                </div>
                <div class="assign-cell-desc">
                  <vueScopeComponent :id="item" :path="['description']">
                    <template v-slot="data">
                      {{ data.value || 'No description' }}
                    </template>
                  </vueScopeComponent>
                </div>
              </td>
              <!-- Due Date -->
              <td class="assign-td">
                <span class="assign-cell-text">
                  {{ getDueDate(item) }}
                </span>
              </td>
              <!-- Publication status -->
              <td class="assign-td">
                <span :class="getStatusBadgeClass(item)">
                  {{ getStatus(item) }}
                </span>
              </td>
              <!-- Assigned to -->
              <td class="assign-td">
                <template v-if="getAssignedGroups(item).length > 0">
                  <div class="assign-cell-title">
                    <vueScopeComponent
                      v-for="groupId in getAssignedGroups(item).slice(0, 1)"
                      :key="groupId"
                      :id="groupId"
                      :path="['name']"
                    />
                  </div>
                  <div class="assign-cell-desc">
                    {{ getAssignedGroups(item).length }} group{{ getAssignedGroups(item).length > 1 ? 's' : '' }}
                  </div>
                </template>
                <span v-else class="assign-cell-text">Not assigned</span>
              </td>
              <!-- Assignment submissions -->
              <td class="assign-td assign-td-submissions">
                <template v-if="getAssignedGroups(item).length > 0">
                  <div class="assign-progress-track">
                    <div class="assign-progress-fill" :style="{ width: getSubmissionProgress(item) + '%' }" />
                  </div>
                  <span class="assign-cell-desc">{{ getSubmissionProgress(item) }}%</span>
                </template>
                <span v-else class="assign-cell-text">No submissions</span>
              </td>
              <!-- Actions -->
              <td class="assign-td assign-td-actions" @click.stop>
                <PMenu alignRight>
                  <template #activator="{ props }">
                    <button class="assign-action-btn" @click="props.onClick">
                      <i class="fa-solid fa-ellipsis" />
                    </button>
                  </template>
                  <PMenuItem
                    title="View assignment details"
                    prepend-icon="fa-solid fa-eye"
                    @click="viewDetails(item)"
                  />
                  <PMenuItem
                    title="Edit assignment"
                    prepend-icon="fa-solid fa-pencil"
                    @click="openEdit(item)"
                  />
                  <PMenuItem
                    title="View submissions"
                    prepend-icon="fa-solid fa-chart-bar"
                    @click="openSubmissions(item)"
                  />
                  <PMenuItem
                    title="Duplicate"
                    prepend-icon="fa-solid fa-copy"
                    @click="startDuplicate(item)"
                  />
                  <PMenuItem
                    v-if="archivedIds[item]"
                    title="Unarchive"
                    prepend-icon="fa-solid fa-box-open"
                    @click="readd(item)"
                  />
                  <PMenuItem
                    v-else
                    title="Archive"
                    prepend-icon="fa-solid fa-box-archive"
                    @click="startArchive(item)"
                  />
                  <PMenuItem
                    title="Delete"
                    prepend-icon="fa-solid fa-trash"
                    class="menu-item-danger"
                    @click="startDelete(item)"
                  />
                </PMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="assign-pagination">
        <span class="assign-pagination-info">
          {{ selectedRows.size }} of {{ assignmentsForActiveTable.length }} row(s) selected.
        </span>
        <div class="assign-pagination-nav">
          <button class="assign-pagination-btn" disabled>Previous</button>
          <button class="assign-pagination-btn" disabled>Next</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Create/Edit Modal -->
  <CreateEditAssignmentModal
    v-if="showEditModal"
    @close="showEditModal = false"
    :researcher="props.assignable_item_type === 'researcher-created'"
    :teacher="props.assignable_item_type === 'teacher-created'"
    :id="current"
  />

  <!-- Preview Modal -->
  <PreviewModal
    v-if="previewing"
    :id="previewing"
    @close="previewing = null"
  />

  <!-- View Details Modal -->
  <ViewAssignmentDetailsModal
    v-if="showDetailsModal"
    :id="current"
    @close="showDetailsModal = false"
    @edit="showDetailsModal = false; openEdit(current)"
    @view-submissions="showDetailsModal = false; openSubmissions(current)"
  />

  <!-- View Submissions -->
  <ViewSubmissions
    v-if="showSubmissionsView"
    :assignmentId="current"
    @close="showSubmissionsView = false"
  />

  <!-- Dashboard Modals -->
  <PModal
    v-if="showResultsModal"
    @close="showResultsModal = false"
    :closeButtonText="t('close')"
    showCloseButton
    width="90vw"
    height="90vh"
  >
    <template v-slot:title>
      <span>
        {{ assignmentContainsBetty || assignmentContainsGenAI ? t('activity-dashboard') : t('live-monitoring-dashboard') }} -
        <vueScopeComponent :id="current" :path="['name']" />
      </span>
    </template>
    <template v-slot:body>
      <suspense>
        <Dashboard :assignment="current" :url="dashboardUrl" />
      </suspense>
    </template>
  </PModal>
  <PModal
    v-if="showCandliResultsModal"
    @close="showCandliResultsModal = false"
    showCloseButton
    :closeButtonText="t('close')"
    width="90vw"
    height="90vh"
  >
    <template v-slot:title>
      <span>
        {{ t('competency-dashboard') }} -
        <vueScopeComponent :id="current" :path="['name']" />
      </span>
    </template>
    <template v-slot:body>
      <div style="position: absolute; width: 100%; height: 100%;">
        <CandliDashboard :assignment="current" />
      </div>
    </template>
  </PModal>
  <PModal
    v-if="showGenAIDashboardModal"
    @close="showGenAIDashboardModal = false"
    showCloseButton
    :closeButtonText="t('close')"
    width="90vw"
    height="90vh"
  >
    <template v-slot:title>
      <span>{{ t('generative-ai-module-dashboard') }}</span>
    </template>
    <template v-slot:body>
      <div style="position: absolute; width: 100%; height: 100%;">
        <GenAIDashboard :assignment="current" />
      </div>
    </template>
  </PModal>

  <!-- Confirmation Dialogs -->
  <PAlertDialog
    v-if="showDeleteDialog"
    variant="error"
    title="Delete Assignment"
    description="Are you sure you want to delete this assignment? This action cannot be undone and all associated data will be permanently removed."
    confirmText="Delete"
    cancelText="Cancel"
    @confirm="confirmDelete"
    @cancel="showDeleteDialog = false"
  />
  <PAlertDialog
    v-if="showDuplicateDialog"
    variant="notification"
    title="Duplicate Assignment"
    description="A copy of this assignment will be created with all settings preserved. The duplicate will be saved as a draft."
    confirmText="Duplicate"
    cancelText="Cancel"
    @confirm="confirmDuplicate"
    @cancel="showDuplicateDialog = false"
  />
  <PAlertDialog
    v-if="showArchiveDialog"
    variant="notification"
    title="Archive Assignment"
    description="This assignment will be archived and hidden from the active list. You can unarchive it later from the archived view."
    confirmText="Archive"
    cancelText="Cancel"
    @confirm="confirmArchive"
    @cancel="showArchiveDialog = false"
  />
</template>

<script setup>
  import { ref, reactive, computed, watch } from 'vue'
  import { useStore } from 'vuex'
  import { useRouter } from 'vue-router'
  import { v4 as uuid } from 'uuid'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import { PModal, PButton, PInput, PMenu, PMenuItem, PAlertDialog } from '@/components/ui/index.js'
  import FilterDropdown from '@/components/content/filter-dropdown.vue'
  import PreviewModal from '@/components/common/preview-modal.vue'
  import Dashboard from './dashboard/index.vue'
  import CreateEditAssignmentModal from './create-edit-assignment-modal.vue'
  import ViewAssignmentDetailsModal from './view-assignment-details-modal.vue'
  import ViewSubmissions from './view-submissions.vue'
  import CandliDashboard from './candli-dashboard.vue'
  import GenAIDashboard from './gen-ai-dashboard.vue'
  import { CANDLI_SEQUENCES, GEN_AI_SEQUENCES } from '@/utils/constants.js'

  const props = defineProps({
    assignable_item_type: String,
    assignment_type: String,
  })

  const store = useStore()
  const router = useRouter()
  function t(slug) { return store.getters.t(slug) }

  // ── Core state ──
  const current = ref(null)
  const showEditModal = ref(false)
  const showArchived = ref(false)
  const previewing = ref(null)
  const showResultsModal = ref(false)
  const showCandliResultsModal = ref(false)
  const showGenAIDashboardModal = ref(false)
  const assignmentContainsCandli = ref(null)
  const assignmentContainsGenAI = ref(null)
  const assignmentContainsBetty = ref(null)
  const dashboardUrl = ref(null)
  const searchQuery = ref('')
  const selectedRows = reactive(new Set())
  const showDetailsModal = ref(false)
  const showSubmissionsView = ref(false)

  // ── Filter state ──
  const statusFilter = ref([])
  const typeFilter = ref([])
  const showMobileFilters = ref(false)

  const activeFilterCount = computed(() => statusFilter.value.length + typeFilter.value.length)

  const statusOptions = [
    { value: 'Published', label: 'Published' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Scheduled', label: 'Scheduled' },
  ]

  const typeOptions = [
    { value: 'Assignment', label: 'Assignment' },
    { value: 'Quiz', label: 'Quiz' },
    { value: 'Project', label: 'Project' },
  ]

  // ── Confirmation dialog state ──
  const showDeleteDialog = ref(false)
  const showDuplicateDialog = ref(false)
  const showArchiveDialog = ref(false)
  const pendingActionItem = ref(null)

  // ── Assignment data cache (for search/filter) ──
  const assignmentData = reactive({})

  async function loadAssignmentData(id) {
    if (assignmentData[id]) return
    try {
      const state = await Agent.state(id)
      assignmentData[id] = {
        name: state.name || '',
        description: state.description || '',
        content: state.content || null,
        assignmentType: state.assignmentType || 'Assignment',
        dueDate: state.dueDate || null,
        dueTime: state.dueTime || null,
        status: state.status || null,
      }
    } catch {
      assignmentData[id] = { name: '', description: '' }
    }
  }

  // ── Data sources ──
  const assignable_items = computed(() =>
    store.getters['pila_tags/withTag'](props.assignable_item_type)
  )
  const archived_assignable_items = computed(() =>
    store.getters['pila_tags/archivedWithTag'](props.assignable_item_type)
  )
  const archivedIds = computed(() =>
    Object.fromEntries(archived_assignable_items.value.map(id => [id, true]))
  )

  const allAssignments = computed(() => {
    if (showArchived.value) return [...assignable_items.value, ...archived_assignable_items.value]
    return assignable_items.value
  })

  // Load data for all assignments
  watch(allAssignments, (items) => {
    items.forEach(id => loadAssignmentData(id))
  }, { immediate: true })

  const assignmentsForActiveTable = computed(() => {
    let items = allAssignments.value

    // Search filter
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      items = items.filter(id => {
        const data = assignmentData[id]
        if (!data) return true // show items still loading
        return (data.name || '').toLowerCase().includes(q)
          || (data.description || '').toLowerCase().includes(q)
      })
    }

    // Status filter
    if (statusFilter.value.length > 0) {
      items = items.filter(id => statusFilter.value.includes(getStatus(id)))
    }

    // Type filter
    if (typeFilter.value.length > 0) {
      items = items.filter(id => {
        const data = assignmentData[id]
        return data && typeFilter.value.includes(data.assignmentType || 'Assignment')
      })
    }

    return items
  })

  // ── Select all checkbox ──
  const allSelected = computed(() => {
    if (assignmentsForActiveTable.value.length === 0) return false
    return assignmentsForActiveTable.value.every(id => selectedRows.has(id))
  })

  function toggleSelectAll() {
    if (allSelected.value) {
      assignmentsForActiveTable.value.forEach(id => selectedRows.delete(id))
    } else {
      assignmentsForActiveTable.value.forEach(id => selectedRows.add(id))
    }
  }

  // ── Status derivation ──
  function getStatus(id) {
    const data = assignmentData[id]
    if (data?.status) return data.status
    const groups = getAssignedGroups(id)
    if (groups.length > 0) return 'Published'
    return 'Draft'
  }

  function getStatusBadgeClass(id) {
    const s = getStatus(id)
    if (s === 'Published') return 'assign-badge assign-badge-published'
    if (s === 'Draft') return 'assign-badge assign-badge-draft'
    return 'assign-badge assign-badge-scheduled'
  }

  // ── Due date ──
  function getDueDate(id) {
    const data = assignmentData[id]
    if (data?.dueDate) return formatDate(data.dueDate)
    return 'Not set'
  }

  // ── Submission progress (placeholder until real submission tracking) ──
  function getSubmissionProgress(id) {
    // TODO: Replace with real submission data from backend
    const groups = getAssignedGroups(id)
    if (groups.length === 0) return 0
    // Placeholder: use a hash of the ID to generate a stable percentage
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
    return Math.abs(hash) % 101
  }

  // ── Helpers ──
  function getAssignedGroups(id) {
    return store.getters['assignments/assignedGroups'](id, props.assignment_type, false)
  }

  function handleRowClick(item) {
    current.value = current.value === item ? null : item
  }

  function toggleRowSelection(item) {
    if (selectedRows.has(item)) selectedRows.delete(item)
    else selectedRows.add(item)
  }

  function formatDate(ts) {
    if (!ts) return '--'
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  }

  // ── CRUD actions ──
  async function add() {
    const content_id = uuid()
    const assignableItem = await Agent.state(content_id)
    assignableItem.name = t('new-assignment')
    current.value = content_id
    store.dispatch('pila_tags/tag', { content_id, tag_type: props.assignable_item_type })
    showEditModal.value = true
  }

  async function readd(content_id) {
    await store.dispatch('pila_tags/tag', { content_id, tag_type: props.assignable_item_type })
  }

  function remove(content_id) {
    store.dispatch('pila_tags/untag', { content_id, tag_type: props.assignable_item_type })
    if (current.value === content_id) current.value = null
  }

  function openEdit(item) {
    current.value = item
    showEditModal.value = true
  }

  function viewDetails(item) {
    current.value = item
    showDetailsModal.value = true
  }

  function openSubmissions(item) {
    current.value = item
    showSubmissionsView.value = true
  }

  async function openPreview(item) {
    const { content } = await Agent.state(item)
    previewing.value = content
  }

  // ── Duplicate ──
  function startDuplicate(item) {
    pendingActionItem.value = item
    showDuplicateDialog.value = true
  }

  async function confirmDuplicate() {
    const sourceId = pendingActionItem.value
    if (!sourceId) return

    const newId = uuid()
    const sourceState = await Agent.state(sourceId)
    const newState = await Agent.state(newId)

    newState.name = (sourceState.name || '') + ' (Copy)'
    newState.description = sourceState.description || ''
    newState.content = sourceState.content || null
    if (sourceState.assignmentType) newState.assignmentType = sourceState.assignmentType
    if (sourceState.dueDate) newState.dueDate = sourceState.dueDate
    if (sourceState.dueTime) newState.dueTime = sourceState.dueTime

    store.dispatch('pila_tags/tag', { content_id: newId, tag_type: props.assignable_item_type })

    // Load data for the new duplicate
    delete assignmentData[newId]
    loadAssignmentData(newId)

    showDuplicateDialog.value = false
    pendingActionItem.value = null
  }

  // ── Archive ──
  function startArchive(item) {
    pendingActionItem.value = item
    showArchiveDialog.value = true
  }

  function confirmArchive() {
    const item = pendingActionItem.value
    if (!item) return
    store.dispatch('pila_tags/untag', { content_id: item, tag_type: props.assignable_item_type })
    if (current.value === item) current.value = null
    showArchiveDialog.value = false
    pendingActionItem.value = null
  }

  // ── Delete ──
  function startDelete(item) {
    pendingActionItem.value = item
    showDeleteDialog.value = true
  }

  function confirmDelete() {
    const item = pendingActionItem.value
    if (!item) return
    store.dispatch('pila_tags/untag', { content_id: item, tag_type: props.assignable_item_type })
    if (current.value === item) current.value = null
    showDeleteDialog.value = false
    pendingActionItem.value = null
  }

  // ── Dashboard ──
  async function openDashboard(item) {
    current.value = item
    await reassessContents()
    showResultsModal.value = true
  }

  async function reassessContents() {
    assignmentContainsCandli.value = null
    assignmentContainsGenAI.value = null
    assignmentContainsBetty.value = null
    if (current.value) {
      const { content } = await Agent.state(current.value)
      assignmentContainsCandli.value = !!CANDLI_SEQUENCES[content]
      assignmentContainsGenAI.value = !!GEN_AI_SEQUENCES[content]
      if ((await Agent.state(content)).id?.includes('betty')) {
        assignmentContainsBetty.value = true
      }
      if ((await Agent.metadata(content)).domain === 'datawise.accingo.co') {
        dashboardUrl.value = 'https://datawise.accingo.co/dashboard'
      } else if ((await Agent.state(content)).reference?.dashboard) {
        dashboardUrl.value = 'https://' + (await Agent.state(content)).reference.dashboard
      } else {
        dashboardUrl.value = null
      }
    }
  }

  watch(current, reassessContents)
  watch(showEditModal, v => {
    if (!v) {
      reassessContents()
      // Reload data for edited assignment
      if (current.value) {
        delete assignmentData[current.value]
        loadAssignmentData(current.value)
      }
    }
  })
</script>

<style scoped>
/* Card header */
.assign-card-header {
  padding-bottom: 20px;
  margin-bottom: 22px;
  border-bottom: 1px solid #E2E8F0;
}

.assign-card-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.assign-new-btn {
  flex-shrink: 0;
  border-radius: 12px !important;
}

/* Search + filters */
.assign-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.assign-search {
  width: 246px;
  flex-shrink: 0;
}

.assign-filters {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
  cursor: not-allowed;
  white-space: nowrap;
}
.filter-chip-btn .chevron {
  font-size: 10px;
  margin-left: 2px;
}

/* Table */
.assign-table-wrapper {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  margin-top: 16px;
}

.assign-table {
  width: 100%;
  border-collapse: collapse;
}

.assign-table-header {
  background: #f8fafc;
}

.assign-th {
  padding: 16px;
  text-align: left;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  white-space: nowrap;
  border-bottom: 1px solid #e2e8f0;
}

.assign-th-checkbox { width: 48px; }
.assign-th-title { min-width: 240px; }
.assign-th-date { width: 140px; }
.assign-th-status { width: 180px; }
.assign-th-assigned { width: 195px; }
.assign-th-submissions { width: 236px; }
.assign-th-actions { width: 92px; }

.assign-sort-icon {
  font-size: 10px;
  color: #94a3b8;
  margin-left: 4px;
}

.assign-row {
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  transition: background-color 100ms;
}
.assign-row:last-child {
  border-bottom: none;
}
.assign-row:hover {
  background: #f8fafc;
}
.assign-row-selected {
  background: #eff6ff;
}

.assign-td {
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  vertical-align: middle;
}

.assign-td-checkbox {
  width: 48px;
  text-align: center;
}

.assign-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid #cbd5e1;
  cursor: pointer;
  accent-color: #2563eb;
}

.assign-td-title {
  max-width: 228px;
}

.assign-cell-title {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  line-height: 1.4;
}

.assign-cell-desc {
  font-size: 12px;
  font-weight: 400;
  color: #64748b;
  margin-top: 2px;
  line-height: 1.4;
}

.assign-cell-text {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
}

/* Status badges */
.assign-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.assign-badge-published {
  background: #f0fdf4;
  color: #16a34a;
}
.assign-badge-draft {
  background: #fefce8;
  color: #ca8a04;
}
.assign-badge-scheduled {
  background: #f1f5f9;
  color: #334155;
}

/* Progress bar */
.assign-td-submissions {
  min-width: 180px;
}

.assign-progress-track {
  width: 183px;
  height: 8px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 4px;
}
.assign-progress-fill {
  height: 100%;
  background: #2563eb;
  border-radius: 9999px;
  transition: width 300ms ease;
}

/* Actions */
.assign-td-actions {
  text-align: center;
}

.assign-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  font-size: 14px;
  transition: all 150ms;
}
.assign-action-btn:hover {
  background: #f8fafc;
  color: #334155;
}

/* Danger menu item */
.menu-item-danger {
  color: #dc2626 !important;
}
.menu-item-danger:hover {
  background: #fef2f2 !important;
}

/* Pagination */
.assign-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0 0 0;
}

.assign-pagination-info {
  font-size: 14px;
  font-weight: 400;
  color: #64748b;
}

.assign-pagination-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.assign-pagination-btn {
  padding: 6px 8px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 14px;
  font-weight: 500;
  color: #2563eb;
  cursor: pointer;
  transition: all 150ms;
}
.assign-pagination-btn:hover:not(:disabled) {
  background: #f8fafc;
}
.assign-pagination-btn:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

/* ── Mobile filters button (hidden on desktop) ── */
.mobile-filters-btn {
  display: none;
}

/* ── Mobile Responsive ── */
@media (max-width: 768px) {
  .assign-card-header {
    padding-bottom: 16px;
    margin-bottom: 16px;
  }

  .assign-card-title-row {
    flex-direction: column;
    gap: 12px;
  }

  .assign-new-btn {
    width: 100%;
  }

  .assign-controls {
    flex-wrap: wrap;
    gap: 8px;
  }

  .assign-search {
    width: 100%;
    flex: 1;
    min-width: 0;
  }

  /* Show mobile Filters button */
  .mobile-filters-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    font-size: 14px;
    font-weight: 500;
    color: #2563eb;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .mobile-filters-btn.active {
    background: #eff6ff;
    border-color: #2563eb;
  }
  .mobile-filter-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    background: #2563eb;
    color: white;
    font-size: 11px;
    font-weight: 600;
    padding: 0 4px;
  }

  /* Hide desktop filters, show when toggled */
  .assign-filters {
    display: none;
    width: 100%;
    flex-wrap: wrap;
  }
  .assign-filters.filters-open {
    display: flex;
  }

  /* Horizontally scrollable table */
  .assign-table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin-top: 12px;
  }

  .assign-table {
    min-width: 700px;
  }

  .assign-th {
    padding: 12px 10px;
    font-size: 13px;
  }

  .assign-td {
    padding: 10px;
    font-size: 11px;
  }

  .assign-th-title { min-width: 180px; }
  .assign-th-date { width: 100px; }
  .assign-th-status { width: 120px; }
  .assign-th-assigned { width: 140px; }
  .assign-th-submissions { width: 160px; }
  .assign-th-actions { width: 60px; }

  .assign-td-title {
    max-width: 180px;
  }

  .assign-progress-track {
    width: 120px;
  }

  .assign-pagination {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    padding: 12px 0 0;
  }

  .assign-pagination-nav {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 480px) {
  .assign-table {
    min-width: 500px;
  }

  .assign-th-status,
  .assign-th-assigned {
    display: none;
  }

  .assign-td:nth-child(4),
  .assign-td:nth-child(5) {
    display: none;
  }
}
</style>
