<template>
  <Teleport to="body">
    <div class="vs-overlay">
      <!-- Navigation bar -->
      <div class="vs-navbar">
        <button class="vs-back" @click="$emit('close')">
          <i class="fa-solid fa-arrow-left" />
          {{ t('back') }}
        </button>
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
                <i
                  v-if="getItemResult(i) === true"
                  class="fa-solid fa-circle-check vs-qcard-icon vs-icon-correct"
                />
                <i
                  v-else-if="getItemResult(i) === false"
                  class="fa-solid fa-triangle-exclamation vs-qcard-icon vs-icon-incorrect"
                />
                <i
                  v-else
                  class="fa-solid fa-circle-minus vs-qcard-icon vs-icon-skipped"
                />
              </div>
              <div class="vs-qcard-desc">
                <NameOrTranslatedNameFromItemId :itemId="itemId" />
              </div>
              <div class="vs-qcard-footer">
                <i class="fa-solid fa-list-check vs-qcard-type-icon" />
                <span class="vs-qcard-type">{{ t('item') }}</span>
                <span class="vs-qcard-points">{{ getItemResult(i) === true ? '3' : '0' }} {{ t('point') }}</span>
              </div>
            </div>
          </div>

          <!-- Student switcher at bottom -->
          <div class="vs-student-nav">
            <button
              class="vs-student-nav-btn"
              :disabled="selectedStudentIndex === 0"
              @click="selectedStudentIndex--"
            >
              <i class="fa-solid fa-chevron-left" />
            </button>
            <span class="vs-student-nav-label">
              {{ selectedStudentIndex + 1 }} / {{ students.length }}
            </span>
            <button
              class="vs-student-nav-btn"
              :disabled="selectedStudentIndex >= students.length - 1"
              @click="selectedStudentIndex++"
            >
              <i class="fa-solid fa-chevron-right" />
            </button>
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
                    <i class="fa fa-spinner fa-spin" /> {{ t('loading-question') }}
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
          <div class="vs-tabs">
            <button
              class="vs-tab"
              :class="{ 'vs-tab-active': rightTab === 'overview' }"
              @click="rightTab = 'overview'"
            >{{ t('overview') }}</button>
            <button
              class="vs-tab"
              :class="{ 'vs-tab-active': rightTab === 'details' }"
              @click="rightTab = 'details'"
            >{{ t('details') }}</button>
          </div>

          <!-- Overview tab -->
          <div v-if="rightTab === 'overview'" class="vs-tab-content">
            <div class="vs-section">
              <h4 class="vs-section-heading">
                <i class="fa-solid fa-clipboard-list vs-section-icon" />
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
                <i class="fa-solid fa-star vs-section-icon" />
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
                <i class="fa-solid fa-star vs-section-icon" />
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
                <i class="fa-solid fa-clipboard-list vs-section-icon" />
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
              <input type="checkbox" v-model="autoSave" class="vs-checkbox" />
            </div>
            <div class="vs-footer-actions">
              <button class="vs-btn-draft" @click="saveDraft">{{ t('save-draft') }}</button>
              <button class="vs-btn-graded" @click="markAsGraded">{{ t('mark-as-graded') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
  import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
  import { useStore } from 'vuex'
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import NameOrTranslatedNameFromItemId from '@/components/content/name-or-translated-name-from-item-id.vue'

  const props = defineProps({
    assignmentId: { type: String, required: true },
  })

  const emit = defineEmits(['close'])
  const store = useStore()
  function t(slug) { return store.getters.t(slug) }

  // ── State ──
  const loading = ref(true)
  const assignmentName = ref('')
  const contentId = ref(null)
  const sequenceItems = ref([])
  const selectedStudentIndex = ref(0)
  const selectedItemIndex = ref(0)
  const rightTab = ref('overview')
  const performanceData = ref(null)
  const submittedAt = ref(null)
  const maxAttempts = ref('1')
  const assignmentDueDate = ref('--')

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
    return info?.name || `${t('student')} ${selectedStudentIndex.value + 1}`
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

  async function loadStudentInfo(userId) {
    if (!userId || studentInfoCache[userId]) return
    try {
      const info = await store.getters.decryptUserInfo(userId)
      studentInfoCache[userId] = info
    } catch {
      studentInfoCache[userId] = { name: 'Unknown' }
    }
  }

  // ── Init ──
  async function init() {
    loading.value = true

    // Load assignment data
    const assignState = await Agent.state(props.assignmentId)
    assignmentName.value = assignState.name || t('assignment')
    contentId.value = assignState.content
    maxAttempts.value = assignState.maxAttempts || '1'

    if (assignState.dueDate) {
      const d = new Date(assignState.dueDate)
      assignmentDueDate.value = d.toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit',
        hour12: true
      })
    }

    // Load sequence items
    if (contentId.value) {
      try {
        const seqState = await Agent.state(contentId.value)
        if (seqState.items) {
          sequenceItems.value = Array.isArray(seqState.items)
            ? seqState.items
            : Object.values(seqState.items).map(item => item.id || item)
        }
      } catch {
        sequenceItems.value = []
      }
    }

    // Load first student info and performance
    if (students.value.length > 0) {
      await loadStudentInfo(students.value[0])
      await watchStudentPerformance()
      await loadGradingData()
    }

    loading.value = false
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') emit('close')
  }

  onMounted(() => document.addEventListener('keydown', handleKeydown))
  onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown))

  init()
</script>

<style scoped>
.vs-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: white;
  display: flex;
  flex-direction: column;
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

.vs-student-nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 11px;
}
.vs-student-nav-btn:hover:not(:disabled) {
  background: #f8fafc;
  color: #334155;
}
.vs-student-nav-btn:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
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

.vs-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.vs-tab {
  flex: 1;
  padding: 12px;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 150ms;
}
.vs-tab:hover {
  color: #334155;
}
.vs-tab-active {
  color: #2563eb;
  border-bottom-color: #2563eb;
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
</style>
