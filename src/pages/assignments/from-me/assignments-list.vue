<template>
  <div class="page-container assign-page">
    <h1 class="page-heading assign-heading capitalize">{{ t('assignments') }}</h1>

    <div class="content-card assign-card">
      <!-- Card header -->
      <div class="assign-card-header">
        <div class="assign-card-title-row">
          <div>
            <h2 class="card-section-title flex items-center gap-2">
              <LucideIcon name="clipboard-list" :size="18" class="text-primary-600" />
              <span>{{ titleCase(t('assignments')) }}</span>
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
            compact-panel
          />
        </PUnifiedFilter>
      </div>

      <!-- Data table -->
      <div class="assign-table-wrapper">
        <PTable
          :headers="tableHeaders"
          :items="tableItems"
          itemKey="id"
          selectable
          :selected="selectedItems"
          @update:selected="selectedItems = $event"
          clickableRows
          :rowClass="assignmentRowClass"
          @click:row="(_, { item }) => handleRowClick(item.id)"
          :noDataText="hasActiveFilters ? t('no-assignments-match-filters') : t('no-data-available')"
          :itemsPerPage="10"
          :itemsPerPageOptions="[
            { value: 10, title: '10' },
            { value: 25, title: '25' },
            { value: 50, title: '50' },
          ]"
        >
          <template #item.title="{ item }">
            <div class="assign-cell-title">
              <vueScopeComponent :id="item.id" :path="['name']" />
              <span v-if="assignmentData[item.id]?.assignmentType" class="assign-type-dot"> . </span>
              <span v-if="assignmentData[item.id]?.assignmentType" :class="getTypeBadgeClass(assignmentData[item.id].assignmentType)">
                {{ t(assignmentData[item.id].assignmentType.toLowerCase()) }}
              </span>
            </div>
            <div class="assign-cell-desc">
              <vueScopeComponent :id="item.id" :path="['description']">
                <template v-slot="data">
                  {{ data.value || t('no-description') }}
                </template>
              </vueScopeComponent>
            </div>
          </template>
          <template #item.dueDate="{ item }">
            <span class="assign-cell-text">
              {{ getDueDate(item.id) }}
            </span>
          </template>
          <template #item.status="{ item }">
            <span :class="getStatusBadgeClass(item.id)">
              {{ t(getStatus(item.id).toLowerCase()) }}
            </span>
            <div v-if="getScheduledSubline(item.id)" class="assign-cell-desc">
              {{ getScheduledSubline(item.id) }}
            </div>
          </template>
          <template #item.assignedTo="{ item }">
            <template v-if="getAssignedGroups(item.id).length > 0">
              <div class="assign-cell-title">
                <vueScopeComponent
                  v-for="groupId in getAssignedGroups(item.id).slice(0, 1)"
                  :key="groupId"
                  :id="groupId"
                  :path="['name']"
                />
              </div>
              <div class="assign-cell-desc">
                {{ getAssignedGroups(item.id).length }} {{ getAssignedGroups(item.id).length > 1 ? t('groups') : t('group') }}
              </div>
            </template>
            <span v-else class="assign-cell-text">{{ t('not-assigned') }}</span>
          </template>
          <template #item.submissions="{ item }">
            <PButton
              v-if="canViewSubmissions(item.id)"
              variant="link"
              size="sm"
              icon="lucide:bar-chart"
              :text="t('view-submissions')"
              @click.stop="openSubmissions(item.id)"
            />
            <span v-else class="assign-cell-text assign-cell-text--muted">—</span>
          </template>
          <template #item.actions="{ item }">
            <div @click.stop>
              <PMenu alignRight>
                <template #activator="{ props: menuProps }">
                  <PButton variant="icon" size="sm" icon="lucide:ellipsis-vertical" iconOnly @click="menuProps.onClick" />
                </template>
                <PMenuItem
                  :title="t('view-assignment-details')"
                  prepend-icon="lucide:eye"
                  @click="viewDetails(item.id)"
                />
                <PMenuItem
                  :title="t('edit-assignment')"
                  prepend-icon="lucide:pencil"
                  @click="openEdit(item.id)"
                />
                <template v-if="getStatus(item.id) === 'Published'">
                  <PMenuItem
                    :title="t('view-submissions')"
                    prepend-icon="lucide:bar-chart"
                    @click="openSubmissions(item.id)"
                  />
                  <PMenuItem
                    :title="t('view-analytics-dashboard')"
                    :prepend-icon="dashboardSubmenuItem === item.id ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                    keepOpen
                    @click.prevent="toggleDashboardSubmenu(item.id)"
                  />
                  <template v-if="dashboardSubmenuItem === item.id">
                    <PMenuItem
                      :title="t('app-specific-dashboard')"
                      class="menu-item-indent"
                      @click="openDashboard(item.id)"
                    />
                    <PMenuItem
                      :title="t('live-monitoring-dashboard')"
                      class="menu-item-indent"
                      @click="openLiveDashboard(item.id)"
                    />
                    <PMenuItem
                      v-if="assignmentContainsCandli"
                      :title="t('competency-dashboard')"
                      class="menu-item-indent"
                      @click="openCandliDashboard(item.id)"
                    />
                    <PMenuItem
                      v-if="assignmentContainsGenAI"
                      :title="t('generative-ai-module-dashboard')"
                      class="menu-item-indent"
                      @click="openGenAIDashboard(item.id)"
                    />
                  </template>
                </template>
                <PMenuItem
                  :title="t('duplicate')"
                  prepend-icon="lucide:copy"
                  @click="startDuplicate(item.id)"
                />
                <PMenuItem
                  v-if="archivedIds[item.id]"
                  :title="t('unarchive')"
                  prepend-icon="lucide:archive-restore"
                  @click="readd(item.id)"
                />
                <PMenuItem
                  v-else
                  :title="t('archive')"
                  prepend-icon="lucide:archive"
                  @click="startArchive(item.id)"
                />
                <PMenuItem
                  :title="t('delete')"
                  prepend-icon="lucide:trash-2"
                  class="menu-item-danger"
                  @click="startDelete(item.id)"
                />
              </PMenu>
            </div>
          </template>
        </PTable>
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
    :description="t('delete-assignment-warning-archive') || t('archive-assignment-warning') || 'This removes the assignment from your active list. You can restore it from archived assignments.'"
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
      <div style="margin-top: 16px;">
        <PInput v-model="duplicateNewTitle" :label="t('new-assignment-title')" required />
      </div>
    </template>
    <template #footer>
      <PButton variant="ghost" :text="t('back')" class="footer-back-btn" @click="showDuplicateDialog = false" />
      <PButton variant="secondary" color="danger" :text="t('cancel')" @click="showDuplicateDialog = false" />
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
</template>

