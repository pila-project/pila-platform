<template>
  <div class="page-container teacher-home">
    <div class="home-header">
      <div>
        <h1 class="home-greeting">{{ greeting }}</h1>
        <p class="home-sub">{{ t('heres-whats-happening-with-your-classes-today') }}</p>
      </div>
      <div class="home-header-actions">
        <PButton
          variant="outline"
          icon="lucide:settings-2"
          :text="t('customise-dashboard')"
          @click="showCustomizeModal = true"
        />
      </div>
    </div>

    <!-- Workspace banner: shown until the user presses X (persisted in localStorage) -->
    <section v-if="showWorkspaceBanner" class="workspace-banner">
      <button
        type="button"
        class="workspace-banner-close"
        :aria-label="t('close')"
        @click="dismissWorkspaceBanner"
      >
        <LucideIcon name="x" :size="16" />
      </button>
      <div class="workspace-banner-copy">
        <h2 class="workspace-banner-title">{{ t('your-workspace-is-ready') }}</h2>
        <p class="workspace-banner-body">{{ t('pila-helps-you-create-assign-and-monitor') }}</p>
        <div class="workspace-banner-actions">
          <PButton
            variant="primary"
            icon="lucide:plus"
            :text="t('create-first-assignment')"
            @click="openCreateAssignment"
          />
          <a class="home-outline-btn" :href="learnAboutPilaUrl" target="_blank" rel="noopener noreferrer">
            <LucideIcon name="book-open" :size="16" />
            {{ t('learn-about-pila') }}
          </a>
          <router-link class="home-outline-btn" to="/teacher/resources">
            <LucideIcon name="flag" :size="16" />
            {{ t('take-a-tour') }}
          </router-link>
        </div>
      </div>
      <img class="workspace-banner-art" src="/teacher-home/workspace-ready.png" alt="">
    </section>
    <div v-else class="home-persist-actions">
      <a class="home-outline-btn" :href="learnAboutPilaUrl" target="_blank" rel="noopener noreferrer">
        <LucideIcon name="book-open" :size="16" />
        {{ t('learn-about-pila') }}
      </a>
      <router-link class="home-outline-btn" to="/teacher/resources">
        <LucideIcon name="flag" :size="16" />
        {{ t('take-a-tour') }}
      </router-link>
    </div>

    <template v-if="homeLayout.quickLinks">
    <h3 class="home-section-label">{{ t('quick-links') }}</h3>
    <div class="quick-links">
      <router-link class="quick-link" to="/teacher/content">
        <img src="/teacher-home/quick-explore.png" alt="" class="quick-link-img">
        <span>{{ t('explore-item-library') }}</span>
      </router-link>
      <router-link class="quick-link" to="/teacher/assignments-from-me">
        <img src="/teacher-home/quick-assign.png" alt="" class="quick-link-img">
        <span>{{ t('assign-content') }}</span>
      </router-link>
      <router-link class="quick-link" to="/teacher/classes">
        <img src="/teacher-home/quick-customize.png" alt="" class="quick-link-img">
        <span>{{ t('organise-students-into-groups') }}</span>
      </router-link>
    </div>
    </template>

    <div class="home-split">
      <section v-if="homeLayout.recentActivity" class="content-card home-panel">
        <h3 class="card-section-title home-panel-title">
          <LucideIcon name="clock" :size="16" />
          {{ t('recent-activity-log') }}
        </h3>
        <div v-if="!activityItems.length" class="home-empty">
          <LucideIcon name="clock" :size="28" class="home-empty-icon" />
          <p class="home-empty-title">{{ t('no-activity-yet') }}</p>
          <p class="home-empty-sub">{{ t('your-recent-actions-will-be-logged-here') }}</p>
        </div>
        <div v-else class="activity-grid">
          <div v-for="item in activityItems" :key="item.id + item.kind" class="activity-card">
            <div class="activity-icon" :class="'activity-icon--' + item.kind">
              <LucideIcon :name="item.icon" :size="16" />
            </div>
            <div class="activity-body">
              <p class="activity-title">{{ item.title }}</p>
              <p class="activity-meta">{{ item.meta }}</p>
              <p class="activity-time">{{ item.when }}</p>
            </div>
          </div>
        </div>
      </section>

      <section v-if="homeLayout.currentAssignments" class="content-card home-panel home-assignments">
        <div class="home-panel-head">
          <div>
            <h3 class="card-section-title home-panel-title">
              <LucideIcon name="graduation-cap" :size="16" />
              {{ t('my-assignments') }}
            </h3>
          </div>
          <div class="home-panel-head-actions">
            <PButton
              variant="primary"
              size="sm"
              icon="lucide:plus"
              :text="t('create-assignment')"
              @click="openCreateAssignment"
            />
            <PButton
              variant="secondary"
              size="sm"
              :text="t('view-all')"
              @click="$router.push('/teacher/assignments-from-me')"
            />
          </div>
        </div>

        <div v-if="!homeAssignmentItems.length" class="home-empty">
          <LucideIcon name="copy" :size="28" class="home-empty-icon" />
          <p class="home-empty-title">{{ t('no-assignments-yet') }}</p>
          <p class="home-empty-sub">{{ t('create-your-first-assignment-by-browsing') }}</p>
          <div class="home-empty-actions">
            <PButton variant="primary" :text="t('create-assignment')" @click="openCreateAssignment" />
            <PButton
              variant="secondary"
              :text="t('browse-content')"
              @click="$router.push('/teacher/content')"
            />
          </div>
        </div>

        <div v-else class="home-assign-table">
          <PTable
            :headers="tableHeaders"
            :items="homeAssignmentItems"
            itemKey="id"
            :noDataText="t('no-assignments-yet')"
            :itemsPerPage="10"
            :itemsPerPageText="t('rows-per-page')"
            :itemsPerPageOptions="assignmentTablePerPageOptions"
          >
            <template #item.title="{ item }">
              <div class="assign-cell-title-block">
                <div class="assign-cell-title">
                  <span class="assign-cell-title-text">
                    <vueScopeComponent :id="item.id" :path="['name']" />
                  </span>
                  <span
                    v-if="assignmentData[item.id]?.assignmentType"
                    :class="getTypeBadgeClass(assignmentData[item.id].assignmentType)"
                  >
                    {{ t(assignmentData[item.id].assignmentType.toLowerCase()) }}
                  </span>
                </div>
                <div class="assign-cell-desc assign-cell-desc--ellipsis">
                  <vueScopeComponent :id="item.id" :path="['description']">
                    <template v-slot="data">
                      {{ data.value || t('no-description') }}
                    </template>
                  </vueScopeComponent>
                </div>
              </div>
            </template>
            <template #item.dueDate="{ item }">
              <span class="assign-cell-text">{{ getDueDate(item.id) }}</span>
            </template>
            <template #item.status="{ item }">
              <span :class="getStatusBadgeClass(item.id)">{{ t(getStatus(item.id).toLowerCase()) }}</span>
            </template>
            <template #item.assignedTo="{ item }">
              <template v-if="getAssignedGroups(item.id).length">
                <div class="assign-cell-title">
                  <vueScopeComponent :id="getAssignedGroups(item.id)[0]" :path="['name']" />
                </div>
                <div class="assign-cell-desc">
                  {{ getAssignedGroups(item.id).length }}
                  {{ getAssignedGroups(item.id).length > 1 ? t('groups') : t('group') }}
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
            <template #item.edit="{ item }">
              <PButton variant="icon" size="sm" icon="lucide:pencil" iconOnly @click.stop="openEdit(item.id)" />
            </template>
          </PTable>
        </div>
      </section>
    </div>

    <CreateEditAssignmentModal
      v-if="showEditModal"
      teacher
      :id="current"
      :editing="!wasCreating"
      @close="showEditModal = false"
      @saved="onAssignmentSaved"
    />
    <ViewSubmissions
      v-if="showSubmissionsView"
      :assignmentId="current"
      @close="showSubmissionsView = false"
      @open-dashboard="handleOpenDashboardFromHome"
    />
    <PModal
      v-if="showResultsModal"
      layer="preview"
      no-pad-body
      :closeButtonText="t('close')"
      showCloseButton
      width="90vw"
      height="90vh"
      @close="closeDashboard(resultsDashboardType)"
    >
      <template #title>
        <span>
          {{ assignmentContainsBetty || assignmentContainsGenAI ? t('activity-dashboard') : t('live-monitoring-dashboard') }}
        </span>
      </template>
      <template #body>
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
      showCloseButton
      :closeButtonText="t('close')"
      width="90vw"
      height="90vh"
      @close="closeDashboard('competency')"
    >
      <template #title>
        <span>{{ t('competency-dashboard') }}</span>
      </template>
      <template #body>
        <div class="assign-dashboard-fill">
          <CandliDashboard :assignment="current" :games="candliGames" />
        </div>
      </template>
    </PModal>
    <PModal
      v-if="showGenAIDashboardModal"
      layer="preview"
      no-pad-body
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
        <div class="assign-dashboard-fill">
          <GenAIDashboard :assignment="current" />
        </div>
      </template>
    </PModal>
    <PModal
      v-if="showCustomizeModal"
      :title="t('customise-dashboard')"
      showCloseButton
      :closeButtonText="t('done')"
      width="420px"
      @close="showCustomizeModal = false"
    >
      <template #body>
        <p class="home-customize-hint">{{ t('choose-which-sections-to-show') }}</p>
        <div class="home-customize-list">
          <PCheckbox
            :modelValue="homeLayout.quickLinks"
            :label="t('quick-links')"
            @update:modelValue="v => setLayoutSection('quickLinks', v)"
          />
          <PCheckbox
            :modelValue="homeLayout.recentActivity"
            :label="t('recent-activity-log')"
            @update:modelValue="v => setLayoutSection('recentActivity', v)"
          />
          <PCheckbox
            :modelValue="homeLayout.currentAssignments"
            :label="t('my-assignments')"
            @update:modelValue="v => setLayoutSection('currentAssignments', v)"
          />
        </div>
      </template>
    </PModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useStore } from 'vuex'
