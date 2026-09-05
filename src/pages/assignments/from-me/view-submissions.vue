<template>
  <Teleport to="body">
    <div class="vs-overlay" @click.self="viewMode === 'overview' && $emit('close')">
      <!-- ═══════════════ OVERVIEW MODE ═══════════════ -->
      <template v-if="viewMode === 'overview'">
        <div class="vso-container" @click.stop>
          <!-- Header -->
          <div class="vso-header">
            <div>
              <h2 class="vso-title">
                <LucideIcon name="bar-chart" :size="16" class="vso-title-icon" />
                {{ t('reporting-dashboard') }} — {{ assignmentName }}
              </h2>
              <p v-if="SHOW_STUDENT_SUBMISSIONS_UI" class="vso-subtitle">
                {{ t('review-student-submissions-and-provide-feedback') }}
              </p>
            </div>
            <PButton variant="icon" size="xsm" icon="lucide:x" iconOnly @click="$emit('close')" />
          </div>

          <div class="vso-scroll-body">
          <!-- Dashboard cards: same look; only list dashboards this assignment's content supports (UIUX-129). -->
          <div v-if="hasAnyDashboardCard" class="vso-dashboards">
            <div class="vso-dashboard-cards">
              <div
                v-if="assignmentContainsAppDashboard"
                class="vso-dcard"
                @click="$emit('open-dashboard', 'app')"
              >
                <div class="vso-dcard-icon vso-dcard-icon-yellow">
                  <LucideIcon name="layout-dashboard" :size="20" />
                </div>
                <div class="vso-dcard-info">
                  <span class="vso-dcard-title">{{ t('app-specific-dashboard') }}</span>
                  <span class="vso-dcard-link">{{ t('view-dashboard') }} &rsaquo;</span>
                </div>
              </div>
              <div
                v-if="assignmentContainsLiveDashboard"
                class="vso-dcard"
                @click="$emit('open-dashboard', 'live')"
              >
                <div class="vso-dcard-icon vso-dcard-icon-red">
                  <LucideIcon name="activity" :size="20" />
                </div>
                <div class="vso-dcard-info">
                  <span class="vso-dcard-title">{{ t('live-monitoring-dashboard') }}</span>
                  <span class="vso-dcard-link">{{ t('view-dashboard') }} &rsaquo;</span>
                </div>
              </div>
              <div
                v-if="assignmentContainsCandli"
                class="vso-dcard"
                @click="$emit('open-dashboard', 'competency')"
              >
                <div class="vso-dcard-icon vso-dcard-icon-green">
                  <LucideIcon name="grid-2x2" :size="20" />
                </div>
                <div class="vso-dcard-info">
                  <span class="vso-dcard-title">{{ t('competency-dashboard') }}</span>
                  <span class="vso-dcard-link">{{ t('view-dashboard') }} &rsaquo;</span>
                </div>
              </div>
              <div
                v-if="assignmentContainsGenAI"
                class="vso-dcard"
                @click="$emit('open-dashboard', 'genai')"
              >
                <div class="vso-dcard-icon vso-dcard-icon-purple">
                  <LucideIcon name="sparkles" :size="20" />
                </div>
                <div class="vso-dcard-info">
                  <span class="vso-dcard-title">{{ t('generative-ai-module-dashboard') }}</span>
                  <span class="vso-dcard-link">{{ t('view-dashboard') }} &rsaquo;</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Real counts: assigned students + performance-based "started" (live-dashboard data path) -->
          <div class="vso-stats">
            <div class="vso-stat-box">
              <span class="vso-stat-num vso-stat-total">{{ students.length }}</span>
              <span class="vso-stat-label">{{ formatStudentCount(students.length, t, { unitOnly: true }) }}</span>
            </div>
            <div class="vso-stat-box">
              <span v-if="activityProgressLoading" class="vso-stat-num vso-stat-progress">…</span>
              <span v-else class="vso-stat-num vso-stat-progress">{{ inProgressStudentCount }}</span>
              <span class="vso-stat-label">{{ t('in-progress') }}</span>
            </div>
          </div>

          <!--
            UIUX-114: names-only student list (no checkboxes / extra columns).
            Full submissions table stays behind SHOW_STUDENT_SUBMISSIONS_UI until xAPI is ready.
          -->
          <div v-if="!SHOW_STUDENT_SUBMISSIONS_UI" class="vso-submissions">
            <h4 class="vso-section-label">{{ t('students') }}:</h4>
            <PUnifiedFilter
              v-model:searchQuery="studentSearch"
              :placeholder="t('search-student')"
              class="vso-search"
            />
            <ul class="vso-student-name-list" role="list">
              <li
                v-for="(sid, i) in filteredStudents"
                :key="sid"
                class="vso-student-name-row"
              >
                {{ getStudentDisplayName(sid, i) }}
              </li>
              <li v-if="!filteredStudents.length" class="vso-student-name-empty">
                {{ t('no-students-found') }}
              </li>
            </ul>
          </div>

          <template v-else>
            <div class="vso-stats" style="margin-top: 12px;">
              <div class="vso-stat-box">
                <span class="vso-stat-num vso-stat-submitted">{{ submittedStudentCount }}</span>
                <span class="vso-stat-label">{{ t('submitted') }}</span>
              </div>
              <div class="vso-stat-box">
                <span class="vso-stat-num vso-stat-graded">{{ gradedStudentCount }}</span>
                <span class="vso-stat-label">{{ t('graded') }}</span>
              </div>
            </div>

            <!-- Student submissions section (+ individual submission / detail mode entry) -->
            <div class="vso-submissions">
              <h4 class="vso-section-label">{{ t('student-submissions') }}:</h4>
              <PUnifiedFilter
                v-model:searchQuery="studentSearch"
                :placeholder="t('search-student')"
                class="vso-search"
              />

              <div class="vso-table-wrapper">
                <PTable
                  :headers="vsTableHeaders"
                  :items="vsTableItems"
                  item-key="id"
                  selectable
                  :selected="selectedStudentItems"
                  @update:selected="selectedStudentItems = $event"
                  :no-data-text="t('no-students-found')"
                  :items-per-page="10"
                  :items-per-page-text="t('rows-per-page')"
                  :items-per-page-options="submissionTablePerPageOptions"
                >
                  <template #item.studentName="{ item }">
                    {{ item.studentName }}
                  </template>
                  <template #item.submitted="{ item }">
                    {{ item.submitted }}
                  </template>
                  <template #item.status="{ item }">
                    <span :class="getStudentStatusClass(item.id)">{{ item.status }}</span>
                  </template>
                  <template #item.feedback="{ item }">
                    <span v-if="getStudentStatusText(item.id) === t('not-started')" class="vso-feedback-none">{{ t('no-submission') }}</span>
                    <PButton v-else-if="hasStudentFeedback(item.id)" variant="secondary" size="xsm" icon="lucide:pencil" :text="t('edit-feedback')" @click="openDetailView(item.id)" />
                    <PButton v-else variant="primary" size="xsm" icon="lucide:plus" :text="t('add-feedback')" @click="openDetailView(item.id)" />
                  </template>
                  <template #item.submission="{ item }">
                    <PButton variant="ghost" size="xsm" :text="t('view')" @click="openDetailView(item.id)" />
                  </template>
                </PTable>
              </div>
            </div>
          </template>
          </div>

          <!-- Footer: single dismiss control (UIUX-114 — Cancel removed as redundant with Back) -->
          <div class="vso-footer">
            <PButton variant="secondary" :text="t('back')" @click="$emit('close')" />
          </div>
        </div>
      </template>

      <!--
        TODO(xAPI): Individual student submission / grading detail mode.
        Re-enable with SHOW_STUDENT_SUBMISSIONS_UI when backend xAPI supports real submissions.
      -->
      <!-- ═══════════════ DETAIL MODE (existing grading view) ═══════════════ -->
      <template v-else-if="SHOW_STUDENT_SUBMISSIONS_UI">
      <!-- Navigation bar -->
      <div class="vs-navbar">
        <PButton variant="ghost" icon="lucide:arrow-left" :text="t('back')" @click="viewMode = 'overview'" />
        <div class="vs-student-info">
          <span class="vs-student-name">{{ currentStudentName }}</span>
          <span class="vs-student-subtitle">{{ assignmentName }}</span>
        </div>
        <div class="vs-nav-stats">
          <span class="vs-stat">{{ totalCorrect }}/{{ totalItems }} {{ t('points') }}</span>
          <span class="vs-stat-sep">|</span>
          <span class="vs-stat">{{ scorePercent }}% {{ t('score') }}</span>
        </div>
        <span class="vs-grade-badge" v-if="currentStudentInfo.grade">{{ currentStudentInfo.grade }}</span>
        <span class="vs-status-badge">{{ submissionStatus }}</span>
      </div>

      <div class="vs-body">
        <!-- Left sidebar: Questions list -->
        <div class="vs-sidebar-left">
          <h3 class="vs-sidebar-title">{{ t('questions') }}</h3>
          <select class="vs-student-select" v-model="selectedStudentIndex">
            <option v-for="(sid, i) in students" :key="sid" :value="i">
              {{ t('student') }} {{ i + 1 }}
            </option>
          </select>

          <div class="vs-questions-list">
            <div
              v-for="(itemId, i) in sequenceItems"
              :key="itemId"
              class="vs-question-card"
              :class="{
                'vs-question-card-active': selectedItemIndex === i,
                'vs-question-card-correct': getItemResult(i) === true,
                'vs-question-card-incorrect': getItemResult(i) === false,
              }"
              @click="selectedItemIndex = i"
            >
              <div class="vs-qcard-header">
                <span class="vs-qcard-num">{{ padNum(i + 1) }}</span>
                <LucideIcon
                  v-if="getItemResult(i) === true"
                  name="check-circle"
                  :size="14"
                  class="vs-qcard-icon vs-icon-correct"
                />
                <LucideIcon
                  v-else-if="getItemResult(i) === false"
                  name="triangle-alert"
                  :size="14"
                  class="vs-qcard-icon vs-icon-incorrect"
                />
                <LucideIcon
                  v-else
                  name="circle-minus"
                  :size="14"
                  class="vs-qcard-icon vs-icon-skipped"
                />
              </div>
              <div class="vs-qcard-desc">
                <NameOrTranslatedNameFromItemId :itemId="itemId" />
              </div>
              <div class="vs-qcard-footer">
                <LucideIcon name="list-checks" :size="10" class="vs-qcard-type-icon" />
                <span class="vs-qcard-type">{{ t('item') }}</span>
                <span class="vs-qcard-points">{{ getItemResult(i) === true ? '3' : '0' }} {{ t('point') }}</span>
              </div>
            </div>
          </div>

          <!-- Student switcher at bottom -->
          <div class="vs-student-nav">
            <PButton variant="secondary" size="xsm" icon="lucide:chevron-left" iconOnly :disabled="selectedStudentIndex === 0" @click="selectedStudentIndex--" />
            <span class="vs-student-nav-label">
              {{ selectedStudentIndex + 1 }} / {{ students.length }}
            </span>
            <PButton variant="secondary" size="xsm" icon="lucide:chevron-right" iconOnly :disabled="selectedStudentIndex >= students.length - 1" @click="selectedStudentIndex++" />
          </div>
        </div>

        <!-- Center: Question content -->
        <div class="vs-content">
          <div class="vs-content-inner">
            <!-- Embedded question view -->
            <div class="vs-question-embed">
              <Suspense>
                <vueEmbedComponent
                  v-if="currentItemId"
                  :key="currentItemId + '-' + currentStudentId"
                  :id="currentItemId"
                  :namespace="props.assignmentId"
                  :environmentProxy="proxyEnvironmentCall"
                  style="position: absolute; inset: 0;"
                  allow="camera;microphone;fullscreen"
                />
                <template #fallback>
                  <div class="vs-embed-loading">
                    <LucideIcon name="loader-2" :size="14" :spin="true" /> {{ t('loading-question') }}
                  </div>
                </template>
              </Suspense>
            </div>

            <!-- Result bar -->
            <div class="vs-result-bar" v-if="currentItemId">
              <span class="vs-result-label">
                {{ t('result') }}:
                <strong :class="currentResultClass">{{ currentResultText }}</strong>
              </span>
              <span class="vs-result-type-badge">{{ t('item') }} {{ selectedItemIndex + 1 }}</span>
              <span class="vs-result-points">{{ t('points') }}: <strong>{{ currentItemPoints }}/3</strong></span>
            </div>

            <!-- Feedback for this question -->
            <div class="vs-feedback-section" v-if="currentItemId">
              <h4 class="vs-feedback-title">{{ t('feedback-for-this-question') }}</h4>
              <textarea
                v-model="itemFeedback"
                class="vs-feedback-textarea"
                :placeholder="t('provide-specific-feedback-placeholder')"
                rows="3"
              />
              <p class="vs-feedback-hint">{{ t('feedback-shown-to-student') }}</p>
            </div>
          </div>
        </div>

        <!-- Right sidebar: Overview/Details -->
        <div class="vs-sidebar-right">
          <!-- Tabs -->
          <PTabs
            v-model="rightTab"
            :tabs="rightTabDefs"
            type="line"
            stretch
          />

          <!-- Overview tab -->
          <div v-if="rightTab === 'overview'" class="vs-tab-content">
            <div class="vs-section">
              <h4 class="vs-section-heading">
                <LucideIcon name="clipboard-list" :size="13" class="vs-section-icon" />
                {{ t('assignment-overview') }}
              </h4>
              <div class="vs-overview-stats">
                <div class="vs-stat-box">
                  <span class="vs-stat-num">{{ answeredCount }}</span>
                  <span class="vs-stat-label">{{ t('answered') }}</span>
                </div>
                <div class="vs-stat-box">
                  <span class="vs-stat-num">{{ totalItems }}</span>
                  <span class="vs-stat-label">{{ t('total-items') }}</span>
                </div>
              </div>
              <div class="vs-result-badges">
                <span class="vs-rbadge vs-rbadge-correct">{{ totalCorrect }} <small>{{ t('correct') }}</small></span>
                <span class="vs-rbadge vs-rbadge-incorrect">{{ totalIncorrect }} <small>{{ t('incorrect') }}</small></span>
                <span class="vs-rbadge vs-rbadge-partial">{{ totalPartial }} <small>{{ t('partial') }}</small></span>
                <span class="vs-rbadge vs-rbadge-skipped">{{ totalSkipped }} <small>{{ t('skipped') }}</small></span>
              </div>
            </div>

            <div class="vs-separator" />

            <div class="vs-section">
              <h4 class="vs-section-heading">
                <LucideIcon name="star" :size="13" class="vs-section-icon" />
                {{ t('overall-grade') }}
              </h4>
              <label class="vs-field-label">{{ t('score-percent') }}</label>
              <input
                v-model="overallScore"
                type="number"
                class="vs-field-input"
                :placeholder="t('enter-score-placeholder')"
                min="0"
                max="100"
              />
              <label class="vs-field-label" style="margin-top: 12px;">{{ t('overall-feedback') }}</label>
              <textarea
                v-model="overallFeedback"
                class="vs-field-textarea"
                :placeholder="t('provide-overall-feedback-placeholder')"
                rows="3"
              />
              <p class="vs-feedback-hint">{{ t('feedback-visible-to-student') }}</p>
            </div>

            <div class="vs-separator" />

            <div class="vs-section">
              <h4 class="vs-section-heading">
                <LucideIcon name="star" :size="13" class="vs-section-icon" />
                {{ t('teacher-notes') }}
              </h4>
              <label class="vs-field-label">{{ t('private-notes') }}</label>
              <textarea
                v-model="teacherPrivateNotes"
                class="vs-field-textarea"
                :placeholder="t('add-private-notes-references-placeholder')"
                rows="3"
              />
            </div>
          </div>

          <!-- Details tab -->
          <div v-else class="vs-tab-content">
            <div class="vs-section">
              <h4 class="vs-section-heading">
                <LucideIcon name="clipboard-list" :size="13" class="vs-section-icon" />
                {{ t('submission-details') }}
              </h4>
              <div class="vs-details-grid">
                <span class="vs-detail-label">{{ t('student') }}:</span>
                <span class="vs-detail-value">{{ currentStudentName }}</span>

                <span class="vs-detail-label">{{ t('email') }}:</span>
                <span class="vs-detail-value">{{ currentStudentInfo.email || '--' }}</span>

                <span class="vs-detail-label">{{ t('grade') }}:</span>
                <span class="vs-detail-value">{{ currentStudentInfo.grade || '--' }}</span>

                <span class="vs-detail-label">{{ t('submitted') }}:</span>
                <span class="vs-detail-value">{{ formatDateTime(submittedAt) }}</span>

                <span class="vs-detail-label">{{ t('due-date') }}:</span>
                <span class="vs-detail-value">{{ assignmentDueDate }}</span>

                <span class="vs-detail-label">{{ t('time-spent') }}:</span>
                <span class="vs-detail-value">{{ formatDuration(performanceData?.totalTime) }}</span>

                <span class="vs-detail-label">{{ t('attempts') }}:</span>
                <span class="vs-detail-value">{{ performanceData?.attempts || '1' }}/{{ maxAttempts }}</span>

                <span class="vs-detail-label">{{ t('completion') }}:</span>
                <span class="vs-detail-value">{{ completionPercent }}%</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="vs-footer">
            <div class="vs-auto-save">
              <span>{{ t('auto-save') }}</span>
              <PCheckbox v-model="autoSave" size="sm" inputClass="vs-checkbox" />
            </div>
            <div class="vs-footer-actions">
              <PButton variant="secondary" :text="t('save-draft')" @click="saveDraft" />
              <PButton variant="primary" color="success" :text="t('mark-as-graded')" @click="markAsGraded" />
            </div>
          </div>
        </div>
      </div>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
  import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
  import { useStore } from 'vuex'
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import NameOrTranslatedNameFromItemId from '@/components/content/name-or-translated-name-from-item-id.vue'
  import LucideIcon from '@/components/ui/LucideIcon.vue'
  import { PButton, PUnifiedFilter, PTable, PTabs, PCheckbox } from '@/components/ui/index.js'
  import { useEncryptionKey } from '@/utils/useEncryptionKey.js'
  import { normalizeSequenceItems } from '@/utils/sequence-items.js'
  import { tablePerPageOptions } from '@/utils/pagination-options.js'
  import { CANDLI_SEQUENCES, GEN_AI_SEQUENCES } from '@/utils/constants.js'
  import { candliGamesForSequenceItems } from '@/candli-games.js'
  import { formatStudentPreferredName } from '@/utils/student-display-name.js'
  import { formatStudentCount } from '@/utils/group-student-counts.js'

  const props = defineProps({
    assignmentId: { type: String, required: true },
  })

  const emit = defineEmits(['close', 'open-dashboard'])
  const store = useStore()
  function t(slug) { return store.getters.t(slug) }
  const submissionTablePerPageOptions = computed(() => tablePerPageOptions(t))

  /**
   * TODO(xAPI): Set to `true` when backend provides formal per-student-per-assignment
   * Submitted/Graded status + timestamps. Student list + detail grader stay behind this flag.
   * Total students + In progress (performance-based) always load.
   */
  const SHOW_STUDENT_SUBMISSIONS_UI = false

  const { namePassword: encryptionKey } = useEncryptionKey(store)

  // ── State ──
  const loading = ref(true)
  const viewMode = ref('overview')
  const assignmentName = ref('')
  const contentId = ref(null)
  const sequenceItems = ref([])
  const selectedStudentIndex = ref(0)
  const selectedItemIndex = ref(0)
  const rightTab = ref('overview')
  const rightTabDefs = computed(() => [
    { key: 'overview', label: t('overview') },
    { key: 'details', label: t('details') },
  ])
  const performanceData = ref(null)
  const submittedAt = ref(null)
  const maxAttempts = ref('1')
  const assignmentDueDate = ref('--')
  const assignmentContainsCandli = ref(false)
  const assignmentContainsGenAI = ref(false)
  /** Custom/app dashboard URL (datawise or sequence.reference.dashboard) — trunk's dashboardUrl. */
  const assignmentContainsAppDashboard = ref(false)
  // Live is trunk's always-on primary, except when a custom URL replaces it (same Dashboard modal).
  const assignmentContainsLiveDashboard = computed(() => !assignmentContainsAppDashboard.value)
  const hasAnyDashboardCard = computed(() =>
    assignmentContainsAppDashboard.value
    || assignmentContainsLiveDashboard.value
    || assignmentContainsCandli.value
    || assignmentContainsGenAI.value,
  )

  // Overview state
  const studentSearch = ref('')
  const selectedStudentItems = ref([])
  const studentStatusCache = reactive({})
  const studentFeedbackCache = reactive({})
  /** Performance-based "started" flags (Agent sequence performance under each student). */
  const studentStartedCache = reactive({})
  const activityProgressLoading = ref(false)

  // Grading state
  const itemFeedback = ref('')
  const overallScore = ref('')
  const overallFeedback = ref('')
  const teacherPrivateNotes = ref('')
  const autoSave = ref(true)

  // Student info cache
  const studentInfoCache = reactive({})

  // ── Computed ──
  const students = computed(() =>
    store.getters['assignments/assignedStudents'](props.assignmentId, 'teacher-to-student')
  )

  const currentStudentId = computed(() => students.value[selectedStudentIndex.value])

  const currentStudentName = computed(() => {
    const info = studentInfoCache[currentStudentId.value]
    const preferred = formatStudentPreferredName(info)
    return preferred || `${t('student')} ${selectedStudentIndex.value + 1}`
  })

  const currentStudentInfo = computed(() => {
    return studentInfoCache[currentStudentId.value] || {}
  })

  const currentItemId = computed(() => sequenceItems.value[selectedItemIndex.value] || null)

  const totalItems = computed(() => sequenceItems.value.length)

  const itemResults = computed(() => {
    if (!performanceData.value?.itemInfo) return []
    return sequenceItems.value.map((itemId, i) => {
      const key = `${i}/${itemId}`
      return performanceData.value.itemInfo[key] || null
    })
  })

  const totalCorrect = computed(() => itemResults.value.filter(r => r?.correct === true).length)
  const totalIncorrect = computed(() => itemResults.value.filter(r => r?.correct === false).length)
  const answeredCount = computed(() => itemResults.value.filter(r => r !== null).length)
  const totalSkipped = computed(() => totalItems.value - answeredCount.value)
  const totalPartial = computed(() => 0) // Partial not tracked in current data model

  const scorePercent = computed(() => {
    if (totalItems.value === 0) return 0
    return Math.round((totalCorrect.value / totalItems.value) * 100)
  })

  const completionPercent = computed(() => {
    if (totalItems.value === 0) return 0
    return Math.round((answeredCount.value / totalItems.value) * 100)
  })

  const submissionStatus = computed(() => {
    if (answeredCount.value === 0) return t('not-started')
    if (answeredCount.value < totalItems.value) return t('in-progress')
    return t('submitted')
  })

  const currentResultText = computed(() => {
    const result = getItemResult(selectedItemIndex.value)
    if (result === true) return t('correct')
    if (result === false) return t('incorrect')
    return t('not-answered')
  })

  const currentResultClass = computed(() => {
    const result = getItemResult(selectedItemIndex.value)
    if (result === true) return 'vs-result-correct'
    if (result === false) return 'vs-result-incorrect'
    return 'vs-result-skipped'
  })

  const currentItemPoints = computed(() => {
    const result = getItemResult(selectedItemIndex.value)
    return result === true ? 3 : 0
  })

  // ── Overview computeds ──
  const filteredStudents = computed(() => {
    if (!studentSearch.value) return students.value
    const q = studentSearch.value.toLowerCase()
    return students.value.filter((sid, i) => {
      const name = getStudentDisplayName(sid, i)
      return name.toLowerCase().includes(q)
    })
  })

  const submittedStudentCount = computed(() =>
    students.value.filter(sid => studentStatusCache[sid] === 'submitted').length
  )

  /** Students with sequence performance activity (started / in progress). */
  const inProgressStudentCount = computed(() =>
    students.value.filter(sid => studentStartedCache[sid] === true).length
  )

  const gradedStudentCount = computed(() =>
    students.value.filter(sid => studentStatusCache[sid] === 'graded').length
  )

  /**
   * Infer "started" from live-dashboard performance state.
   * Agent.state(`${assignment}/sequence-${content}`, studentId)
   */
  function performanceIndicatesStarted(state) {
    if (!state || typeof state !== 'object') return false
    if (Number(state.totalTime) > 0) return true
    if (state.activeItemIndex != null && state.activeItemIndex !== '') return true
    const info = state.itemInfo
    if (!info || typeof info !== 'object') return false
    for (const entry of Object.values(info)) {
      if (!entry || typeof entry !== 'object') continue
      if (Number(entry.time) > 0) return true
      if (entry.correct === true || entry.correct === false) return true
    }
    return Object.keys(info).length > 0
  }

  async function loadStudentActivityProgress() {
    const list = students.value
    const seqId = contentId.value
    // Reset
    Object.keys(studentStartedCache).forEach(k => delete studentStartedCache[k])
    if (!list.length || !seqId) {
      activityProgressLoading.value = false
      return
    }

    activityProgressLoading.value = true
    const path = `${props.assignmentId}/sequence-${seqId}`
    try {
      await Promise.all(list.map(async (sid) => {
        try {
          // Agent.state(id, user) — same scope as live monitoring dashboard rows
          const state = await Agent.state(path, sid)
          studentStartedCache[sid] = performanceIndicatesStarted(state)
        } catch {
          studentStartedCache[sid] = false
        }
      }))
    } finally {
      activityProgressLoading.value = false
    }
  }

  function getStudentDisplayName(sid, index) {
    const info = studentInfoCache[sid]
    const preferred = formatStudentPreferredName(info)
    if (preferred) return preferred
    return `${t('student')} ${index + 1}`
  }

  function getStudentSubmittedDate(sid) {
    const status = studentStatusCache[sid]
    if (!status || status === 'not-started') return t('no-submission')
    // TODO: track actual submission date per student
    return assignmentDueDate.value !== '--' ? assignmentDueDate.value : '--'
  }

  function getStudentStatusText(sid) {
    const status = studentStatusCache[sid]
    if (status === 'submitted') return t('submitted')
    if (status === 'in-progress') return t('in-progress')
    if (status === 'graded') return t('graded')
    return t('not-started')
  }

  function getStudentStatusClass(sid) {
    const status = studentStatusCache[sid]
    if (status === 'submitted') return 'vso-status-badge vso-status-submitted'
    if (status === 'in-progress') return 'vso-status-badge vso-status-progress'
    if (status === 'graded') return 'vso-status-badge vso-status-graded'
    return 'vso-status-badge vso-status-not-started'
  }

  function hasStudentFeedback(sid) {
    return !!studentFeedbackCache[sid]
  }

  const vsTableHeaders = computed(() => [
    { key: 'studentName', title: t('student-name') },
    { key: 'submitted', title: t('submitted') },
    { key: 'status', title: t('assignment-status') },
    { key: 'feedback', title: t('feedback'), sortable: false },
    { key: 'submission', title: t('individual-submission'), sortable: false },
  ])

  const vsTableItems = computed(() => {
    return filteredStudents.value.map((sid, i) => ({
      id: sid,
      studentName: getStudentDisplayName(sid, i),
      submitted: getStudentSubmittedDate(sid),
      status: getStudentStatusText(sid),
    }))
  })

  function openDetailView(studentId) {
    const idx = students.value.indexOf(studentId)
    selectedStudentIndex.value = idx >= 0 ? idx : 0
    viewMode.value = 'detail'
  }

  async function loadAllStudentStatuses() {
    for (const sid of students.value) {
      await loadStudentInfo(sid)
      // Check submission status by looking at grading data
      try {
        const gradingId = `${props.assignmentId}-grading-${sid}`
        const state = await Agent.state(gradingId)
        if (state.overallScore) {
          studentStatusCache[sid] = 'graded'
          studentFeedbackCache[sid] = true
        } else if (state.overallFeedback || state.itemFeedback) {
          studentStatusCache[sid] = 'submitted'
          studentFeedbackCache[sid] = !!(state.overallFeedback || Object.keys(state.itemFeedback || {}).length)
        } else {
          studentStatusCache[sid] = 'not-started'
        }
      } catch {
        studentStatusCache[sid] = 'not-started'
      }
    }
  }

  // ── Functions ──
  function getItemResult(index) {
    const result = itemResults.value[index]
    if (!result) return null
    return result.correct
  }

  function padNum(n) {
    return n < 10 ? `0${n}` : `${n}`
  }

  function formatDateTime(ts) {
    if (!ts) return '--'
    const d = new Date(ts)
    return d.toLocaleString('en-US', {
      month: 'numeric', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', second: '2-digit',
      hour12: true
    })
  }

  function formatDuration(seconds) {
    if (!seconds) return '--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  async function proxyEnvironmentCall(user) {
    if (user) {
      const info = await store.getters.decryptUserInfo(user)
      return { auth: { user, info } }
    }
    return Agent.environment()
  }

  async function saveDraft() {
    await saveGradingData()
  }

  async function markAsGraded() {
    await saveGradingData()
  }

  async function saveGradingData() {
    if (!currentStudentId.value) return
    const gradingId = `${props.assignmentId}-grading-${currentStudentId.value}`
    const state = await Agent.state(gradingId)
    state.overallScore = overallScore.value
    state.overallFeedback = overallFeedback.value
    state.teacherNotes = teacherPrivateNotes.value
    state.itemFeedback = state.itemFeedback || {}
    if (currentItemId.value) {
      state.itemFeedback[currentItemId.value] = itemFeedback.value
    }
    await Agent.synced()
  }

  async function loadGradingData() {
    if (!currentStudentId.value) return
    try {
      const gradingId = `${props.assignmentId}-grading-${currentStudentId.value}`
      const state = await Agent.state(gradingId)
      overallScore.value = state.overallScore || ''
      overallFeedback.value = state.overallFeedback || ''
      teacherPrivateNotes.value = state.teacherNotes || ''
      if (currentItemId.value && state.itemFeedback) {
        itemFeedback.value = state.itemFeedback[currentItemId.value] || ''
      } else {
        itemFeedback.value = ''
      }
    } catch {
      overallScore.value = ''
      overallFeedback.value = ''
      teacherPrivateNotes.value = ''
      itemFeedback.value = ''
    }
  }

  // Load item-specific feedback when switching items
  watch(selectedItemIndex, async () => {
    if (!currentStudentId.value) return
    try {
      const gradingId = `${props.assignmentId}-grading-${currentStudentId.value}`
      const state = await Agent.state(gradingId)
      itemFeedback.value = state.itemFeedback?.[currentItemId.value] || ''
    } catch {
      itemFeedback.value = ''
    }
  })

  // ── Watch student performance ──
  let unwatchPerformance = null

  async function watchStudentPerformance() {
    if (unwatchPerformance) {
      // Agent.watch doesn't return an unwatch — we just overwrite
    }

    const userId = currentStudentId.value
    if (!userId || !contentId.value) return

    performanceData.value = null

    try {
      await new Promise((resolve) => {
        let resolved = false
        Agent.watch(
          `${props.assignmentId}/sequence-${contentId.value}`,
          ({ state }) => {
            performanceData.value = state
            if (!resolved) {
              resolved = true
              resolve()
            }
          },
          userId
        )
        // Timeout fallback
        setTimeout(() => {
          if (!resolved) {
            resolved = true
            resolve()
          }
        }, 3000)
      })
    } catch {
      performanceData.value = { itemInfo: {}, totalTime: 0 }
    }
  }

  // Watch student changes
  watch(selectedStudentIndex, async () => {
    selectedItemIndex.value = 0
    await loadStudentInfo(currentStudentId.value)
    await watchStudentPerformance()
    await loadGradingData()
  })

  async function loadStudentInfo(userId, force = false) {
    if (!userId) return
    if (!force && studentInfoCache[userId]) return
    try {
      const info = await store.getters.decryptUserInfo(userId)
      studentInfoCache[userId] = info
    } catch {
      studentInfoCache[userId] = { name: t('unknown') }
    }
  }

  // Re-fetch student info when the encryption key changes
  watch(encryptionKey, (newKey) => {
    if (newKey) {
      Object.keys(studentInfoCache).forEach(k => delete studentInfoCache[k])
    }
  })

  // ── Init ──
  async function init() {
    loading.value = true

    // Load assignment data
    const assignState = await Agent.state(props.assignmentId)
    assignmentName.value = assignState.name || t('assignment')
    contentId.value = Array.isArray(assignState.content) ? assignState.content[0] : assignState.content
    maxAttempts.value = assignState.maxAttempts || '1'

    if (assignState.dueDate) {
      const d = new Date(assignState.dueDate)
      assignmentDueDate.value = d.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
      })
    }

    // Load sequence items + dashboard availability (trunk: Candli only when games resolve)
    const rawContent = assignState.content
    const contentIds = Array.isArray(rawContent) ? rawContent : (rawContent ? [rawContent] : [])
    assignmentContainsCandli.value = false
    assignmentContainsGenAI.value = false
    assignmentContainsAppDashboard.value = false
    for (const id of contentIds) {
      if (GEN_AI_SEQUENCES[id]) assignmentContainsGenAI.value = true
      try {
        let games = CANDLI_SEQUENCES[id] ? [...CANDLI_SEQUENCES[id]] : null
        const contentState = await Agent.state(id)
        if (!games) {
          const items = Array.isArray(contentState?.items)
            ? contentState.items
            : normalizeSequenceItems(contentState?.items).map((itemId) => ({ id: itemId }))
          games = await candliGamesForSequenceItems(items)
        }
        if (games?.length) assignmentContainsCandli.value = true
        try {
          const meta = await Agent.metadata(id)
          if (meta?.domain === 'datawise.accingo.co') {
            assignmentContainsAppDashboard.value = true
          } else if (contentState?.reference?.dashboard) {
            assignmentContainsAppDashboard.value = true
          }
        } catch { /* ignore metadata probe */ }
      } catch {
        /* ignore */
      }
    }

    if (contentId.value) {
      try {
        const seqState = await Agent.state(contentId.value)
        sequenceItems.value = normalizeSequenceItems(seqState.items)
      } catch {
        sequenceItems.value = []
      }
    }

    // Always: total students (membership) + in-progress (performance snapshot)
    void loadStudentActivityProgress()

    // Names for overview list (UIUX-114) — independent of full submissions flag
    await Promise.all(students.value.map(sid => loadStudentInfo(sid)))

    // TODO(xAPI): full submissions list / grading when SHOW_STUDENT_SUBMISSIONS_UI is true
    if (SHOW_STUDENT_SUBMISSIONS_UI) {
      loadAllStudentStatuses()
      if (students.value.length > 0) {
        await watchStudentPerformance()
        await loadGradingData()
      }
    }

    loading.value = false
  }

  function handleKeydown(e) {
    if (e.key !== 'Escape') return
    // Dashboard modals stack above this view (layer=preview) and stop Escape in capture.
    // If Escape still reaches us, close reporting only when we are the top layer.
    if (e.defaultPrevented) return
    emit('close')
  }

  onMounted(() => document.addEventListener('keydown', handleKeydown))
  onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown))

  init()
