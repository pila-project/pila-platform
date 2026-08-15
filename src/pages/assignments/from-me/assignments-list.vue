<template>
  <div class="page-container assign-page">
    <h1 class="page-heading assign-heading">{{ t('assign-and-monitor') }}</h1>

    <div class="content-card assign-card">
      <!-- Card header -->
      <div class="assign-card-header">
        <div class="assign-card-title-row">
          <div>
            <h2 class="card-section-title flex items-center gap-2">
              <LucideIcon name="clipboard-list" :size="18" class="text-primary-600" />
              <span>{{ t('my-assignments') }}</span>
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
            id="archive-status"
            :label="t('show-archived')"
            icon="badge-check"
            :options="archiveStatusFilterOptions"
            v-model="archiveStatusFilters"
          />
          <PUnifiedFilterSection
            id="publication-status"
            :label="t('publication-status')"
            icon="table"
            :options="publicationStatusOptions"
            v-model="publicationStatusFilter"
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

      <!-- Multi-select bulk actions (archive / unarchive only — ticket UIUX-101) -->
      <div v-if="selectedItems.length" class="selection-toolbar">
        <span class="selection-count">
          {{ selectedItems.length }} {{ t('selected') }}
        </span>
        <div class="selection-toolbar-spacer" />
        <PButton
          v-if="selectedArchivableIds.length"
          variant="secondary"
          size="sm"
          icon="lucide:archive"
          :text="`${t('archive')} (${selectedArchivableIds.length})`"
          :loading="bulkUnarchiveLoading"
          :disabled="archiveConfirmLoading || bulkUnarchiveLoading"
          @click="startBulkArchive"
        />
        <PButton
          v-if="selectedRestorableIds.length"
          variant="secondary"
          size="sm"
          icon="lucide:archive-restore"
          :text="`${t('unarchive')} (${selectedRestorableIds.length})`"
          :loading="bulkUnarchiveLoading"
          :disabled="archiveConfirmLoading || bulkUnarchiveLoading"
          @click="bulkUnarchiveSelected"
        />
        <PButton
          variant="ghost"
          size="sm"
          :text="t('deselect-all')"
          :disabled="archiveConfirmLoading || bulkUnarchiveLoading"
          @click="clearAssignmentSelection"
        />
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
          :itemsPerPageText="t('rows-per-page')"
          :itemsPerPageOptions="assignmentTablePerPageOptions"
        >
          <template #item.title="{ item }">
            <!-- Fixed max width so long descriptions cannot blow out the table -->
            <div class="assign-cell-title-block">
              <div class="assign-cell-title">
                <PTooltip
                  :text="assignmentData[item.id]?.name || ''"
                  only-if-overflow
                  class="assign-cell-title-text-wrap"
                >
                  <span class="assign-cell-title-text">
                    <vueScopeComponent :id="item.id" :path="['name']" />
                  </span>
                </PTooltip>
                <span
                  v-if="assignmentData[item.id]?.assignmentType"
                  :class="getTypeBadgeClass(assignmentData[item.id].assignmentType)"
                >
                  {{ t(assignmentData[item.id].assignmentType.toLowerCase()) }}
                </span>
              </div>
              <!-- Hover only on the description text (not the whole row/card) -->
              <PTooltip
                :text="assignmentData[item.id]?.description || ''"
                position="top"
                block
                only-if-overflow
              >
                <div class="assign-cell-desc assign-cell-desc--ellipsis">
                  <vueScopeComponent :id="item.id" :path="['description']">
                    <template v-slot="data">
                      {{ data.value || t('no-description') }}
                    </template>
                  </vueScopeComponent>
                </div>
              </PTooltip>
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
                <LucideIcon name="users" :size="12" class="assign-cell-type-icon" />
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
              variant="secondary"
              size="sm"
              :text="t('view')"
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
  />

  <!-- View Submissions -->
  <ViewSubmissions
    v-if="showSubmissionsView"
    :assignmentId="current"
    @close="showSubmissionsView = false"
    @open-dashboard="handleOpenDashboardFromSubmissions"
  />

  <!--
    Dashboard modals stack above View Submissions (reporting uses --z-modal-nested).
    layer="preview" → higher z-index + Escape capture so only the dashboard closes.
  -->
  <PModal
    v-if="showResultsModal"
    layer="preview"
    no-pad-body
    @close="closeDashboard(resultsDashboardType)"
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
      <div class="assign-dashboard-fill">
        <suspense>
          <Dashboard :assignment="current" :url="dashboardUrl" />
        </suspense>
      </div>
    </template>
  </PModal>
  <PModal
    v-if="showCandliResultsModal"
    layer="preview"
    no-pad-body
    @close="closeDashboard('competency')"
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
      <div class="assign-dashboard-fill">
        <CandliDashboard :assignment="current" :games="candliGames" />
      </div>
    </template>
  </PModal>
  <PModal
    v-if="showGenAIDashboardModal"
    layer="preview"
    no-pad-body
    @close="closeDashboard('generative-ai-module')"
    showCloseButton
    :closeButtonText="t('close')"
    width="90vw"
    height="90vh"
  >
    <template v-slot:title>
      <span>{{ t('generative-ai-module-dashboard') }}</span>
    </template>
    <template v-slot:body>
      <div class="assign-dashboard-fill">
        <GenAIDashboard :assignment="current" />
      </div>
    </template>
  </PModal>

  <!-- Confirmation Dialogs -->
  <PModal
    v-if="showDuplicateDialog"
    @close="closeDuplicateDialog"
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
        <LucideIcon name="info" :size="16" class="info-banner-icon" />
        <span>{{ t('duplicate-assignment-description') }}</span>
      </div>
      <div style="margin-top: 16px;">
        <PInput v-model="duplicateNewTitle" :label="t('new-assignment-title')" required />
      </div>
    </template>
    <template #footer>
      <PButton variant="secondary" color="danger" :text="t('cancel')" @click="closeDuplicateDialog" />
      <PButton
        variant="primary"
        :text="t('duplicate-assignment')"
        :disabled="!canConfirmDuplicate"
        :loading="duplicateConfirmLoading"
        @click="confirmDuplicate"
      />
    </template>
  </PModal>
  <PModal
    v-if="showArchiveDialog"
    width="520px"
    @close="closeArchiveDialog"
  >
    <template #title>
      <span class="flex items-center gap-2">
        <LucideIcon name="archive" :size="16" />
        {{ archiveDialogTitle }}
      </span>
    </template>
    <template #body>
      <p class="archive-dialog-intro">{{ archiveDialogIntro }}</p>
      <div class="archive-scope-options">
        <div
          v-for="opt in archiveScopeOptions"
          :key="opt.value"
          class="archive-scope-option"
          @click="archiveScope = opt.value"
        >
          <div class="archive-scope-radio" :class="{ 'archive-scope-radio--selected': archiveScope === opt.value }">
            <div v-if="archiveScope === opt.value" class="archive-scope-radio-dot" />
          </div>
          <div class="archive-scope-content">
            <span class="archive-scope-label">{{ opt.label }}</span>
            <span class="archive-scope-desc">{{ opt.description }}</span>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <PButton variant="secondary" color="danger" :text="t('cancel')" @click="closeArchiveDialog" />
      <PButton
        variant="primary"
        :text="archiveConfirmLabel"
        :loading="archiveConfirmLoading"
        @click="confirmArchive"
      />
    </template>
  </PModal>

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
  import { useRouter, onBeforeRouteLeave } from 'vue-router'
  import { v4 as uuid } from 'uuid'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import { PModal, PButton, PInput, PMenu, PMenuItem, PAlertDialog, PUnifiedFilter, PUnifiedFilterSection, PUnifiedFilterDateSection, PUnifiedFilterTabSection, PTable, PTooltip } from '@/components/ui/index.js'
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
  import { candliGamesForSequenceItems } from '@/candli-games.js'
  import { normalizeSequenceItems } from '@/utils/sequence-items.js'
  import {
    STATUS_FILTER,
    defaultActiveStatusFilters,
    buildStatusFilterOptions,
  } from '@/utils/status-filter.js'
  import {
    ASSIGNMENT_STATUS,
    effectiveAssignmentStatus,
    nextScheduledPublishAt,
    tryPromoteScheduledAssignment,
  } from '@/utils/assignment-status.js'
  import { tablePerPageOptions } from '@/utils/pagination-options.js'
  import { formatStudentPreferredName } from '@/utils/student-display-name.js'

  const props = defineProps({
    assignable_item_type: String,
    assignment_type: String,
  })

  const store = useStore()
  const router = useRouter()
  function t(slug) { return store.getters.t(slug) }
  const assignmentTablePerPageOptions = computed(() => tablePerPageOptions(t))


  // ── Core state ──
  const current = ref(null)
  const showEditModal = ref(false)
  const previewing = ref(null)
  const showResultsModal = ref(false)
  const showCandliResultsModal = ref(false)
  const showGenAIDashboardModal = ref(false)
  const assignmentContainsCandli = ref(null)
  const assignmentContainsGenAI = ref(null)
  const assignmentContainsBetty = ref(null)
  /** Resolved Candli game ids for competency dashboard (trunk: map or embed scan). */
  const candliGames = ref([])
  const dashboardUrl = ref(null)
  const searchQuery = ref('')
  const selectedItems = ref([])
  const showDetailsModal = ref(false)
  const showSubmissionsView = ref(false)
  const openDashboardSession = ref(null)
  const resultsDashboardType = ref('live-monitoring')
  const {
    successDialog,
    success: showSuccessDialog,
    dismissSuccess: dismissSuccessDialog,
    error: toastError,
  } = useFeedback()
  const wasCreating = ref(false)

  // ── Filter state ──
  const archiveStatusFilters = ref(defaultActiveStatusFilters())
  const publicationStatusFilter = ref([])
  const typeFilter = ref([])
  const dueDateFilter = ref(null)
  const assignedToFilter = ref([])
  const assignedToTab = ref('all')

  const archiveStatusFilterOptions = computed(() => buildStatusFilterOptions(t))

  const publicationStatusOptions = computed(() => [
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
    { key: 'group', label: t('groups') },
    { key: 'students', label: t('students') },
  ])

  const ASSIGNED_TO_GROUP_PREFIX = 'group:'
  const ASSIGNED_TO_STUDENT_PREFIX = 'student:'

  const decryptedNames = reactive(new Map())

  onMounted(() => {
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', onAssignmentPageVisible)
    scheduleNextPromoteTimer()
  })
  onBeforeUnmount(() => {
    window.removeEventListener('pagehide', handlePageHide)
    document.removeEventListener('visibilitychange', onAssignmentPageVisible)
    if (promoteTimerId != null) {
      clearTimeout(promoteTimerId)
      promoteTimerId = null
    }
    closeOpenDashboardSession().catch(() => {})
  })

  onBeforeRouteLeave(() => closeOpenDashboardSession().catch(() => {}))

  /** Active (non-archived) class groups the teacher owns — same source as Classes. */
  const activeGroupIds = computed(() => store.getters['groups/groups']('class', true))

  /**
   * UIUX-127: Assigned-to → Students only lists active group members.
   * Do not use Agent.watch('users') (every account ever) for filter options.
   */
  const activeStudentIdsForFilter = computed(() => {
    const ids = new Set()
    for (const gid of activeGroupIds.value) {
      for (const uid of store.getters['groups/members'](gid)) {
        ids.add(uid)
      }
    }
    return [...ids]
  })

  watch(
    activeStudentIdsForFilter,
    (ids) => {
      for (const id of ids) {
        if (decryptedNames.has(id)) continue
        store.getters.decryptUserInfo(id, false)
          .then(info => { decryptedNames.set(id, formatStudentPreferredName(info) || '') })
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

    const studentEntries = activeStudentIdsForFilter.value
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
  const showDuplicateDialog = ref(false)
  const showArchiveDialog = ref(false)
  const archiveScope = ref('me')
  const archiveConfirmLoading = ref(false)
  const pendingActionItem = ref(null)
  /** When non-empty, archive dialog archives these ids (bulk). Single-item uses pendingActionItem only. */
  const pendingBulkArchiveIds = ref([])
  const bulkUnarchiveLoading = ref(false)
  const duplicateNewTitle = ref('')
  const duplicateSourceName = ref('')
  const duplicateConfirmLoading = ref(false)

  const selectedAssignmentIds = computed(() =>
    selectedItems.value.map(item => item?.id).filter(Boolean),
  )
  const selectedArchivableIds = computed(() =>
    selectedAssignmentIds.value.filter(id => !archivedIds.value[id]),
  )
  const selectedRestorableIds = computed(() =>
    selectedAssignmentIds.value.filter(id => !!archivedIds.value[id]),
  )
  const isBulkArchive = computed(() => pendingBulkArchiveIds.value.length > 0)

  function clearAssignmentSelection() {
    selectedItems.value = []
  }

  const canConfirmDuplicate = computed(() => {
    const title = duplicateNewTitle.value.trim()
    if (!title) return false
    return title.toLowerCase() !== duplicateSourceName.value.trim().toLowerCase()
  })

  const pendingActionName = computed(() => {
    if (!pendingActionItem.value) return ''
    return assignmentData[pendingActionItem.value]?.name || t('this-assignment')
  })

  const pendingArchiveGroupCount = computed(() => {
    if (!pendingActionItem.value) return 0
    return getAssignedGroups(pendingActionItem.value).length
  })

  const archiveDialogTitle = computed(() => {
    if (isBulkArchive.value) {
      return t('bulk-archive-assignments-confirm-title')
        .replace('{count}', String(pendingBulkArchiveIds.value.length))
    }
    return t('archive-assignment-confirm-title')
  })

  const archiveDialogIntro = computed(() => {
    if (isBulkArchive.value) {
      return t('bulk-archive-assignments-confirm-intro')
        .replace('{count}', String(pendingBulkArchiveIds.value.length))
    }
    return t('archive-assignment-confirm-intro').replace('{name}', pendingActionName.value)
  })

  const archiveScopeOptions = computed(() => {
    if (isBulkArchive.value) {
      return [
        {
          value: 'me',
          label: t('archive-assignment-for-me-label'),
          description: t('bulk-archive-assignments-for-me-description'),
        },
        {
          value: 'all',
          label: t('archive-assignment-for-all-label'),
          description: t('bulk-archive-assignments-for-all-description'),
        },
      ]
    }

    const groupCount = pendingArchiveGroupCount.value
    const groupsPhrase = groupCount === 1
      ? t('archive-assignment-one-group')
      : t('archive-assignment-n-groups').replace('{count}', String(groupCount))

    return [
      {
        value: 'me',
        label: t('archive-assignment-for-me-label'),
        description: groupCount > 0
          ? t('archive-assignment-for-me-description').replace('{groups}', groupsPhrase)
          : t('archive-assignment-for-me-description-draft'),
      },
      {
        value: 'all',
        label: t('archive-assignment-for-all-label'),
        description: groupCount > 0
          ? t('archive-assignment-for-all-description').replace('{groups}', groupsPhrase)
          : t('archive-assignment-for-all-description-draft'),
      },
    ]
  })

  const archiveConfirmLabel = computed(() =>
    archiveScope.value === 'all'
      ? t('archive-assignment-for-all-label')
      : t('archive-assignment-for-me-label'),
  )

  // ── Assignment data cache (for search/filter) ──
  const assignmentData = reactive({})

  async function loadAssignmentData(id) {
    if (assignmentData[id]) return
    try {
      const state = await Agent.state(id)
      assignmentData[id] = snapshotAssignmentData(state)
      // Teacher-only: persist Scheduled → Published when due (idempotent)
      await promoteAssignmentIfDue(id)
    } catch {
      assignmentData[id] = { name: '', description: '' }
    }
  }

  function snapshotAssignmentData(state) {
    return {
      name: state.name || '',
      description: state.description || '',
      content: state.content || null,
      assignmentType: state.assignmentType || 'Assignment',
      dueDate: state.dueDate || null,
      dueTime: state.dueTime || null,
      scheduledDate: state.scheduledDate || null,
      scheduledTime: state.scheduledTime || null,
      status: state.status || null,
      publishedAt: state.publishedAt || null,
      archived: !!state.archived,
    }
  }

  async function promoteAssignmentIfDue(id) {
    const result = await tryPromoteScheduledAssignment(id)
    if (!result.promoted) return false
    if (assignmentData[id]) {
      assignmentData[id].status = ASSIGNMENT_STATUS.PUBLISHED
      if (!assignmentData[id].publishedAt) {
        assignmentData[id].publishedAt = new Date().toISOString()
      }
    }
    return true
  }

  async function promoteAllLoadedScheduled() {
    const ids = Object.keys(assignmentData)
    let any = false
    for (const id of ids) {
      if (assignmentData[id]?.status !== ASSIGNMENT_STATUS.SCHEDULED) continue
      if (await promoteAssignmentIfDue(id)) any = true
    }
    if (any) scheduleNextPromoteTimer()
    return any
  }

  let promoteTimerId = null

  function scheduleNextPromoteTimer() {
    if (promoteTimerId != null) {
      clearTimeout(promoteTimerId)
      promoteTimerId = null
    }
    const snapshots = Object.values(assignmentData)
    const nextAt = nextScheduledPublishAt(snapshots)
    if (nextAt == null) return
    const delay = Math.min(Math.max(nextAt - Date.now() + 100, 100), 2147483647)
    promoteTimerId = setTimeout(async () => {
      promoteTimerId = null
      await promoteAllLoadedScheduled()
      scheduleNextPromoteTimer()
    }, delay)
  }

  function onAssignmentPageVisible() {
    if (document.visibilityState === 'visible') {
      promoteAllLoadedScheduled().then(() => scheduleNextPromoteTimer())
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

  // Active always; Archived chip adds archived (status-filter semantics).
  const allAssignments = computed(() => {
    const ids = [...assignable_items.value]
    if (archiveStatusFilters.value.includes(STATUS_FILTER.ARCHIVED)) {
      ids.push(...archived_assignable_items.value)
    }
    return ids
  })

  // Load data for all assignments; promote due Scheduled → Published
  watch(allAssignments, async (items) => {
    await Promise.all(items.map(id => loadAssignmentData(id)))
    scheduleNextPromoteTimer()
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

    // Publication status filter
    if (publicationStatusFilter.value.length > 0) {
      items = items.filter(id => publicationStatusFilter.value.includes(getStatus(id)))
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
    { key: 'submissions', title: t('reporting-dashboard'), sortable: false },
    { key: 'actions', title: t('actions'), sortable: false },
  ])

  function getAssignmentUpdated(id) {
    return store.getters['pila_tags/tagUpdatedForContent'](id, props.assignable_item_type)
  }

  const tableItems = computed(() => {
    const items = assignmentsForActiveTable.value.map(id => ({
      id,
      title: assignmentData[id]?.name || '',
      dueDate: assignmentData[id]?.dueDate ? new Date(assignmentData[id].dueDate).getTime() : 0,
      status: getStatus(id),
      updated: getAssignmentUpdated(id),
    }))
    return items.sort((a, b) => b.updated - a.updated)
  })

  const hasNonDefaultArchiveStatusFilter = computed(() =>
    archiveStatusFilters.value.includes(STATUS_FILTER.ARCHIVED),
  )

  const hasActiveFilters = computed(() => {
    return searchQuery.value
      || hasNonDefaultArchiveStatusFilter.value
      || publicationStatusFilter.value.length
      || typeFilter.value.length
      || dueDateFilter.value
      || assignedToFilter.value.length
  })

  // ── Status derivation (effective: due Scheduled reads as Published) ──
  function getStatus(id) {
    const data = assignmentData[id]
    return effectiveAssignmentStatus(data, {
      hasAssignedGroups: getAssignedGroups(id).length > 0,
    })
  }

  function getStatusBadgeClass(id) {
    const s = getStatus(id)
    if (s === ASSIGNMENT_STATUS.PUBLISHED) return 'assign-badge assign-badge-published'
    if (s === ASSIGNMENT_STATUS.DRAFT) return 'assign-badge assign-badge-draft'
    return 'assign-badge assign-badge-scheduled'
  }

  function getTypeBadgeClass(type) {
    const t = (type || '').toLowerCase()
    if (t === 'assessment') return 'assign-type-pill assign-type-assessment'
    if (t === 'homework') return 'assign-type-pill assign-type-homework'
    if (t === 'practice') return 'assign-type-pill assign-type-practice'
    if (t === 'learning') return 'assign-type-pill assign-type-learning'
    return 'assign-type-pill assign-type-default'
  }

  // ── Due date ──
  function getDueDate(id) {
    const data = assignmentData[id]
    if (data?.dueDate) return formatDate(data.dueDate)
    return t('not-set')
  }

  function canViewSubmissions(id) {
    // Effective Published already requires schedule due when status was Scheduled
    if (getStatus(id) !== ASSIGNMENT_STATUS.PUBLISHED) return false
    if (!getAssignedGroups(id).length) return false
    return true
  }

  function assignmentRowClass(item) {
    const classes = []
    if (archivedIds.value[item.id]) classes.push('table-row-archived')
    if (item.id === current.value) classes.push('assign-row-current')
    return classes.join(' ')
  }

  const { archiveAssignment, archiveAssignmentForAll, restoreAssignment } = useAssignmentArchive(props.assignable_item_type)

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
    if (getStatus(id) !== ASSIGNMENT_STATUS.SCHEDULED) return ''
    const data = assignmentData[id]
    if (!data?.scheduledDate) return ''
    const parts = [formatDate(data.scheduledDate)]
    if (data.scheduledTime) parts.push(formatTime(data.scheduledTime))
    return `${t('publishes-on')} ${parts.join(' ')}`
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
    duplicateNewTitle.value = `${t('copy-of')} ${name}`
    showDuplicateDialog.value = true
  }

  function closeDuplicateDialog({ force = false } = {}) {
    if (!force && duplicateConfirmLoading.value) return
    showDuplicateDialog.value = false
    pendingActionItem.value = null
    duplicateNewTitle.value = ''
    duplicateSourceName.value = ''
  }

  function copyAssignmentState(sourceState, newState, title) {
    newState.name = title
    newState.description = sourceState.description || ''
    newState.content = Array.isArray(sourceState.content)
      ? [...sourceState.content]
      : (sourceState.content || null)
    newState.assignmentType = sourceState.assignmentType || 'Assignment'
    newState.dueDate = sourceState.dueDate || null
    newState.dueTime = sourceState.dueTime || null
    newState.allowLate = sourceState.allowLate
    newState.maxAttempts = sourceState.maxAttempts || '1 attempt'
    newState.feedbackTiming = sourceState.feedbackTiming || 'At the end'
    newState.shuffleQuestions = sourceState.shuffleQuestions
    newState.showAnswers = sourceState.showAnswers
    newState.teacherNotes = sourceState.teacherNotes || ''
    newState.status = 'Draft'
    newState.scheduledDate = null
    newState.scheduledTime = null
  }

  async function confirmDuplicate() {
    const sourceId = pendingActionItem.value
    if (!sourceId || !canConfirmDuplicate.value || duplicateConfirmLoading.value) return

    duplicateConfirmLoading.value = true
    const newId = uuid()

    try {
      const sourceState = await Agent.state(sourceId)
      const newState = await Agent.state(newId)
      const title = duplicateNewTitle.value.trim()

      copyAssignmentState(sourceState, newState, title)

      await Agent.synced()
      await store.dispatch('pila_tags/tag', {
        content_id: newId,
        tag_type: props.assignable_item_type,
      })

      delete assignmentData[newId]
      await loadAssignmentData(newId)

      closeDuplicateDialog({ force: true })
      showSuccessDialog(t('assignment-successfully-created'))
    } catch (e) {
      console.error('[assignments-list] duplicate error:', e)
      toastError(t('something-went-wrong'))
    } finally {
      duplicateConfirmLoading.value = false
    }
  }

  // ── Archive ──
  function startArchive(item) {
    pendingActionItem.value = item
    pendingBulkArchiveIds.value = []
    archiveScope.value = 'me'
    showArchiveDialog.value = true
  }

  function startBulkArchive() {
    const ids = [...selectedArchivableIds.value]
    if (!ids.length) return
    pendingActionItem.value = null
    pendingBulkArchiveIds.value = ids
    archiveScope.value = 'me'
    showArchiveDialog.value = true
  }

  function closeArchiveDialog() {
    if (archiveConfirmLoading.value) return
    showArchiveDialog.value = false
    archiveConfirmLoading.value = false
    pendingActionItem.value = null
    pendingBulkArchiveIds.value = []
  }

  async function doArchiveAssignment(contentId, scope = 'me') {
    if (scope === 'all') {
      await archiveAssignmentForAll(contentId, props.assignment_type)
    } else {
      await archiveAssignment(contentId)
    }
    if (assignmentData[contentId]) assignmentData[contentId].archived = true
  }

  async function doRestoreAssignment(contentId) {
    try {
      await restoreAssignment(contentId)
      if (assignmentData[contentId]) assignmentData[contentId].archived = false
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  async function confirmArchive() {
    if (archiveConfirmLoading.value) return

    const bulkIds = pendingBulkArchiveIds.value
    const singleId = pendingActionItem.value
    if (!bulkIds.length && !singleId) return

    archiveConfirmLoading.value = true
    try {
      if (bulkIds.length) {
        for (const id of bulkIds) {
          await doArchiveAssignment(id, archiveScope.value)
          if (current.value === id) current.value = null
        }
        selectedItems.value = selectedItems.value.filter(
          item => !bulkIds.includes(item.id),
        )
      } else {
        await doArchiveAssignment(singleId, archiveScope.value)
        if (current.value === singleId) current.value = null
        selectedItems.value = selectedItems.value.filter(item => item.id !== singleId)
      }

      const successKey = archiveScope.value === 'all'
        ? 'archive-assignment-archived-for-all-success'
        : 'archive-assignment-archived-for-me-success'
      showSuccessDialog(t(successKey))
      showArchiveDialog.value = false
      pendingActionItem.value = null
      pendingBulkArchiveIds.value = []
    } catch (e) {
      console.error(e)
      toastError(t('something-went-wrong'))
    } finally {
      archiveConfirmLoading.value = false
    }
  }

  async function bulkUnarchiveSelected() {
    const ids = [...selectedRestorableIds.value]
    if (!ids.length || bulkUnarchiveLoading.value) return

    bulkUnarchiveLoading.value = true
    try {
      let restored = 0
      for (const id of ids) {
        if (await doRestoreAssignment(id)) restored++
      }
      if (!restored) {
        toastError(t('something-went-wrong'))
        return
      }
      selectedItems.value = selectedItems.value.filter(item => !ids.includes(item.id))
      showSuccessDialog(t('assignments-restored-successfully'))
    } finally {
      bulkUnarchiveLoading.value = false
    }
  }

  // ── Dashboard ──
  function primaryDashboardType() {
    return assignmentContainsBetty.value || assignmentContainsGenAI.value ? 'activity' : 'live-monitoring'
  }

  async function openDashboardWithXapi(item, dashboard, { skipReassess = false } = {}) {
    current.value = item
    if (!skipReassess) await reassessContents()

    if (dashboard === 'competency') showCandliResultsModal.value = true
    else if (dashboard === 'generative-ai-module') showGenAIDashboardModal.value = true
    else {
      resultsDashboardType.value = dashboard
      showResultsModal.value = true
    }

    openDashboardSession.value = { assignment: item, dashboard }
    await writeDashboardXapi('opened-dashboard', item, dashboard)
  }

  async function openDashboard(item) {
    current.value = item
    await reassessContents()
    await openDashboardWithXapi(item, primaryDashboardType(), { skipReassess: true })
  }

  async function openCandliDashboard(item) {
    // Trunk: only open competency dashboard when games resolved
    if (!candliGames.value.length) {
      await reassessContents()
    }
    if (!candliGames.value.length) return
    await openDashboardWithXapi(item, 'competency')
  }

  async function openLiveDashboard(item) {
    await openDashboardWithXapi(item, 'live-monitoring')
  }

  async function openGenAIDashboard(item) {
    await openDashboardWithXapi(item, 'generative-ai-module')
  }

  async function closeDashboard(dashboard) {
    if (dashboard === 'competency') showCandliResultsModal.value = false
    else if (dashboard === 'generative-ai-module') showGenAIDashboardModal.value = false
    else showResultsModal.value = false

    await closeOpenDashboardSession()
  }

  function handlePageHide() {
    closeOpenDashboardSession().catch(() => {})
  }

  async function closeOpenDashboardSession() {
    const session = openDashboardSession.value
    if (!session) return

    openDashboardSession.value = null
    await writeDashboardXapi('closed-dashboard', session.assignment, session.dashboard)
  }

  async function writeDashboardXapi(verb, assignment, dashboard) {
    if (!assignment) return

    const { auth: { user } } = await Agent.environment()
    const xapi = await Agent.state(`teacher-dashboard-${assignment}-xapi`)
    xapi.xapi = {
      actor: user,
      authority: user,
      verb,
      object: assignment,
      extensions: {
        dashboard,
      },
    }
  }

  /**
   * Open a dashboard from reporting without tearing down View Submissions.
   * Dashboard PModal uses layer="preview" so it stacks above the reporting overlay;
   * closing the dashboard returns to reporting (not the assignments list).
   */
  async function handleOpenDashboardFromSubmissions(type) {
    if (type === 'competency') {
      if (!candliGames.value.length) await reassessContents()
      if (!candliGames.value.length) return
      await openCandliDashboard(current.value)
    } else if (type === 'genai') {
      await openGenAIDashboard(current.value)
    } else if (type === 'live') {
      await openLiveDashboard(current.value)
    } else {
      await openDashboard(current.value)
    }
  }

  /**
   * Trunk parity: games from static CANDLI_SEQUENCES map, else scan sequence
   * items for custom/embed Candli games (candliGamesForSequenceItems).
   */
  async function resolveCandliGamesForContent(contentId) {
    if (!contentId) return []
    if (CANDLI_SEQUENCES[contentId]) return [...CANDLI_SEQUENCES[contentId]]
    try {
      const sequence = await Agent.state(contentId)
      const rawItems = sequence?.items
      const items = Array.isArray(rawItems)
        ? rawItems
        : normalizeSequenceItems(rawItems).map((id) => ({ id }))
      return await candliGamesForSequenceItems(items)
    } catch {
      return []
    }
  }

  async function reassessContents() {
    const assignmentId = current.value
    assignmentContainsCandli.value = null
    assignmentContainsGenAI.value = null
    assignmentContainsBetty.value = null
    candliGames.value = []
    dashboardUrl.value = null
    if (!assignmentId) return

    const stateData = await Agent.state(assignmentId)
    if (current.value !== assignmentId) return
    const rawContent = stateData.content
    const contentIds = Array.isArray(rawContent) ? rawContent : (rawContent ? [rawContent] : [])
    const allGames = []

    for (const content of contentIds) {
      const games = await resolveCandliGamesForContent(content)
      if (current.value !== assignmentId) return
      if (games.length) {
        assignmentContainsCandli.value = true
        allGames.push(...games)
      }
      if (GEN_AI_SEQUENCES[content]) assignmentContainsGenAI.value = true
      try {
        const contentState = await Agent.state(content)
        if (current.value !== assignmentId) return
        if (contentState?.id?.includes('betty')) {
          assignmentContainsBetty.value = true
        }
        const meta = await Agent.metadata(content)
        if (current.value !== assignmentId) return
        if (meta?.domain === 'datawise.accingo.co') {
          dashboardUrl.value = 'https://datawise.accingo.co/dashboard'
        } else if (contentState?.reference?.dashboard) {
          dashboardUrl.value = 'https://' + contentState.reference.dashboard
        }
      } catch {
        /* ignore per-content probe failures */
      }
    }
    if (current.value === assignmentId) {
      candliGames.value = [...new Set(allGames.filter(Boolean))]
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
          showSuccessDialog(t('draft-saved-successfully'))
        } else if (wasCreating.value) {
          showSuccessDialog(t('assignment-successfully-created'))
        } else {
          showSuccessDialog(t('assignment-updated-successfully'))
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

/* Multi-select bulk bar */
.selection-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.selection-count {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.selection-toolbar-spacer {
  flex: 1;
  min-width: 8px;
}

/* Table */
.assign-table-wrapper {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  margin-top: 16px;
}

/*
 * Title column is 2nd after the select checkbox — cap width so long
 * descriptions cannot stretch the table.
 */
.assign-table-wrapper :deep(thead th:nth-child(2)),
.assign-table-wrapper :deep(tbody td:nth-child(2)) {
  max-width: 320px;
  width: 320px;
}

.assign-table-wrapper :deep(.table-row-archived) {
  opacity: 0.85;
  background: #fffbeb;
}

:deep(.assign-row-current) {
  background: #eff6ff !important;
}

.assign-cell-title-block {
  max-width: 320px;
  min-width: 0;
  width: 100%;
}

.assign-cell-title {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  width: 100%;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  line-height: 1.4;
}

.assign-cell-type-icon {
  flex-shrink: 0;
  color: #64748b;
}

/*
 * Title sizes to content (not column width) so the pill sits immediately after.
 * flex-shrink allows long titles to ellipsis; pill stays full (flex-shrink: 0).
 * Class lands on PTooltip's .tooltip-anchor root.
 */
.assign-cell-title-text-wrap {
  display: block !important;
  min-width: 0;
  flex: 0 1 auto;
  width: auto !important;
  max-width: 100%;
  overflow: hidden;
}

.assign-cell-title-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assign-cell-title-text :deep(*) {
  display: inline;
}

.assign-cell-desc {
  font-size: 12px;
  font-weight: 400;
  color: #64748b;
  margin-top: 2px;
  line-height: 1.4;
}

/* Single-line ellipsis; full text via PTooltip only-if-overflow on this node only */
.assign-cell-desc--ellipsis {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* Compact type pill next to title — never ellipsis; title truncates instead */
.assign-type-pill {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  max-width: none;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 500;
  line-height: 14px;
  white-space: nowrap;
  border: 1px solid transparent;
}
.assign-type-assessment {
  color: #2563eb;
  background: #eff6ff;
  border-color: #bfdbfe;
}
.assign-type-homework {
  color: #16a34a;
  background: #f0fdf4;
  border-color: #bbf7d0;
}
.assign-type-practice {
  color: #7c3aed;
  background: #f5f3ff;
  border-color: #ddd6fe;
}
.assign-type-learning {
  color: #0891b2;
  background: #ecfeff;
  border-color: #a5f3fc;
}
.assign-type-default {
  color: #64748b;
  background: #f8fafc;
  border-color: #e2e8f0;
}

/* Danger menu item */
.menu-item-danger {
  color: #dc2626 !important;
}
.menu-item-danger:hover {
  background: #fef2f2 !important;
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

.footer-cancel-btn {
  color: #dc2626 !important;
}

/* Dashboard iframe / embeds fill body only (header + footer stay clickable) */
.assign-dashboard-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
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

.archive-dialog-intro {
  font-size: 13px;
  line-height: 1.5;
  color: #64748b;
  margin: 0 0 16px;
}

.archive-scope-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.archive-scope-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 150ms, background 150ms;
}

.archive-scope-option:hover {
  background: #f8fafc;
}

.archive-scope-radio {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.archive-scope-radio--selected {
  border-color: #2563eb;
}

.archive-scope-radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2563eb;
}

.archive-scope-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.archive-scope-label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.archive-scope-desc {
  font-size: 12px;
  line-height: 1.45;
  color: #64748b;
}
</style>