import { v4 as uuid } from 'uuid'
import { vueScopeComponent } from '@knowlearning/agents/vue.js'
import { PButton, PTable, PModal, PCheckbox } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import CreateEditAssignmentModal from '@/pages/assignments/from-me/create-edit-assignment-modal.vue'
import ViewSubmissions from '@/pages/assignments/from-me/view-submissions.vue'
import Dashboard from '@/pages/assignments/from-me/dashboard/index.vue'
import CandliDashboard from '@/pages/assignments/from-me/candli-dashboard.vue'
import GenAIDashboard from '@/pages/assignments/from-me/gen-ai-dashboard.vue'
import { ASSIGNMENT_STATUS, effectiveAssignmentStatus } from '@/utils/assignment-status.js'
import { CANDLI_SEQUENCES, GEN_AI_SEQUENCES } from '@/utils/constants.js'
import { candliGamesForSequenceItems } from '@/candli-games.js'
import { normalizeSequenceItems } from '@/utils/sequence-items.js'
import { tablePerPageOptions } from '@/utils/pagination-options.js'
import {
  LEARN_ABOUT_PILA_URL,
  HOME_BANNER_DISMISSED_KEY,
  HOME_LAYOUT_KEY,
  RECENT_ACTIVITY_LIMIT,
  workspaceBannerVisible,
  parseHomeLayout,
  greetingFirstName,
  formatWelcomeBack,
  currentAssignmentPreview,
  buildRecentActivity,
} from '@/utils/teacher-home.js'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const learnAboutPilaUrl = LEARN_ABOUT_PILA_URL
const userInfo = ref({})
const showEditModal = ref(false)
const showSubmissionsView = ref(false)
const showResultsModal = ref(false)
const showCandliResultsModal = ref(false)
const showGenAIDashboardModal = ref(false)
const resultsDashboardType = ref('live-monitoring')
const dashboardUrl = ref(null)
const candliGames = ref([])
const assignmentContainsCandli = ref(null)
const assignmentContainsGenAI = ref(null)
const assignmentContainsBetty = ref(null)
const current = ref(null)
const wasCreating = ref(true)
const assignmentData = reactive({})
const assignmentTablePerPageOptions = computed(() => tablePerPageOptions(t))

