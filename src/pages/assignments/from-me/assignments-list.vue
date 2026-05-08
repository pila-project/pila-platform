<template>
  <div class="page-container assign-page">
    <h1 class="page-heading assign-heading capitalize">{{ t('assign-and-monitor') }}</h1>

    <div class="content-card assign-card">
      <!-- Card header -->
      <div class="assign-card-header">
        <div class="assign-card-title-row">
          <div>
            <h2 class="card-section-title flex items-center gap-2">
              <LucideIcon name="clipboard-list" :size="18" class="text-primary-600" />
              <span class="capitalize">{{ t('assignments') }}</span>
            </h2>
            <p class="card-section-subtitle">{{ t('create-and-manage-assignments') }}</p>
          </div>
          <PButton
            variant="primary"
            icon="lucide:plus"
            :text="t('new-assignment')"
            class="assign-new-btn"
            @click="add"
          />
        </div>
      </div>

      <!-- Search + Filters -->
      <div class="assign-controls">
        <PUnifiedFilter
          v-model:searchQuery="searchQuery"
          :placeholder="t('search-assignments')"
        >
          <PUnifiedFilterSection
            id="status"
            :label="t('publication-status')"
            icon="table"
            :options="statusOptions"
            v-model="statusFilter"
          />
          <PUnifiedFilterSection
            id="type"
            :label="t('assignment-type')"
            icon="list-tree"
            :options="typeOptions"
            v-model="typeFilter"
          />
          <PUnifiedFilterDateSection
            id="dueDate"
            :label="t('due-date-range')"
            v-model="dueDateFilter"
          />
          <PUnifiedFilterTabSection
            id="assignedTo"
            :label="t('assigned-to')"
            icon="link"
            :tabs="assignedToTabs"
            :options="assignedToOptions"
            v-model="assignedToFilter"
            v-model:activeTab="assignedToTab"
          />
        </PUnifiedFilter>
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
              <th class="assign-th assign-th-title">{{ t('assignment-title') }} <LucideIcon name="arrow-up-down" :size="10" class="assign-sort-icon" /></th>
              <th class="assign-th assign-th-date">{{ t('due-date') }} <LucideIcon name="arrow-up-down" :size="10" class="assign-sort-icon" /></th>
              <th class="assign-th assign-th-status">{{ t('publication-status') }} <LucideIcon name="arrow-up-down" :size="10" class="assign-sort-icon" /></th>
              <th class="assign-th assign-th-assigned">{{ t('assigned-to') }}</th>
              <th class="assign-th assign-th-submissions">{{ t('assignment-submissions') }}</th>
              <th class="assign-th assign-th-actions">{{ t('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="paginatedAssignments.length === 0" class="assign-row">
              <td colspan="7" class="assign-td text-center" style="padding: 32px 16px; color: #64748b;">
                {{ searchQuery || statusFilter.length || typeFilter.length ? t('no-assignments-match-filters') : t('no-data-available') }}
              </td>
            </tr>
            <tr
              v-for="item in paginatedAssignments"
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
                  <span v-if="assignmentData[item]?.assignmentType" class="assign-type-dot"> . </span>
                  <span v-if="assignmentData[item]?.assignmentType" :class="getTypeBadgeClass(assignmentData[item].assignmentType)">
                    {{ t(assignmentData[item].assignmentType.toLowerCase()) }}
                  </span>
                </div>
                <div class="assign-cell-desc">
                  <vueScopeComponent :id="item" :path="['description']">
                    <template v-slot="data">
                      {{ data.value || t('no-description') }}
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
                  {{ t(getStatus(item).toLowerCase()) }}
                </span>
                <div v-if="getStatus(item) === 'Scheduled' && assignmentData[item]?.dueDate" class="assign-cell-desc">
                  {{ t('for') }} {{ formatDate(assignmentData[item].dueDate) }}
                </div>
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
                    {{ getAssignedGroups(item).length }} {{ getAssignedGroups(item).length > 1 ? t('groups') : t('group') }}
                  </div>
                </template>
                <span v-else class="assign-cell-text">{{ t('not-assigned') }}</span>
              </td>
              <!-- Assignment submissions -->
              <td class="assign-td assign-td-submissions">
                <template v-if="getAssignedGroups(item).length > 0 && getSubmissionProgress(item) != null">
                  <div class="assign-progress-track">
                    <div class="assign-progress-fill" :style="{ width: getSubmissionProgress(item) + '%' }" />
                  </div>
                  <span class="assign-cell-desc">{{ getSubmissionProgress(item) }}%</span>
                </template>
                <!-- TODO: backend — submission tracking not yet available -->
                <span v-else class="assign-cell-text assign-cell-text--muted">—</span>
              </td>
              <!-- Actions -->
              <td class="assign-td assign-td-actions" @click.stop>
                <PMenu alignRight>
                  <template #activator="{ props }">
                    <button class="assign-action-btn" @click="props.onClick">
                      <LucideIcon name="ellipsis" :size="14" />
                    </button>
                  </template>
                  <PMenuItem
                    :title="t('view-assignment-details')"
                    prepend-icon="lucide:eye"
                    @click="viewDetails(item)"
                  />
                  <PMenuItem
                    :title="t('view-analytics-dashboard')"
                    :prepend-icon="dashboardSubmenuItem === item ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                    keepOpen
                    @click.prevent="toggleDashboardSubmenu(item)"
                  />
                  <template v-if="dashboardSubmenuItem === item">
                    <PMenuItem
                      :title="t('app-specific-dashboard')"
                      class="menu-item-indent"
                      @click="openDashboard(item)"
                    />
                    <PMenuItem
                      :title="t('live-monitoring-dashboard')"
                      class="menu-item-indent"
                      @click="openLiveDashboard(item)"
                    />
                    <PMenuItem
                      v-if="assignmentContainsCandli"
                      :title="t('competency-dashboard')"
                      class="menu-item-indent"
                      @click="openCandliDashboard(item)"
                    />
                    <PMenuItem
                      v-if="assignmentContainsGenAI"
                      :title="t('generative-ai-module-dashboard')"
                      class="menu-item-indent"
                      @click="openGenAIDashboard(item)"
                    />
                  </template>
                  <PMenuItem
                    :title="t('edit-assignment')"
                    prepend-icon="lucide:pencil"
                    @click="openEdit(item)"
                  />
                  <PMenuItem
                    :title="t('view-submissions')"
                    prepend-icon="lucide:bar-chart"
                    @click="openSubmissions(item)"
                  />
                  <PMenuItem
                    :title="t('duplicate')"
                    prepend-icon="lucide:copy"
                    @click="startDuplicate(item)"
                  />
                  <PMenuItem
                    v-if="archivedIds[item]"
                    :title="t('unarchive')"
                    prepend-icon="lucide:archive-restore"
                    @click="readd(item)"
                  />
                  <PMenuItem
                    v-else
                    :title="t('archive')"
                    prepend-icon="lucide:archive"
                    @click="startArchive(item)"
                  />
                  <PMenuItem
                    :title="t('delete')"
                    prepend-icon="lucide:trash-2"
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
          {{ selectedRows.size }} {{ t('of') }} {{ assignmentsForActiveTable.length }} {{ t('rows-selected') }}
        </span>
        <div class="assign-pagination-center">
          {{ t('rows-per-page') }}
          <select class="assign-per-page-select" v-model.number="perPage" @change="currentPage = 1">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>
        <div class="assign-pagination-right">
          <span class="assign-page-label">{{ t('page') }} {{ currentPage }} {{ t('of') }} {{ totalPages }}</span>
          <div class="assign-page-buttons">
            <button class="assign-page-btn" :disabled="currentPage <= 1" @click="currentPage = 1">
              <LucideIcon name="chevrons-left" :size="11" />
            </button>
            <button class="assign-page-btn" :disabled="currentPage <= 1" @click="currentPage--">
              <LucideIcon name="chevron-left" :size="11" />
            </button>
            <button class="assign-page-btn" :disabled="currentPage >= totalPages" @click="currentPage++">
              <LucideIcon name="chevron-right" :size="11" />
            </button>
            <button class="assign-page-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">
              <LucideIcon name="chevrons-right" :size="11" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Create/Edit Modal -->
  <CreateEditAssignmentModal
    v-if="showEditModal"
    @close="showEditModal = false"
    @saved="onAssignmentSaved"
    :researcher="props.assignable_item_type === 'researcher-created'"
    :teacher="props.assignable_item_type === 'teacher-created'"
    :id="current"
    :editing="!wasCreating"
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
    @open-dashboard="handleOpenDashboardFromSubmissions"
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
    :title="`${t('are-you-sure-you-want-to-delete')} &quot;${pendingActionName}&quot;?`"
    :description="t('delete-assignment-warning-permanent')"
    :confirmText="t('delete-assignment')"
    :cancelText="t('cancel')"
    @confirm="confirmDelete"
    @cancel="showDeleteDialog = false"
  />
  <PModal
    v-if="showDuplicateDialog"
    @close="showDuplicateDialog = false"
    width="500px"
  >
    <template #title>
      <span class="flex items-center gap-2">
        <LucideIcon name="copy" :size="16" />
        {{ t('duplicate-assignment') }}
      </span>
    </template>
    <template #body>
      <p class="duplicate-subtitle">{{ t('create-a-copy-of') }} "{{ duplicateSourceName }}"</p>
      <div class="duplicate-info-banner">
        <LucideIcon name="info" :size="14" class="info-banner-icon" />
        <span>{{ t('duplicate-info-text') }}</span>
      </div>
      <div style="margin-top: 16px;">
        <PInput v-model="duplicateNewTitle" :label="t('new-assignment-title')" />
      </div>
    </template>
    <template #footer>
      <PButton variant="ghost" :text="t('back')" class="footer-back-btn" />
      <PButton variant="ghost" :text="t('cancel')" class="footer-cancel-btn" @click="showDuplicateDialog = false" />
      <PButton variant="primary" :text="t('duplicate-assignment')" @click="confirmDuplicate" />
    </template>
  </PModal>
  <PAlertDialog
    v-if="showArchiveDialog"
    variant="warning"
    :title="t('are-you-sure-you-want-to-archive-this-assignment')"
    :description="`${t('archive')} &quot;${pendingActionName}&quot; ${t('to-remove-from-active-lists-while-preserving-data')}`"
    :confirmText="t('archive-assignment')"
    :cancelText="t('cancel')"
    @confirm="confirmArchive"
    @cancel="showArchiveDialog = false"
  />
  <PAlertDialog
    v-if="showSuccessDialog"
    variant="success"
    :title="t('assignment-successfully-created')"
    :confirmText="t('continue')"
    @confirm="showSuccessDialog = false"
  />
</template>

<script setup>
  import { ref, reactive, computed, watch } from 'vue'
  import { useStore } from 'vuex'
  import { useRouter } from 'vue-router'
  import { v4 as uuid } from 'uuid'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import { PModal, PButton, PInput, PMenu, PMenuItem, PAlertDialog, PUnifiedFilter, PUnifiedFilterSection, PUnifiedFilterDateSection, PUnifiedFilterTabSection } from '@/components/ui/index.js'
  import LucideIcon from '@/components/ui/LucideIcon.vue'
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
  const currentPage = ref(1)
  const perPage = ref(10)
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
  const dashboardSubmenuItem = ref(null)
  const showSuccessDialog = ref(false)
  const wasCreating = ref(false)

  // ── Filter state ──
  const statusFilter = ref([])
  const typeFilter = ref([])
  const dueDateFilter = ref(null)
  const assignedToFilter = ref([])
  const assignedToTab = ref('all')

  const statusOptions = computed(() => [
    { value: 'Published', label: t('published') },
    { value: 'Draft', label: t('draft') },
    { value: 'Scheduled', label: t('scheduled') },
  ])

  const typeOptions = computed(() => [
    { value: 'Assignment', label: t('assignment') },
    { value: 'Quiz', label: t('quiz') },
    { value: 'Project', label: t('project') },
  ])

  const assignedToTabs = computed(() => [
    { key: 'all', label: t('all') },
    { key: 'group', label: t('group') },
    { key: 'students', label: t('student') },
  ])

  const assignedToOptions = computed(() => {
    const groupEntries = Object.entries(store.state.groups.groups)
      .filter(([, g]) => !g.archived)
      .map(([id, g]) => ({ value: id, label: g.name || t('unnamed') }))
    return {
      group: groupEntries,
      students: [],
    }
  })

  // ── Confirmation dialog state ──
  const showDeleteDialog = ref(false)
  const showDuplicateDialog = ref(false)
  const showArchiveDialog = ref(false)
  const pendingActionItem = ref(null)
  const duplicateNewTitle = ref('')
  const duplicateSourceName = ref('')

  const pendingActionName = computed(() => {
    if (!pendingActionItem.value) return ''
    return assignmentData[pendingActionItem.value]?.name || t('this-assignment')
  })

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

    // Due date range filter
    if (dueDateFilter.value && dueDateFilter.value[0] && dueDateFilter.value[1]) {
      items = items.filter(id => {
        const data = assignmentData[id]
        if (!data?.dueDate) return false
        const due = new Date(data.dueDate)
        return due >= dueDateFilter.value[0] && due <= dueDateFilter.value[1]
      })
    }

    // Assigned to filter
    if (assignedToFilter.value.length > 0) {
      items = items.filter(id => {
        const groups = getAssignedGroups(id)
        return assignedToFilter.value.some(val => groups.includes(val))
      })
    }

    return items
  })

  // ── Pagination ──
  const totalPages = computed(() => Math.max(1, Math.ceil(assignmentsForActiveTable.value.length / perPage.value)))

  const paginatedAssignments = computed(() => {
    const start = (currentPage.value - 1) * perPage.value
    return assignmentsForActiveTable.value.slice(start, start + perPage.value)
  })

  // Reset to page 1 when filters change
  watch(assignmentsForActiveTable, () => { currentPage.value = 1 })

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

  function getTypeBadgeClass(type) {
    const t = (type || '').toLowerCase()
    if (t === 'assessment') return 'assign-type-tag assign-type-assessment'
    if (t === 'homework') return 'assign-type-tag assign-type-homework'
    if (t === 'practice') return 'assign-type-tag assign-type-practice'
    if (t === 'learning') return 'assign-type-tag assign-type-learning'
    return 'assign-type-tag assign-type-default'
  }

  // ── Due date ──
  function getDueDate(id) {
    const data = assignmentData[id]
    if (data?.dueDate) return formatDate(data.dueDate)
    return t('not-set')
  }

  // ── Submission progress (placeholder until real submission tracking) ──
  function getSubmissionProgress(id) {
    // TODO: backend — replace with real submission data once backend tracking exists
    const groups = getAssignedGroups(id)
    if (groups.length === 0) return null // no groups = no progress to show
    return null // show "—" until real tracking exists
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
  function add() {
    const content_id = uuid()
    current.value = content_id
    wasCreating.value = true
    showEditModal.value = true
  }

  const wasSaved = ref(false)

  function onAssignmentSaved() {
    wasSaved.value = true
    if (wasCreating.value && current.value) {
      store.dispatch('pila_tags/tag', { content_id: current.value, tag_type: props.assignable_item_type })
    }
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
    wasCreating.value = false
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
    const name = assignmentData[item]?.name || t('new-assignment')
    duplicateSourceName.value = name
    duplicateNewTitle.value = name
    showDuplicateDialog.value = true
  }

  async function confirmDuplicate() {
    const sourceId = pendingActionItem.value
    if (!sourceId) return

    const newId = uuid()
    const sourceState = await Agent.state(sourceId)
    const newState = await Agent.state(newId)

    newState.name = duplicateNewTitle.value || (sourceState.name || '') + ' (Copy)'
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
  async function toggleDashboardSubmenu(item) {
    if (dashboardSubmenuItem.value === item) {
      dashboardSubmenuItem.value = null
      return
    }
    dashboardSubmenuItem.value = item
    current.value = item
    await reassessContents()
  }

  async function openDashboard(item) {
    current.value = item
    await reassessContents()
    showResultsModal.value = true
  }

  async function openCandliDashboard(item) {
    current.value = item
    await reassessContents()
    showCandliResultsModal.value = true
  }

  async function openLiveDashboard(item) {
    current.value = item
    await reassessContents()
    showResultsModal.value = true
  }

  async function openGenAIDashboard(item) {
    current.value = item
    await reassessContents()
    showGenAIDashboardModal.value = true
  }

  async function handleOpenDashboardFromSubmissions(type) {
    showSubmissionsView.value = false
    if (type === 'competency') {
      await openCandliDashboard(current.value)
    } else if (type === 'genai') {
      await openGenAIDashboard(current.value)
    } else {
      // 'app' and 'live' both use the main results modal
      await openDashboard(current.value)
    }
  }

  async function reassessContents() {
    assignmentContainsCandli.value = null
    assignmentContainsGenAI.value = null
    assignmentContainsBetty.value = null
    dashboardUrl.value = null
    if (current.value) {
      const stateData = await Agent.state(current.value)
      const rawContent = stateData.content
      const contentIds = Array.isArray(rawContent) ? rawContent : (rawContent ? [rawContent] : [])
      for (const content of contentIds) {
        if (CANDLI_SEQUENCES[content]) assignmentContainsCandli.value = true
        if (GEN_AI_SEQUENCES[content]) assignmentContainsGenAI.value = true
        if ((await Agent.state(content)).id?.includes('betty')) {
          assignmentContainsBetty.value = true
        }
        if ((await Agent.metadata(content)).domain === 'datawise.accingo.co') {
          dashboardUrl.value = 'https://datawise.accingo.co/dashboard'
        } else if ((await Agent.state(content)).reference?.dashboard) {
          dashboardUrl.value = 'https://' + (await Agent.state(content)).reference.dashboard
        }
      }
    }
  }

  watch(current, reassessContents)
  watch(showEditModal, v => {
    if (!v) {
      if (wasSaved.value) {
        reassessContents()
        // Reload data for saved assignment
        if (current.value) {
          delete assignmentData[current.value]
          loadAssignmentData(current.value)
        }
        // Show success dialog after creating a new assignment
        if (wasCreating.value) {
          showSuccessDialog.value = true
        }
      }
      wasCreating.value = false
      wasSaved.value = false
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
  gap: 16px;
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
  vertical-align: middle;
  display: inline;
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
.assign-cell-text--muted {
  color: #94a3b8;
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
  border: 1px solid #22c55e;
}
.assign-badge-draft {
  background: #fefce8;
  color: #ca8a04;
  border: 1px solid #eab308;
}
.assign-badge-scheduled {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
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

/* Assignment type tags (inline next to title) */
.assign-type-dot {
  color: #94a3b8;
  font-weight: 400;
}
.assign-type-tag {
  font-size: 12px;
  font-weight: 500;
}
.assign-type-assessment { color: #2563eb; }
.assign-type-homework { color: #16a34a; }
.assign-type-practice { color: #7c3aed; }
.assign-type-learning { color: #0891b2; }
.assign-type-default { color: #64748b; }

/* Danger menu item */
.menu-item-danger {
  color: #dc2626 !important;
}
.menu-item-danger:hover {
  background: #fef2f2 !important;
}

/* Dashboard submenu indent */
.menu-item-indent {
  padding-left: 32px !important;
  font-size: 13px;
}

/* Duplicate modal */
.duplicate-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 12px 0;
}

.duplicate-info-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  font-size: 13px;
  color: #1e40af;
  line-height: 1.5;
}

.info-banner-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.footer-back-btn {
  color: #2563eb !important;
}

.footer-cancel-btn {
  color: #dc2626 !important;
}

/* Pagination */
.assign-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0 0 0;
  gap: 16px;
  flex-wrap: wrap;
}

.assign-pagination-info {
  font-size: 14px;
  font-weight: 400;
  color: #64748b;
}

.assign-pagination-center {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.assign-per-page-select {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 14px;
  color: #334155;
  background: white;
  cursor: pointer;
}

.assign-pagination-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.assign-page-label {
  font-size: 14px;
  font-weight: 400;
  color: #334155;
}

.assign-page-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.assign-page-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  font-size: 11px;
  transition: all 150ms;
}
.assign-page-btn:hover:not(:disabled) {
  background: #f8fafc;
  color: #334155;
}
.assign-page-btn:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
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