</script>

<style scoped>
.vs-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-nested);
  display: flex;
  flex-direction: column;
}

.vs-overlay:has(.vso-container) {
  background: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.vs-overlay:not(:has(.vso-container)) {
  background: white;
}

/* ── Navbar ── */
.vs-navbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: white;
  flex-shrink: 0;
}

.vs-back {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  color: #2563eb;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
}
.vs-back:hover {
  background: #eff6ff;
}

.vs-student-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.vs-student-name {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
}

.vs-student-subtitle {
  font-size: 12px;
  color: #64748b;
}

.vs-nav-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #334155;
  font-weight: 500;
  flex-shrink: 0;
}

.vs-stat-sep {
  color: #e2e8f0;
}

.vs-grade-badge {
  padding: 4px 10px;
  border-radius: 6px;
  background: #f1f5f9;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  flex-shrink: 0;
}

.vs-status-badge {
  padding: 4px 12px;
  border-radius: 9999px;
  border: 1px solid #ca8a04;
  background: #fefce8;
  font-size: 12px;
  font-weight: 500;
  color: #ca8a04;
  flex-shrink: 0;
}

/* ── Body (3-column) ── */
.vs-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ── Left sidebar ── */
.vs-sidebar-left {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
}

.vs-sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  padding: 16px 16px 8px;
  margin: 0;
}