const showCustomizeModal = ref(false)
const bannerDismissed = ref(false)
const homeLayout = reactive(parseHomeLayout())

onMounted(() => {
  Agent.environment().then(({ auth: { info } }) => { userInfo.value = info || {} })
  try {
    bannerDismissed.value = localStorage.getItem(HOME_BANNER_DISMISSED_KEY) === '1'
    const raw = localStorage.getItem(HOME_LAYOUT_KEY)
    if (raw) Object.assign(homeLayout, parseHomeLayout(JSON.parse(raw)))
  } catch { /* private mode / invalid JSON */ }
})

const showWorkspaceBanner = computed(() =>
  workspaceBannerVisible({ dismissed: bannerDismissed.value }),
)

function persistHomeLayout() {
  try {
    localStorage.setItem(HOME_LAYOUT_KEY, JSON.stringify({
      quickLinks: homeLayout.quickLinks !== false,
      recentActivity: homeLayout.recentActivity !== false,
      currentAssignments: homeLayout.currentAssignments !== false,
    }))
  } catch { /* ignore quota / private mode */ }
}

function setLayoutSection(key, value) {
  homeLayout[key] = !!value
  persistHomeLayout()
}

function dismissWorkspaceBanner() {
  bannerDismissed.value = true
  try {
    localStorage.setItem(HOME_BANNER_DISMISSED_KEY, '1')
  } catch { /* ignore quota / private mode */ }
}

