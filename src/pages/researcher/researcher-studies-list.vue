<template>
  <div class="split-panes">
    <div class="pane">
      <div class="wrapper">
        <div class="studies-header">
          <div class="studies-header-left">
            <h3 class="studies-title">{{ t('my-assignments') }}</h3>
            <PButton
              icon="plus-circle"
              variant="primary"
              :text="t('new-assignment')"
              @click="add"
            />
          </div>
          <ShowArchivedToggle v-model="showArchived" />
        </div>

        <PTable
          :headers="tableHeaders"
          :items="tableItems"
          itemKey="id"
          clickableRows
          :rowClass="rowClass"
          :noDataText="t('no-data-available')"
          :itemsPerPage="-1"
          @click:row="(_, { item }) => handleRowClick(item.id)"
        >
          <template #item.assignment_name="{ item }">
            <vueScopeComponent :id="item.id" :path="['name']" />
          </template>
          <template #item.classes_assigned="{ item }">
            <span
              v-if="assignedGroups(item.id).length === 0"
              class="studies-no-classes"
            ><em>{{ t('no-classes-assigned') }}</em></span>
            <span
              v-for="(groupId, index) in assignedGroups(item.id)"
              :key="groupId"
            >
              {{ index > 0 ? ', ' : '' }}
              <vueScopeComponent :id="groupId" :path="['name']" />
            </span>
          </template>
          <template #item.assignment_date="{ item }">
            <vueScopeComponent metadata :id="item.id" :path="['created']">
              <template #default="data">
                {{ data.loading ? '-' : (new Date(data.value)).toLocaleString() }}
              </template>
            </vueScopeComponent>
          </template>
          <template #item.archived="{ item }">
            <span v-if="archivedIds[item.id]">✘</span>
          </template>
        </PTable>
      </div>
    </div>

    <div v-if="current" :key="current" class="pane">
      <div class="studies-detail">
        <div class="studies-detail-header">
          <h3 class="studies-detail-title">
            <vueScopeComponent :id="current" :path="['name']" />
          </h3>
          <div class="studies-detail-actions">
            <PButton
              icon="pencil"
              variant="primary"
              :text="t('modify')"
              @click="showEditModal = true"
            />
            <PButton
              v-if="archivedIds[current]"
              icon="archive"
              variant="primary"
              :text="t('unarchive')"
              @click="readd(current)"
            />
            <PButton
              v-else
              icon="archive"
              variant="secondary"
              :text="t('archive')"
              @click="remove(current)"
            />
          </div>
        </div>

        <div class="studies-detail-body">
          <div class="studies-detail-main">
            <PButton
              icon="eye"
              variant="primary"
              :text="t('preview')"
              @click="preview(current)"
            />
            <PButton
              icon="layout-dashboard"
              variant="primary"
              :text="assignmentContainsBetty || assignmentContainsGenAI ? t('activity-dashboard') : t('live-monitoring-dashboard')"
              @click="openDashboard(primaryDashboardType())"
            />
            <PButton
              v-if="assignmentContainsCandli"
              icon="layout-dashboard"
              variant="primary"
              :text="t('competency-dashboard')"
              @click="openDashboard('competency')"
            />
            <PButton
              v-if="assignmentContainsGenAI"
              icon="layout-dashboard"
              variant="primary"
              :text="t('generative-ai-module-dashboard')"
              @click="openDashboard('generative-ai-module')"
            />
          </div>

          <div class="studies-detail-side">
            <h4 class="studies-side-title">{{ t('class-assigned') }}</h4>
            <table class="studies-groups-table">
              <tbody>
                <tr v-for="id in assignedGroups(current)" :key="id">
                  <td>
                    <vueScopeComponent :id="id" :path="['name']" />
                  </td>
                </tr>
                <tr v-for="n in Math.max(0, 4 - assignedGroups(current).length)" :key="`placeholder-${n}`">
                  <td>-</td>
                </tr>
              </tbody>
            </table>
            <div class="studies-feedback">
              <PButton
                icon="message-square"
                variant="primary"
                :text="t('send-feedback')"
                @click="goToSupport"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <CreateEditAssignmentModal
    v-if="showEditModal"
    :researcher="assignable_item_type === 'researcher-created'"
    :teacher="assignable_item_type === 'teacher-created'"
    :id="current"
    @close="showEditModal = false"
  />
  <PreviewModal
    v-if="previewing"
    :id="previewing"
    @close="previewing = null"
  />
  <PModal
    v-if="showResultsModal"
    :closeButtonText="t('close')"
    showCloseButton
    width="90vw"
    height="90vh"
    @close="closeDashboard(primaryDashboardType())"
  >
    <template #title>
      <span>
        {{ assignmentContainsBetty || assignmentContainsGenAI ? t('activity-dashboard') : t('live-monitoring-dashboard') }} -
        <vueScopeComponent :id="current" :path="['name']" />
      </span>
    </template>
    <template #body>
      <suspense>
        <Dashboard :assignment="current" :url="dashboardUrl" />
      </suspense>
    </template>
  </PModal>
  <PModal
    v-if="showCandliResultsModal"
    showCloseButton
    :closeButtonText="t('close')"
    width="90vw"
    height="90vh"
    @close="closeDashboard('competency')"
  >
    <template #title>
      <span>
        {{ t('competency-dashboard') }} -
        <vueScopeComponent :id="current" :path="['name']" />
      </span>
    </template>
    <template #body>
      <div class="studies-dashboard-body">
        <CandliDashboard :assignment="current" />
      </div>
    </template>
  </PModal>
  <PModal
    v-if="showGenAIDashboardModal"
    showCloseButton
    :closeButtonText="t('close')"
    width="90vw"
    height="90vh"
    @close="closeDashboard('generative-ai-module')"
  >
    <template #title>
      <span>{{ t('generative-ai-module-dashboard') }}</span>
    </template>
    <template #body>
      <div class="studies-dashboard-body">
        <GenAIDashboard :assignment="current" />
      </div>
    </template>
  </PModal>