.vs-student-select {
  margin: 0 12px 8px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  color: #334155;
  background: white;
  cursor: pointer;
}

.vs-questions-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 12px;
}

.vs-question-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  cursor: pointer;
  background: white;
  transition: all 150ms;
}
.vs-question-card:hover {
  border-color: #cbd5e1;
}
.vs-question-card-active {
  border-color: #2563eb;
  background: #eff6ff;
}
.vs-question-card-correct {
  border-left: 3px solid #16a34a;
}
.vs-question-card-incorrect {
  border-left: 3px solid #ca8a04;
}

.vs-qcard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.vs-qcard-num {
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;
}

.vs-qcard-icon {
  font-size: 14px;
}
.vs-icon-correct { color: #16a34a; }
.vs-icon-incorrect { color: #ca8a04; }
.vs-icon-skipped { color: #94a3b8; }

.vs-qcard-desc {
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.vs-qcard-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #64748b;
}

.vs-qcard-type-icon {
  font-size: 10px;
  color: #94a3b8;
}

.vs-qcard-type {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.vs-qcard-points {
  margin-left: auto;
}

/* Student nav at bottom */
.vs-student-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  border-top: 1px solid #e2e8f0;
  background: white;
}

.vs-student-nav-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* ── Center content ── */
.vs-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 20px;
}

.vs-content-inner {
  max-width: 720px;
  margin: 0 auto;
}

.vs-question-embed {
  position: relative;
  width: 100%;
  min-height: 400px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: #fafbfc;
}

.vs-embed-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 400px;
  color: #64748b;
  font-size: 14px;
}

.vs-result-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  margin-top: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.vs-result-label {
  font-size: 14px;
  color: #334155;
}

.vs-result-correct { color: #16a34a; font-weight: 600; }
.vs-result-incorrect { color: #dc2626; font-weight: 600; }
.vs-result-skipped { color: #94a3b8; font-weight: 600; }

.vs-result-type-badge {
  padding: 2px 10px;
  border-radius: 4px;
  background: #2563eb;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.vs-result-points {
  margin-left: auto;
  font-size: 14px;
  color: #334155;
}

.vs-feedback-section {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.vs-feedback-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin: 0 0 8px;
}

.vs-feedback-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  color: #334155;
  resize: vertical;
  font-family: inherit;
}
.vs-feedback-textarea:focus {
  outline: none;
  border-color: #2563eb;
}

.vs-feedback-hint {
  font-size: 12px;
  color: #94a3b8;
  margin: 6px 0 0;
}

/* ── Right sidebar ── */
.vs-sidebar-right {
  width: 280px;
  flex-shrink: 0;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  background: white;
}

.vs-tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.vs-section {
  margin-bottom: 4px;
}

.vs-section-heading {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.vs-section-icon {
  font-size: 13px;
  color: #2563eb;
}

.vs-separator {
  height: 1px;
  background: #e2e8f0;
  margin: 16px 0;
}

/* Overview stats */
.vs-overview-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.vs-stat-box {
  flex: 1;
  text-align: center;
  padding: 12px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.vs-stat-num {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: #334155;
}

.vs-stat-label {
  display: block;
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.vs-result-badges {
  display: flex;
  gap: 6px;
}

.vs-rbadge {
  flex: 1;
  text-align: center;
  padding: 6px 4px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
}
.vs-rbadge small {
  display: block;
  font-size: 10px;
  font-weight: 400;
  margin-top: 2px;
}
.vs-rbadge-correct { background: #f0fdf4; color: #16a34a; }
.vs-rbadge-incorrect { background: #fef2f2; color: #dc2626; }
.vs-rbadge-partial { background: #fefce8; color: #ca8a04; }
.vs-rbadge-skipped { background: #f1f5f9; color: #64748b; }

/* Grade/feedback fields */
.vs-field-label {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  display: block;
  margin-bottom: 6px;
}

.vs-field-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  color: #334155;
}
.vs-field-input:focus {
  outline: none;
  border-color: #2563eb;
}

.vs-field-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  color: #334155;
  resize: vertical;
  font-family: inherit;
}
.vs-field-textarea:focus {
  outline: none;
  border-color: #2563eb;
}

/* Details grid */
.vs-details-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 12px;
  font-size: 13px;
}

.vs-detail-label {
  color: #64748b;
  font-weight: 400;
}

.vs-detail-value {
  color: #334155;
  font-weight: 500;
  text-align: right;
}

/* Footer */
.vs-footer {
  flex-shrink: 0;
  border-top: 1px solid #e2e8f0;
  padding: 10px 16px;
}

.vs-auto-save {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #334155;
}

.vs-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
  cursor: pointer;
}

.vs-footer-actions {
  display: flex;
  gap: 8px;
}

.vs-btn-draft {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: white;
  color: #2563eb;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;
}
.vs-btn-draft:hover {
  background: #eff6ff;
}

.vs-btn-graded {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;
}
.vs-btn-graded:hover {
  background: #1d4ed8;
}

/* ── Mobile Responsive ── */
@media (max-width: 1024px) {
  .vs-sidebar-right {
    width: 240px;
  }
  .vs-sidebar-left {
    width: 220px;
  }
}

@media (max-width: 768px) {
  .vs-body {
    flex-direction: column;
  }

  .vs-navbar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 12px;
  }

  .vs-nav-stats {
    display: none;
  }

  .vs-grade-badge,
  .vs-status-badge {
    display: none;
  }

  .vs-sidebar-left {
    width: 100%;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    flex-direction: row;
    overflow: hidden;
  }

  .vs-sidebar-title {
    display: none;
  }

  .vs-student-select {
    margin: 8px;
    flex-shrink: 0;
    width: auto;
  }

  .vs-questions-list {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 8px;
    gap: 8px;
  }

  .vs-question-card {
    min-width: 160px;
    flex-shrink: 0;
    margin-bottom: 0;
  }

  .vs-student-nav {
    display: none;
  }

  .vs-content {
    padding: 12px;
  }

  .vs-question-embed {
    min-height: 300px;
  }

  .vs-sidebar-right {
    width: 100%;
    border-left: none;
    border-top: 1px solid #e2e8f0;
    max-height: 400px;
  }

  .vs-result-bar {
    flex-wrap: wrap;
    gap: 8px;
  }
}

/* ═══════════════ OVERVIEW MODE STYLES ═══════════════ */

.vso-container {
  width: 100%;
  max-width: 1300px;
  max-height: 90vh;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.vso-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 24px 28px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.vso-scroll-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.vso-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.vso-title-icon {
  color: var(--color-primary-600, #4f46e5);
}

.vso-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 4px 0 0;
}

.vso-section-label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin: 0 0 12px;
}

/* Dashboard cards */
.vso-dashboards {
  padding: 20px 28px;
}

.vso-dashboard-cards {
  display: flex;
  gap: 16px;
  overflow-x: auto;
}

.vso-dcard {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 200ms, box-shadow 200ms;
  min-width: 220px;
  flex: 1;
}

.vso-dcard:hover {
  border-color: var(--color-primary-400, #818cf8);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.08);
}

.vso-dcard-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.vso-dcard-icon-yellow {
  background: #fef3c7;
  color: #d97706;
}

.vso-dcard-icon-red {
  background: #fee2e2;
  color: #dc2626;
}

.vso-dcard-icon-green {
  background: #d1fae5;
  color: #059669;
}

.vso-dcard-icon-purple {
  background: #ede9fe;
  color: #7c3aed;
}

.vso-dcard-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vso-dcard-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.vso-dcard-link {
  font-size: 12px;
  color: var(--color-primary-600, #4f46e5);
  font-weight: 500;
}

/* Stats summary */
.vso-stats {
  display: flex;
  gap: 16px;
  padding: 0 28px 20px;
}

.vso-stat-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.vso-stat-num {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.vso-stat-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
  font-weight: 500;
}

.vso-stat-total { color: #334155; }
.vso-stat-submitted { color: #059669; }
.vso-stat-progress { color: #d97706; }
.vso-stat-graded { color: #2563eb; }

/* Submissions section */
.vso-submissions {
  padding: 0 28px 20px;
}

.vso-search {
  margin-bottom: 12px;
  max-width: 320px;
}

.vso-table-wrapper {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.vso-table-wrapper :deep(.overflow-auto) {
  overflow: visible;
}

/* Status badges */
.vso-status-not-started {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: #fee2e2;
  color: #dc2626;
}

.vso-status-submitted {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: #d1fae5;
  color: #059669;
}

.vso-status-in-progress {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: #fef3c7;
  color: #d97706;
}

.vso-status-graded {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: #dbeafe;
  color: #2563eb;
}

/* Feedback actions */
.vso-feedback-none {
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
}

.vso-feedback-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
}

.vso-feedback-add {
  color: var(--color-primary-600, #4f46e5);
  border-color: var(--color-primary-200, #c7d2fe);
}

.vso-feedback-add:hover {
  background: var(--color-primary-50, #eef2ff);
}

.vso-feedback-edit {
  color: #334155;
}

.vso-feedback-edit:hover {
  background: #f1f5f9;
}

/* View button */
.vso-view-btn {
  padding: 5px 16px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
}

.vso-view-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

/* Footer */
.vso-footer {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 16px 28px;
  border-top: 1px solid #e2e8f0;
  gap: 12px;
}

/* UIUX-114: names-only assigned students (no table checkboxes) */
.vso-student-name-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  max-height: min(320px, 40vh);
  overflow-y: auto;
}

.vso-student-name-row {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
}

.vso-student-name-row:last-child {
  border-bottom: none;
}

.vso-student-name-empty {
  padding: 16px 14px;
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
}

/* Overview mobile */
@media (max-width: 768px) {
  .vs-overlay:has(.vso-container) {
    padding: 16px;
  }

  .vso-container {
    max-height: 95vh;
  }

  .vso-scroll-body {
    -webkit-overflow-scrolling: touch;
  }

  .vso-header {
    padding: 16px 16px 12px;
  }

  .vso-title {
    font-size: 16px;
  }

  .vso-dashboards {
    padding: 16px;
  }

  .vso-dashboard-cards {
    flex-direction: column;
  }

  .vso-dcard {
    min-width: unset;
  }

  .vso-stats {
    padding: 0 16px 16px;
    gap: 8px;
  }

  .vso-stat-box {
    padding: 10px 8px;
  }

  .vso-stat-num {
    font-size: 22px;
  }

  .vso-stat-label {
    font-size: 11px;
  }

  .vso-submissions {
    padding: 0 16px 16px;
  }

  .vso-search {
    max-width: 100%;
  }

  .vso-footer {
    padding: 12px 16px;
  }
}
</style>