const greetingName = computed(() =>
  greetingFirstName(userInfo.value?.name, t('teacher')),
)

const greeting = computed(() =>
  formatWelcomeBack(t('welcome-back-named'), greetingName.value),
)

const assignableIds = computed(() => store.getters['pila_tags/withTag']('teacher-created'))

watch(assignableIds, async (ids) => {
  await Promise.all(ids.map(loadAssignmentData))
}, { immediate: true })

async function loadAssignmentData(id) {
  if (!id || assignmentData[id]) return
  try {
    const state = await Agent.state(id)
    assignmentData[id] = {
      name: state.name || '',
      description: state.description || '',
      assignmentType: state.assignmentType || 'Assignment',
      dueDate: state.dueDate || null,
      status: state.status || null,
      scheduledDate: state.scheduledDate || null,
      scheduledTime: state.scheduledTime || null,
    }
  } catch {
    assignmentData[id] = { name: '', description: '', assignmentType: 'Assignment' }
  }
}

function getAssignedGroups(id) {
  return store.getters['assignments/assignedGroups'](id, 'teacher-to-student', false) || []
}

function getStatus(id) {
  const data = assignmentData[id]
  return effectiveAssignmentStatus(data, { hasAssignedGroups: getAssignedGroups(id).length > 0 })
}

function getDueDate(id) {
  const d = assignmentData[id]?.dueDate
  if (!d) return t('not-set')
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return t('not-set')
  return dt.toLocaleDateString()
}

function getUpdated(id) {
  return store.getters['pila_tags/tagUpdatedForContent'](id, 'teacher-created') || 0
}