</template>

<script setup>
  import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
  import { useStore } from 'vuex'
  import { useRouter, onBeforeRouteLeave } from 'vue-router'
  import { v4 as uuid } from 'uuid'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import { PButton, PModal, PTable } from '@/components/ui/index.js'
  import ShowArchivedToggle from '@/components/common/show-archived-toggle.vue'
  import PreviewModal from '@/components/common/preview-modal.vue'
  import Dashboard from '@/pages/assignments/from-me/dashboard/index.vue'
  import CreateEditAssignmentModal from '@/pages/assignments/from-me/create-edit-assignment-modal.vue'
  import CandliDashboard from '@/pages/assignments/from-me/candli-dashboard.vue'
  import GenAIDashboard from '@/pages/assignments/from-me/gen-ai-dashboard.vue'
  import { CANDLI_SEQUENCES, GEN_AI_SEQUENCES } from '@/utils/constants.js'

  const props = defineProps({
    assignable_item_type: String,
    assignment_type: String,
  })

  const store = useStore()
  const router = useRouter()
  function t(slug) { return store.getters.t(slug) }

  const idToCreated = {}

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
  const openDashboardSession = ref(null)

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
    if (showArchived.value) {
      return [...assignable_items.value, ...archived_assignable_items.value]
    }
    return assignable_items.value
  })

  const tableHeaders = computed(() => {
    const headers = [
      { key: 'assignment_name', title: t('assignment'), sortable: false },
      { key: 'classes_assigned', title: t('classes-assigned'), sortable: false },
      { key: 'assignment_date', title: t('assignment-date') },
    ]
    if (showArchived.value) {
      headers.push({ key: 'archived', title: t('archived'), sortable: false })
    }
    return headers
  })

  const tableItems = computed(() =>
    assignmentsForActiveTable.value.map(id => ({
      id,
      assignmentDate: idToCreated[id] || 0,
    }))
  )

  watch(assignmentsForActiveTable, (items) => {
    items.forEach(async (id) => {
      if (idToCreated[id] != null) return
      idToCreated[id] = await Agent.metadata(id).then(md => md.created)
    })
  }, { immediate: true })

  watch(current, () => {
    reassessContents()
  })

  watch(showEditModal, (value) => {
    if (!value) reassessContents()
  })

  onMounted(() => {
    window.addEventListener('pagehide', handlePageHide)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pagehide', handlePageHide)
    closeOpenDashboardSession().catch(() => {})
  })

  onBeforeRouteLeave((_to, _from, next) => {
    closeOpenDashboardSession()
      .catch(() => {})
      .finally(next)
  })

  function rowClass(item) {
    return item.id === current.value ? 'studies-row-current' : ''
  }

  function handleRowClick(id) {
    current.value = current.value === id ? null : id
  }

  function assignedGroups(id) {
    return store.getters['assignments/assignedGroups'](id, props.assignment_type, false)
  }

  function goToSupport() {
    router.push(`/teacher/support?assignment=${current.value}`)
  }

  async function reassessContents() {
    assignmentContainsCandli.value = null
    assignmentContainsGenAI.value = null
    assignmentContainsBetty.value = null
    if (!current.value) return

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

  async function preview() {
    const { content } = await Agent.state(current.value)
    previewing.value = content
  }

  function primaryDashboardType() {
    return assignmentContainsBetty.value || assignmentContainsGenAI.value ? 'activity' : 'live-monitoring'
  }

  async function openDashboard(dashboard) {
    const assignment = current.value
    if (!assignment) return

    if (dashboard === 'competency') showCandliResultsModal.value = true
    else if (dashboard === 'generative-ai-module') showGenAIDashboardModal.value = true
    else showResultsModal.value = true

    openDashboardSession.value = { assignment, dashboard }
    await writeDashboardXapi('opened-dashboard', assignment, dashboard)
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
        dashboard
      }
    }
  }
</script>

<style scoped>
.split-panes {
  display: flex;
  height: 100%;
}

.split-panes .pane {
  flex-grow: 1;
  border-right: 1px solid #ddd;
}

.wrapper {
  max-width: 800px;
  padding: 16px;
  margin: auto;
}

.studies-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 16px;
}

.studies-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.studies-title,
.studies-detail-title,
.studies-side-title {
  color: var(--color-primary-600, #2E32DB);
  margin-bottom: 12px;
}

.studies-no-classes {
  color: grey;
  font-size: 0.9em;
}

.studies-detail {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  height: calc(100% - 32px);
}

.studies-detail-header {
  display: flex;
  justify-content: space-between;
  padding-bottom: 24px;
  gap: 16px;
}

.studies-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.studies-detail-body {
  flex-grow: 1;
  display: flex;
  gap: 24px;
}

.studies-detail-main,
.studies-detail-side {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.studies-detail-main {
  gap: 8px;
  align-items: flex-start;
}

.studies-groups-table {
  width: 100%;
}

.studies-feedback {
  margin-top: 16px;
  text-align: right;
}

.studies-dashboard-body {
  position: absolute;
  width: 100%;
  height: 100%;
}

:deep(.studies-row-current) {
  background: #EEEEEE;
}
</style>