<script setup>
  import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
  import { useStore } from 'vuex'
  import { useRouter } from 'vue-router'
  import { v4 as uuid } from 'uuid'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import { PModal, PButton, PInput, PMenu, PMenuItem, PAlertDialog, PUnifiedFilter, PUnifiedFilterSection, PUnifiedFilterDateSection, PUnifiedFilterTabSection, PTable } from '@/components/ui/index.js'
  import { useFeedback } from '@/composables/useFeedback.js'
  import { useAssignmentArchive } from '@/composables/useAssignmentArchive.js'
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
  function titleCase(str) { return str?.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) ?? '' }

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
  const selectedItems = ref([])
  const showDetailsModal = ref(false)
  const showSubmissionsView = ref(false)
  const dashboardSubmenuItem = ref(null)
  const {
    successDialog,
    success: showSuccessDialog,
    dismissSuccess: dismissSuccessDialog,
  } = useFeedback()
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
    { value: 'assessment', label: t('assessment') },
    { value: 'practice', label: t('practice') },
    { value: 'homework', label: t('homework') },
    { value: 'learning', label: t('learning') },
    { value: 'Assignment', label: t('assignment') },
  ])

  const assignedToTabs = computed(() => [
    { key: 'all', label: t('all') },
    { key: 'group', label: t('group') },
    { key: 'students', label: t('student') },
  ])

  const ASSIGNED_TO_GROUP_PREFIX = 'group:'
  const ASSIGNED_TO_STUDENT_PREFIX = 'student:'

  const users = reactive({})
  const decryptedNames = reactive(new Map())

  let unwatchUsers
  onMounted(() => {
    unwatchUsers = Agent.watch('users', ({ state }) => {
      Object.entries(state).forEach(([key, value]) => { users[key] = value })
    })
  })
  onBeforeUnmount(() => { if (unwatchUsers) unwatchUsers() })

  const activeGroupIds = computed(() => store.getters['groups/groups']('class', true))

  const teacherStudentIds = computed(() => {
    const myPILAUsers = Object.keys(users)
    return [
      ...myPILAUsers,
      ...store.getters['groups/myStudents']().filter(id => !myPILAUsers.includes(id)),
    ]
  })

  watch(
    teacherStudentIds,
    (ids) => {
      for (const id of ids) {
        if (decryptedNames.has(id)) continue
        store.getters.decryptUserInfo(id, false)
          .then(info => { decryptedNames.set(id, info?.name || '') })
          .catch(() => { decryptedNames.set(id, '') })
      }
    },
    { immediate: true },
  )

  const assignedToOptions = computed(() => {
    const groupEntries = activeGroupIds.value
      .map(gid => {
        const name = store.state.groups.groups[gid]?.name?.trim()
        if (!name) return null
        return {
          value: `${ASSIGNED_TO_GROUP_PREFIX}${gid}`,
          label: name,
          tag: 'group',
          tagLabel: t('group'),
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label))

    const studentEntries = teacherStudentIds.value
      .map(id => {
        const name = decryptedNames.get(id)?.trim()
        if (!name) return null
        return {
          value: `${ASSIGNED_TO_STUDENT_PREFIX}${id}`,
          label: name,
          tag: 'student',
          tagLabel: t('student'),
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label))

    return {
      group: groupEntries,
      students: studentEntries,
    }
  })

  function assignmentMatchesAssignedToFilter(assignmentId, filterValues) {
    const groups = getAssignedGroups(assignmentId)
    return filterValues.some(val => {
      if (val.startsWith(ASSIGNED_TO_GROUP_PREFIX)) {
        return groups.includes(val.slice(ASSIGNED_TO_GROUP_PREFIX.length))
      }
      if (val.startsWith(ASSIGNED_TO_STUDENT_PREFIX)) {
        const studentId = val.slice(ASSIGNED_TO_STUDENT_PREFIX.length)
        return groups.some(gid => store.getters['groups/belongs'](studentId, gid))
      }
      return groups.includes(val)
    })
  }

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
        scheduledDate: state.scheduledDate || null,
        scheduledTime: state.scheduledTime || null,
        status: state.status || null,
        archived: !!state.archived,
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
        const type = (data?.assignmentType || 'Assignment').toLowerCase()
        return data && typeFilter.value.some(v => v.toLowerCase() === type)
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
      items = items.filter(id => assignmentMatchesAssignedToFilter(id, assignedToFilter.value))
    }

    return items
  })

  // ── PTable config ──
  const tableHeaders = computed(() => [
    { key: 'title', title: t('assignment-title') },
    { key: 'dueDate', title: t('due-date') },
    { key: 'status', title: t('publication-status') },
    { key: 'assignedTo', title: t('assigned-to'), sortable: false },
    { key: 'submissions', title: t('assignment-submissions'), sortable: false },
    { key: 'actions', title: t('actions'), sortable: false },
  ])

  const tableItems = computed(() => {
    return assignmentsForActiveTable.value.map(id => ({
      id,
      title: assignmentData[id]?.name || '',
      dueDate: assignmentData[id]?.dueDate ? new Date(assignmentData[id].dueDate).getTime() : 0,
      status: getStatus(id),
    }))
  })

  const hasActiveFilters = computed(() => {
    return searchQuery.value || statusFilter.value.length || typeFilter.value.length || dueDateFilter.value || assignedToFilter.value.length
  })

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

  function canViewSubmissions(id) {
    if (getStatus(id) !== 'Published') return false
    if (!getAssignedGroups(id).length) return false
    const scheduled = assignmentData[id]?.scheduledDate
    if (scheduled) {
      const start = new Date(scheduled)
      if (!Number.isNaN(start.getTime()) && start.getTime() > Date.now()) return false
    }
    return true
  }

  function assignmentRowClass(item) {
    const classes = []
    if (archivedIds.value[item.id]) classes.push('table-row-archived')
    if (item.id === current.value) classes.push('assign-row-current')
    return classes.join(' ')
  }

  const { archiveAssignment, restoreAssignment } = useAssignmentArchive(props.assignable_item_type)

  // ── Helpers ──
  function getAssignedGroups(id) {
    return store.getters['assignments/assignedGroups'](id, props.assignment_type, false)
  }

  function handleRowClick(item) {
    current.value = current.value === item ? null : item
  }

  function formatDate(ts) {
    if (!ts) return '--'
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  }

  function formatTime(ts) {
    if (!ts) return ''
    if (typeof ts === 'string' && /^\d{1,2}:\d{2}/.test(ts)) return ts
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  function getScheduledSubline(id) {
    if (getStatus(id) !== 'Scheduled') return ''
    const data = assignmentData[id]
    if (!data?.scheduledDate && !data?.scheduledTime) return ''
    const parts = []
    if (data.scheduledDate) parts.push(formatDate(data.scheduledDate))
    if (data.scheduledTime) parts.push(formatTime(data.scheduledTime))
    return `${t('for')} ${parts.join(' ')}`
  }

  // ── CRUD actions ──
  function add() {
    const content_id = uuid()
    current.value = content_id
    wasCreating.value = true
    showEditModal.value = true
  }

  const wasSaved = ref(false)
  const lastSaveWasDraft = ref(false)

  function onAssignmentSaved(meta) {
    wasSaved.value = true
    lastSaveWasDraft.value = meta?.asDraft === true
    if (wasCreating.value && current.value) {
      store.dispatch('pila_tags/tag', { content_id: current.value, tag_type: props.assignable_item_type })
    }
  }

  async function readd(content_id) {
    await doRestoreAssignment(content_id)
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

  async function doArchiveAssignment(contentId) {
    try {
      await archiveAssignment(contentId)
      if (assignmentData[contentId]) assignmentData[contentId].archived = true
    } catch (e) {
      console.error(e)
    }
  }

  async function doRestoreAssignment(contentId) {
    try {
      await restoreAssignment(contentId)
      if (assignmentData[contentId]) assignmentData[contentId].archived = false
    } catch (e) {
      console.error(e)
    }
  }

  function confirmArchive() {
    const item = pendingActionItem.value
    if (!item) return
    doArchiveAssignment(item)
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
    doArchiveAssignment(item)
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
        if (lastSaveWasDraft.value) {
          showSuccessDialog(t('draft-saved-successfully') || 'Draft saved successfully')
        } else if (wasCreating.value) {
          showSuccessDialog(t('assignment-successfully-created'))
        } else {
          showSuccessDialog(t('assignment-updated-successfully') || 'Assignment updated successfully')
        }
      }
      wasCreating.value = false
      wasSaved.value = false
      lastSaveWasDraft.value = false
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

.assign-table-wrapper :deep(.table-row-archived) {
  opacity: 0.85;
  background: #fffbeb;
}

:deep(.assign-row-current) {
  background: #eff6ff !important;
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

  .assign-table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin-top: 12px;
  }

  .assign-progress-track {
    width: 120px;
  }
}
</style>