// Same source + default order as /teacher/assignments-from-me (active teacher-created, newest first).
const homeAssignmentItems = computed(() =>
  assignableIds.value
    .map(id => ({
      id,
      title: assignmentData[id]?.name || '',
      dueDate: assignmentData[id]?.dueDate ? new Date(assignmentData[id].dueDate).getTime() : 0,
      status: getStatus(id),
      updated: getUpdated(id),
    }))
    .sort((a, b) => b.updated - a.updated),
)

const activitySourceRows = computed(() =>
  currentAssignmentPreview(assignableIds.value, getUpdated, RECENT_ACTIVITY_LIMIT),
)

const activityItems = computed(() =>
  buildRecentActivity(
    activitySourceRows.value.map(row => ({
      id: row.id,
      updated: row.updated,
      data: assignmentData[row.id],
      groupCount: getAssignedGroups(row.id).length,
    })),
    { t },
  ),
)

const tableHeaders = computed(() => [
  { key: 'title', title: t('assignment-title') },
  { key: 'dueDate', title: t('due-date') },
  { key: 'status', title: t('publication-status') },
  { key: 'assignedTo', title: t('assigned-to'), sortable: false },
  { key: 'submissions', title: t('reporting-dashboard'), sortable: false },
  { key: 'edit', title: t('edit'), sortable: false },
])

function getStatusBadgeClass(id) {
  const s = getStatus(id)
  if (s === ASSIGNMENT_STATUS.PUBLISHED) return 'assign-badge assign-badge-published'
  if (s === ASSIGNMENT_STATUS.DRAFT) return 'assign-badge assign-badge-draft'
  return 'assign-badge assign-badge-scheduled'
}

function getTypeBadgeClass(type) {
  const k = (type || '').toLowerCase()
  if (k === 'assessment') return 'assign-type-pill assign-type-assessment'
  if (k === 'homework') return 'assign-type-pill assign-type-homework'
  if (k === 'practice') return 'assign-type-pill assign-type-practice'
  if (k === 'learning') return 'assign-type-pill assign-type-learning'
  return 'assign-type-pill assign-type-default'
}

function openCreateAssignment() {
  current.value = uuid()
  wasCreating.value = true
  showEditModal.value = true
}

function openEdit(id) {
  current.value = id
  wasCreating.value = false
  showEditModal.value = true
}

function canViewSubmissions(id) {
  if (getStatus(id) !== ASSIGNMENT_STATUS.PUBLISHED) return false
  if (!getAssignedGroups(id).length) return false
  return true
}

function openSubmissions(id) {
  current.value = id
  showSubmissionsView.value = true
}

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
      if (contentState?.id?.includes('betty')) assignmentContainsBetty.value = true
      const meta = await Agent.metadata(content)
      if (current.value !== assignmentId) return
      if (meta?.domain === 'datawise.accingo.co') {
        dashboardUrl.value = 'https://datawise.accingo.co/dashboard'
      } else if (contentState?.reference?.dashboard) {
        dashboardUrl.value = 'https://' + contentState.reference.dashboard
      }
    } catch { /* ignore */ }
  }
  if (current.value === assignmentId) {
    candliGames.value = [...new Set(allGames.filter(Boolean))]
  }
}

async function handleOpenDashboardFromHome(type) {
  await reassessContents()
  if (type === 'competency') {
    if (!candliGames.value.length) return
    showCandliResultsModal.value = true
  } else if (type === 'genai') {
    if (!assignmentContainsGenAI.value) return
    showGenAIDashboardModal.value = true
  } else if (type === 'app') {
    if (!dashboardUrl.value) return
    resultsDashboardType.value = 'live-monitoring'
    showResultsModal.value = true
  } else {
    resultsDashboardType.value = 'live-monitoring'
    showResultsModal.value = true
  }
}

