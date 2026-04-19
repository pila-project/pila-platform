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
        <div class="assign-filters">
          <button
            v-for="filter in filterButtons"
            :key="filter"
            class="filter-chip-btn"
          >
            {{ filter }}
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
                <input type="checkbox" class="assign-checkbox" />
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
                {{ t('no-data-available') }}
              </td>
            </tr>
            <tr
              v-for="(item, index) in assignmentsForActiveTable"
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
                <vueScopeComponent metadata :id="item" :path="['created']">
                  <template v-slot="data">
                    <span class="assign-cell-text">
                      {{ data.loading ? '—' : formatDate(data.value) }}
                    </span>
                  </template>
                </vueScopeComponent>
              </td>
              <!-- Publication status (placeholder) -->
              <td class="assign-td">
                <span :class="statusBadgeClass(index)">
                  {{ statusLabel(index) }}
                </span>
              </td>
              <!-- Assigned to -->
              <td class="assign-td">
                <template v-if="getAssignedGroups(item).length > 0">
                  <div class="assign-cell-title">
                    <vueScopeComponent
                      v-for="(groupId, gi) in getAssignedGroups(item).slice(0, 1)"
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
              <!-- Assignment submissions (placeholder) -->
              <td class="assign-td assign-td-submissions">
                <template v-if="getAssignedGroups(item).length > 0">
                  <div class="assign-progress-track">
                    <div class="assign-progress-fill" :style="{ width: placeholderProgress(index) + '%' }" />
                  </div>
                  <span class="assign-cell-desc">{{ placeholderProgress(index) }}%</span>
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
                    title="Edit"
                    prepend-icon="fa-solid fa-pencil"
                    @click="openEdit(item)"
                  />
                  <PMenuItem
                    title="Preview"
                    prepend-icon="fa-regular fa-eye"
                    @click="openPreview(item)"
                  />
                  <PMenuItem
                    title="Dashboard"
                    prepend-icon="fa-solid fa-chart-bar"
                    @click="openDashboard(item)"
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
                    @click="remove(item)"
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

  <!-- Modals -->
  <CreateEditAssignmentModal
    v-if="showEditModal"
    @close="showEditModal = false"
    :researcher="props.assignable_item_type === 'researcher-created'"
    :teacher="props.assignable_item_type === 'teacher-created'"
    :id="current"
  />
  <PreviewModal
    v-if="previewing"
    :id="previewing"
    @close="previewing = null"
  />
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
</template>

<script setup>
  import { ref, reactive, computed, watch } from 'vue'
  import { useStore } from 'vuex'
  import { useRouter } from 'vue-router'
  import { v4 as uuid } from 'uuid'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import { PModal } from '@/components/ui/index.js'
  import PreviewModal from '@/components/common/preview-modal.vue'
  import Dashboard from './dashboard/index.vue'
  import CreateEditAssignmentModal from './create-edit-assignment-modal.vue'
  import CandliDashboard from './candli-dashboard.vue'
  import GenAIDashboard from './gen-ai-dashboard.vue'
  import { CANDLI_SEQUENCES, GEN_AI_SEQUENCES } from '@/utils/constants.js'
  import { PButton, PInput, PMenu, PMenuItem } from '@/components/ui/index.js'

  const props = defineProps({
    assignable_item_type: String,
    assignment_type: String,
  })

  const store = useStore()
  const router = useRouter()
  function t(slug) { return store.getters.t(slug) }

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

  const filterButtons = ['Status', 'Assignment type', 'Assigned To', 'Due Date Range']

  const assignable_items = computed(() =>
    store.getters['pila_tags/withTag'](props.assignable_item_type)
  )
  const archived_assignable_items = computed(() =>
    store.getters['pila_tags/archivedWithTag'](props.assignable_item_type)
  )
  const archivedIds = computed(() =>
    Object.fromEntries(archived_assignable_items.value.map(id => [id, true]))
  )
  const assignmentsForActiveTable = computed(() => {
    if (showArchived.value) return [...assignable_items.value, ...archived_assignable_items.value]
    return assignable_items.value
  })

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
    if (!ts) return '—'
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  }

  // Placeholder status cycling for visual demo
  const statuses = ['Published', 'Draft', 'Published', 'Scheduled']
  function statusLabel(index) { return statuses[index % statuses.length] }
  function statusBadgeClass(index) {
    const s = statusLabel(index)
    if (s === 'Published') return 'assign-badge assign-badge-published'
    if (s === 'Draft') return 'assign-badge assign-badge-draft'
    return 'assign-badge assign-badge-scheduled'
  }

  // Placeholder progress for visual demo
  function placeholderProgress(index) {
    return [40, 0, 80, 0][index % 4]
  }

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

  async function openPreview(item) {
    const { content } = await Agent.state(item)
    previewing.value = content
  }

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
  watch(showEditModal, v => { if (!v) reassessContents() })
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
</style>