function closeDashboard(kind) {
  if (kind === 'competency') showCandliResultsModal.value = false
  else if (kind === 'generative-ai-module') showGenAIDashboardModal.value = false
  else showResultsModal.value = false
}

function onAssignmentSaved() {
  if (wasCreating.value && current.value) {
    store.dispatch('pila_tags/tag', { content_id: current.value, tag_type: 'teacher-created' })
  }
  if (current.value) delete assignmentData[current.value]
  loadAssignmentData(current.value)
}
</script>

<style scoped>
.teacher-home {
  width: 100%;
  max-width: none;
  box-sizing: border-box;
}

.home-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.home-greeting {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.4px;
}

.home-sub {
  margin: 4px 0 0;
  font-size: 14px;
  color: #64748b;
}

.home-header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.workspace-banner {
  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  margin-bottom: 24px;
  border-radius: 16px;
  background: linear-gradient(90deg, #eff6ff 0%, #dbeafe 100%);
}

.workspace-banner-close {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.workspace-banner-close:hover {
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
}

.workspace-banner-copy {
  flex: 1;
  min-width: 0;
}

.workspace-banner-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.workspace-banner-body {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.5;
  color: #334155;
  max-width: 640px;
}

.workspace-banner-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.workspace-banner-art {
  width: 160px;
  height: 150px;
  object-fit: contain;
  flex-shrink: 0;
}

.home-persist-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.home-outline-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: 9999px;
  border: 1px solid #bfdbfe;
  background: #fff;
  color: #2563eb;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
}

.home-outline-btn:hover {
  background: #eff6ff;
}

.home-section-label {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.quick-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  text-decoration: none;
  color: #334155;
  font-size: 14px;
  font-weight: 500;
  min-height: 76px;
}

.quick-link:hover {
  border-color: #bfdbfe;
  background: #f8fafc;
}

.quick-link-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  flex-shrink: 0;
}

.home-split {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.home-panel {
  width: 100%;
  min-height: 0;
}

.home-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.home-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.home-panel-head-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.home-customize-hint {
  margin: 0 0 16px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.45;
}

.home-customize-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.assign-dashboard-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.assign-cell-text--muted {
  color: #94a3b8;
}

.home-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 16px 28px;
}

.home-empty-icon {
  color: #2563eb;
  margin-bottom: 12px;
}

.home-empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.home-empty-sub {
  margin: 6px 0 16px;
  font-size: 13px;
  color: #64748b;
  max-width: 360px;
  line-height: 1.45;
}

.home-empty-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.activity-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
}

.activity-card {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 10px;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #dcfce7;
  color: #16a34a;
}

.activity-icon--updated {
  background: #dbeafe;
  color: #2563eb;
}

.activity-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.activity-meta,
.activity-time {
  margin: 2px 0 0;
  font-size: 12px;
  color: #64748b;
}

.assign-cell-title-block {
  max-width: 280px;
  min-width: 0;
}

.assign-cell-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.assign-cell-title-text {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assign-cell-desc {
  font-size: 11px;
  color: #64748b;
}

.assign-cell-desc--ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assign-cell-text {
  font-size: 12px;
  color: #334155;
}

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

.assign-type-pill {
  flex: 0 0 auto;
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
}

.assign-type-assessment { background: #eff6ff; color: #2563eb; }
.assign-type-homework { background: #fff7ed; color: #c2410c; }
.assign-type-practice { background: #f5f3ff; color: #7c3aed; }
.assign-type-learning { background: #ecfdf5; color: #059669; }
.assign-type-default { background: #f1f5f9; color: #475569; }

@media (max-width: 1024px) {
  .quick-links,
  .activity-grid {
    grid-template-columns: 1fr;
  }

  .workspace-banner {
    flex-direction: column;
  }

  .workspace-banner-art {
    align-self: flex-end;
    width: 120px;
    height: 110px;
  }

  .home-header {
    flex-direction: column;
  }
}
</style>
