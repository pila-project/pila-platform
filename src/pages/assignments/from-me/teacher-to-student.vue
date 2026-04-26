<template>
  <div v-if="loading" class="wizard-loading">
    <i class="fa fa-spinner fa-spin" /> {{ t('loading') }}
  </div>
  <div v-else-if="selectingContent" class="wizard-content-browse">
    <div class="wizard-header">
      <div>
        <h2 class="wizard-title">{{ t('create-new-assignment') }}</h2>
        <p class="wizard-subtitle">{{ stepSubtitles[1] }}</p>
      </div>
      <button class="wizard-close" @click="$emit('close')">
        <i class="fa-solid fa-xmark" />
      </button>
    </div>
    <div class="wizard-separator" />

    <!-- Stepper (still visible) -->
    <div class="stepper">
      <div v-for="step in steps" :key="step.num" class="stepper-item">
        <div class="step-col">
          <div class="step-circle" :class="stepCircleClass(step.num)">
            <i :class="step.icon" />
          </div>
          <span class="step-label" :class="stepLabelClass(step.num)">{{ t('step') }} {{ step.num }}</span>
        </div>
        <div v-if="step.num < 4" class="step-trail" :class="stepTrailClass(step.num)" />
      </div>
    </div>

    <!-- Content CTA -->
    <div class="content-cta">
      <i class="fa-solid fa-circle-plus content-cta-icon" />
      <div>
        <span class="content-cta-title">{{ t('add-content-item-or-sequence') }}</span>
        <span class="content-cta-desc">{{ t('drag-and-drop-content-description') }}</span>
      </div>
    </div>

    <!-- Inline ContentLibrary -->
    <ContentLibrary
      selectable
      :selected="assignment.content"
      @select="onContentSelect"
    />

    <!-- Footer -->
    <div class="wizard-footer">
      <PButton variant="ghost" :text="t('done')" @click="selectingContent = false; $emit('update:width', '480px')" />
      <div class="flex-1" />
    </div>
  </div>
  <div v-else class="wizard">
    <!-- Header -->
    <div class="wizard-header">
      <div>
        <h2 class="wizard-title">{{ t('create-new-assignment') }}</h2>
        <p class="wizard-subtitle">{{ stepSubtitles[currentStep - 1] }}</p>
      </div>
      <button class="wizard-close" @click="$emit('close')">
        <i class="fa-solid fa-xmark" />
      </button>
    </div>
    <div class="wizard-separator" />

    <!-- Stepper -->
    <div class="stepper">
      <div v-for="step in steps" :key="step.num" class="stepper-item">
        <div class="step-col">
          <div class="step-circle" :class="stepCircleClass(step.num)">
            <i :class="step.icon" />
          </div>
          <span class="step-label" :class="stepLabelClass(step.num)">{{ t('step') }} {{ step.num }}</span>
        </div>
        <div v-if="step.num < 4" class="step-trail" :class="stepTrailClass(step.num)" />
      </div>
    </div>

    <!-- ═══════════════ Step 1: Title & Instructions ═══════════════ -->
    <div v-if="currentStep === 1" class="step-body">
      <PInput
        v-model="assignment.name"
        :label="t('assignment-title')"
        :placeholder="t('assignment-title-placeholder')"
      />
      <PInput
        v-model="assignment.description"
        :label="t('instructions')"
        :placeholder="t('instructions-placeholder')"
        multiline
        :rows="5"
      />
      <div class="field-row">
        <PSelect
          v-model="assignmentType"
          :label="t('assignment-type')"
          :placeholder="t('assignment')"
          :items="assignmentTypeOptions"
        />
        <PInput
          v-model="dueDate"
          :label="t('due-date-optional')"
          placeholder="mm/dd/yyyy"
          type="date"
        />
      </div>
      <PInput
        v-model="dueTime"
        :label="t('due-time-optional')"
        placeholder="--:-- --"
        type="time"
      />
    </div>

    <!-- ═══════════════ Step 2: Add Content ═══════════════ -->
    <div v-else-if="currentStep === 2" class="step-body">
      <div class="content-cta" @click="openContentBrowser">
        <i class="fa-solid fa-circle-plus content-cta-icon" />
        <div>
          <span class="content-cta-title">{{ t('add-content-item-or-sequence') }}</span>
          <span class="content-cta-desc">{{ t('drag-and-drop-content-description') }}</span>
        </div>
      </div>

      <div class="content-current">
        <div class="content-current-header">
          <span class="content-current-label">{{ t('current-item-sequence') }} ({{ assignment.content ? 1 : 0 }})</span>
          <PButton
            v-if="assignment.content"
            variant="ghost"
            size="sm"
            icon="fa-regular fa-eye"
            :text="t('preview')"
            @click="previewing = assignment.content"
          />
        </div>
        <div v-if="!assignment.content" class="content-empty">
          {{ t('no-items-added-yet') }}
        </div>
        <div v-else class="content-item">
          <i class="fa-solid fa-file-lines content-item-icon" />
          <NameOrTranslatedNameFromItemId :itemId="assignment.content" />
          <button class="content-item-remove" @click="assignment.content = null">
            <i class="fa-solid fa-xmark" />
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════ Step 3: Assignment Details ═══════════════ -->
    <div v-else-if="currentStep === 3" class="step-body">
      <div class="toggle-row">
        <div class="toggle-content">
          <span class="toggle-label">{{ t('allow-late-submissions') }}</span>
          <span class="toggle-desc">{{ t('students-can-submit-after-due-date') }}</span>
        </div>
        <button class="toggle-switch" :class="{ active: allowLate }" @click="allowLate = !allowLate">
          <span class="toggle-thumb" />
        </button>
      </div>

      <div class="field-row">
        <PSelect
          v-model="maxAttempts"
          :label="t('maximum-attempts')"
          :placeholder="t('1-attempt')"
          :items="maxAttemptsOptions"
        />
        <PSelect
          v-model="feedbackTiming"
          :label="t('feedback-timing')"
          :placeholder="t('at-the-end')"
          :items="feedbackTimingOptions"
        />
      </div>

      <div class="toggle-row">
        <div class="toggle-content">
          <span class="toggle-label">{{ t('shuffle-questions') }}</span>
          <span class="toggle-desc">{{ t('randomize-question-order') }}</span>
        </div>
        <button class="toggle-switch" :class="{ active: shuffleQuestions }" @click="shuffleQuestions = !shuffleQuestions">
          <span class="toggle-thumb" />
        </button>
      </div>

      <div class="toggle-row">
        <div class="toggle-content">
          <span class="toggle-label">{{ t('show-correct-answers') }}</span>
          <span class="toggle-desc">{{ t('display-correct-answers-after-submission') }}</span>
        </div>
        <button class="toggle-switch" :class="{ active: showAnswers }" @click="showAnswers = !showAnswers">
          <span class="toggle-thumb" />
        </button>
      </div>

      <div class="wizard-separator" />

      <PInput
        v-model="teacherNotes"
        :label="t('teacher-notes-private')"
        :placeholder="t('add-private-notes-placeholder')"
        multiline
        :rows="5"
      />
    </div>

    <!-- ═══════════════ Step 4: Assign & Publish ═══════════════ -->
    <div v-else class="step-body">
      <div class="assign-section">
        <label class="field-label">{{ t('assign-to') }}</label>
        <PInput
          v-model="groupSearch"
          :placeholder="t('search-groups')"
          icon="fa-solid fa-magnifying-glass"
        />
        <div class="group-list">
          <div
            v-for="gid in filteredGroups"
            :key="gid"
            class="group-card"
            :class="{ 'group-card-selected': !!assignmentForGroup(gid) }"
            @click="toggleGroup(gid)"
          >
            <div class="group-icon" :class="assignmentForGroup(gid) ? 'group-icon-green' : 'group-icon-blue'">
              <i class="fa-solid fa-user-group" />
            </div>
            <div class="group-info">
              <span class="group-name">
                <vueScopeComponent :id="gid" :path="['name']" />
              </span>
              <span class="group-count">{{ t('students') }}</span>
            </div>
            <div class="group-check">
              <i v-if="assignmentForGroup(gid)" class="fa-solid fa-check" />
            </div>
          </div>
          <div v-if="!filteredGroups.length" class="content-empty">
            {{ t('no-groups-found') }}
          </div>
        </div>
      </div>

      <div class="wizard-separator" />

      <div class="distribution-section">
        <label class="field-label">{{ t('distribution-options') }}</label>
        <div
          v-for="opt in distributionOptions"
          :key="opt.value"
          class="radio-option"
          @click="distributionOption = opt.value"
        >
          <div class="radio-circle" :class="{ selected: distributionOption === opt.value }">
            <div v-if="distributionOption === opt.value" class="radio-dot" />
          </div>
          <div class="radio-content">
            <span class="radio-label">{{ opt.label }}</span>
            <span class="radio-desc">{{ opt.description }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="wizard-footer">
      <PButton
        v-if="currentStep > 1"
        variant="ghost"
        :text="t('back')"
        class="footer-back"
        @click="currentStep--"
      />
      <div class="flex-1" />
      <PButton
        variant="ghost"
        :text="t('cancel')"
        class="footer-cancel"
        @click="$emit('close')"
      />
      <PButton
        v-if="currentStep < 4"
        variant="primary"
        :text="t('next')"
        icon="fa-solid fa-arrow-right"
        :icon-right="true"
        @click="currentStep++"
      />
      <PButton
        v-else
        variant="primary"
        :text="t('create-assignment')"
        icon="fa-solid fa-arrow-right"
        :icon-right="true"
        @click="saveAndClose"
      />
    </div>
  </div>

  <PreviewModal
    v-if="previewing"
    :id="previewing"
    @close="previewing = null"
  />
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useStore } from 'vuex'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import ContentLibrary from '@/components/content/content-library.vue'
  import PreviewModal from '@/components/common/preview-modal.vue'
  import NameOrTranslatedNameFromItemId from '@/components/content/name-or-translated-name-from-item-id.vue'
  import { PButton, PInput, PSelect } from '@/components/ui/index.js'

  const props = defineProps({
    id: String,
  })

  const emit = defineEmits(['close', 'update:width'])

  const store = useStore()
  function t(slug) { return store.getters.t(slug) }

  // ── Wizard state ──
  const loading = ref(true)
  const currentStep = ref(1)
  const assignment = ref({ name: '', description: '', content: null })
  const selectingContent = ref(false)
  const previewing = ref(null)

  // ── Step definitions ──
  const steps = [
    { num: 1, icon: 'fa-solid fa-file-export' },
    { num: 2, icon: 'fa-solid fa-upload' },
    { num: 3, icon: 'fa-solid fa-file-arrow-up' },
    { num: 4, icon: 'fa-solid fa-graduation-cap' },
  ]

  const stepSubtitles = computed(() => [
    t('step-1-of-4-title-instructions'),
    t('step-2-of-4-add-content'),
    t('step-3-of-4-assignment-details'),
    t('step-4-of-4-assign-publish'),
  ])

  // ── Step 1: Title & Instructions (visual-only fields) ──
  const assignmentType = ref('')
  const dueDate = ref('')
  const dueTime = ref('')
  const assignmentTypeOptions = computed(() => [t('assignment'), t('quiz'), t('project')])

  // ── Step 3: Assignment Details (all visual-only) ──
  const allowLate = ref(true)
  const maxAttempts = ref('')
  const feedbackTiming = ref('')
  const shuffleQuestions = ref(true)
  const showAnswers = ref(true)
  const teacherNotes = ref('')
  const maxAttemptsOptions = computed(() => [t('1-attempt'), t('2-attempts'), t('3-attempts'), t('unlimited')])
  const feedbackTimingOptions = computed(() => [t('at-the-end'), t('after-each-question'), t('never')])

  // ── Step 4: Assign & Publish ──
  const groupSearch = ref('')
  const distributionOption = ref('publish')

  const groups = computed(() => store.getters['groups/groups']('class', true))

  const filteredGroups = computed(() => {
    if (!groupSearch.value) return groups.value
    const q = groupSearch.value.toLowerCase()
    return groups.value.filter(() => true) // Search filtering requires group name — for now show all
  })

  const distributionOptions = computed(() => [
    { value: 'publish', label: t('publish-immediately'), description: t('students-can-start-right-away') },
    { value: 'schedule', label: t('schedule-for-later'), description: t('set-specific-date-time') },
    { value: 'draft', label: t('save-as-draft'), description: t('keep-working-before-publishing') },
  ])

  // ── Group assignment logic (from GroupAssigner) ──
  function assignmentsForItem() {
    return store.getters['assignments/assignments'](props.id, 'teacher-to-student')
  }

  function assignmentForGroup(group_id) {
    const assignments = assignmentsForItem()
    return assignments.find(id => store.getters['assignments/get'](id).group_id === group_id)
  }

  function toggleGroup(group_id) {
    const existing = assignmentForGroup(group_id)
    if (existing) {
      store.dispatch('assignments/unassign', existing)
    } else {
      store.dispatch('assignments/assign', {
        group_id,
        item_id: props.id,
        assignment_type: 'teacher-to-student',
      })
    }
  }

  // ── Stepper helpers ──
  function stepCircleClass(num) {
    if (num <= currentStep.value) return 'step-active'
    return 'step-upcoming'
  }

  function stepLabelClass(num) {
    if (num <= currentStep.value) return 'step-label-active'
    return 'step-label-upcoming'
  }

  function stepTrailClass(num) {
    if (num < currentStep.value) return 'trail-completed'
    if (num === currentStep.value) return 'trail-active'
    return 'trail-upcoming'
  }

  // ── Content selection ──
  function openContentBrowser() {
    selectingContent.value = true
    emit('update:width', '984px')
  }

  function onContentSelect(id) {
    assignment.value.content = id
  }

  // ── Save all settings to backend ──
  async function saveSettings() {
    const state = await Agent.state(props.id)
    state.assignmentType = assignmentType.value || 'Assignment'
    state.dueDate = dueDate.value || null
    state.dueTime = dueTime.value || null
    state.allowLate = allowLate.value
    state.maxAttempts = maxAttempts.value || '1 attempt'
    state.feedbackTiming = feedbackTiming.value || 'At the end'
    state.shuffleQuestions = shuffleQuestions.value
    state.showAnswers = showAnswers.value
    state.teacherNotes = teacherNotes.value || ''
    state.status = distributionOption.value === 'publish' ? 'Published'
      : distributionOption.value === 'schedule' ? 'Scheduled'
      : 'Draft'
  }

  async function saveAndClose() {
    await saveSettings()
    await Agent.synced()
    emit('close')
  }

  // ── Load assignment data ──
  async function init() {
    loading.value = true
    const state = await Agent.state(props.id)
    assignment.value = state

    // Load persisted settings if editing existing assignment
    if (state.assignmentType) assignmentType.value = state.assignmentType
    if (state.dueDate) dueDate.value = state.dueDate
    if (state.dueTime) dueTime.value = state.dueTime
    if (state.allowLate !== undefined) allowLate.value = state.allowLate
    if (state.maxAttempts) maxAttempts.value = state.maxAttempts
    if (state.feedbackTiming) feedbackTiming.value = state.feedbackTiming
    if (state.shuffleQuestions !== undefined) shuffleQuestions.value = state.shuffleQuestions
    if (state.showAnswers !== undefined) showAnswers.value = state.showAnswers
    if (state.teacherNotes) teacherNotes.value = state.teacherNotes
    if (state.status === 'Published') distributionOption.value = 'publish'
    else if (state.status === 'Scheduled') distributionOption.value = 'schedule'
    else if (state.status === 'Draft') distributionOption.value = 'draft'

    loading.value = false
  }

  init()
</script>

<style scoped>
.wizard,
.wizard-content-browse {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.wizard-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px;
  color: #64748b;
  font-size: 14px;
}

/* ── Header ── */
.wizard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 12px;
  flex-shrink: 0;
}

.wizard-title {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  margin: 0;
  line-height: 1.4;
}

.wizard-subtitle {
  font-size: 12px;
  font-weight: 400;
  color: #334155;
  margin: 4px 0 0 0;
}

.wizard-close {
  width: 28px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 150ms;
  flex-shrink: 0;
}
.wizard-close:hover {
  background: #e2e8f0;
  color: #334155;
}

.wizard-separator {
  height: 1px;
  background: #e2e8f0;
  margin: 0;
  flex-shrink: 0;
}

/* ── Stepper ── */
.stepper {
  display: flex;
  align-items: flex-start;
  padding: 16px 0 20px;
  flex-shrink: 0;
}

.stepper-item {
  display: flex;
  align-items: flex-start;
  flex: 1;
}

.stepper-item:last-child {
  flex: 0;
}

.step-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all 200ms;
}

.step-active {
  background: #2563eb;
  color: white;
}

.step-upcoming {
  background: white;
  border: 1px solid #e2e8f0;
  color: #2563eb;
}

.step-label {
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
}

.step-label-active {
  color: #2563eb;
}

.step-label-upcoming {
  color: #64748b;
}

.step-trail {
  flex: 1;
  height: 1px;
  margin-top: 16px;
  margin-left: 4px;
  margin-right: 4px;
  min-width: 20px;
}

.trail-completed {
  background: #0162dd;
}

.trail-active {
  background: repeating-linear-gradient(
    to right,
    #0162dd 0px,
    #0162dd 3px,
    transparent 3px,
    transparent 7px
  );
  height: 2px;
  margin-top: 15px;
}

.trail-upcoming {
  background: #e2e8f0;
}

/* ── Step body ── */
.step-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* ── Side-by-side fields ── */
.field-row {
  display: flex;
  gap: 10px;
}
.field-row > * {
  flex: 1;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  display: block;
  margin-bottom: 8px;
}

/* ── Step 2: Content CTA ── */
.content-cta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px dashed #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms;
}
.content-cta:hover {
  border-color: #2563eb;
  background: #f8fafc;
}

.content-cta-icon {
  font-size: 24px;
  color: #64748b;
  flex-shrink: 0;
}

.content-cta-title {
  font-size: 14px;
  font-weight: 500;
  color: #2563eb;
  display: block;
}

.content-cta-desc {
  font-size: 12px;
  font-weight: 400;
  color: #334155;
  display: block;
  margin-top: 2px;
}

.content-current {
  margin-top: 4px;
}

.content-current-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.content-current-label {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.content-empty {
  font-size: 12px;
  font-weight: 400;
  color: #334155;
  padding: 12px 0;
}

.content-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 13px;
  color: #334155;
}

.content-item-icon {
  color: #2563eb;
  font-size: 14px;
  flex-shrink: 0;
}

.content-item-remove {
  margin-left: auto;
  border: none;
  background: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 12px;
}
.content-item-remove:hover {
  color: #dc2626;
}

/* ── Step 3: Toggle switches ── */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
}

.toggle-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.toggle-label {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.toggle-desc {
  font-size: 14px;
  font-weight: 400;
  color: #64748b;
}

.toggle-switch {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: #e2e8f0;
  border: none;
  position: relative;
  cursor: pointer;
  transition: background 150ms;
  flex-shrink: 0;
  margin-left: 12px;
}
.toggle-switch.active {
  background: #1d4ed8;
}

.toggle-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 4px;
  left: 4px;
  transition: left 150ms;
  display: block;
}
.toggle-switch.active .toggle-thumb {
  left: 24px;
}

/* ── Step 4: Groups ── */
.assign-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.group-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms;
  border: 2px solid transparent;
}
.group-card:hover {
  background: #f1f5f9;
}
.group-card-selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.group-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.group-icon-green {
  background: #dcfce7;
  color: #16a34a;
}

.group-icon-blue {
  background: #dbeafe;
  color: #2563eb;
}

.group-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.group-name {
  font-size: 16px;
  font-weight: 500;
  color: #334155;
}

.group-count {
  font-size: 12px;
  font-weight: 400;
  color: #64748b;
}

.group-check {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  font-size: 14px;
  flex-shrink: 0;
}

/* ── Step 4: Distribution radio ── */
.distribution-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radio-option {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  cursor: pointer;
}

.radio-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #e2e8f0;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 150ms;
  margin-top: 2px;
}
.radio-circle.selected {
  border-color: #2563eb;
}

.radio-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #2563eb;
}

.radio-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.radio-label {
  font-size: 14px;
  font-weight: 500;
  color: #020617;
}

.radio-desc {
  font-size: 14px;
  font-weight: 400;
  color: #64748b;
}

/* ── Footer ── */
.wizard-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 16px;
  flex-shrink: 0;
  border-top: 1px solid #e2e8f0;
}

.flex-1 {
  flex: 1;
}

.footer-back {
  color: #2563eb !important;
}

.footer-cancel {
  color: #dc2626 !important;
}

/* ── Content browse mode ── */
.wizard-content-browse {
  min-height: 400px;
}

/* ── Mobile Responsive ── */
@media (max-width: 768px) {
  .stepper {
    padding: 12px 0 16px;
  }

  .step-circle {
    width: 28px;
    height: 28px;
    font-size: 11px;
  }

  .step-label {
    font-size: 11px;
  }

  .step-trail {
    margin-top: 14px;
    min-width: 12px;
  }

  .field-row {
    flex-direction: column;
    gap: 12px;
  }

  .toggle-row {
    padding: 8px 0;
  }

  .toggle-label {
    font-size: 13px;
  }

  .toggle-desc {
    font-size: 12px;
  }

  .group-icon {
    width: 40px;
    height: 40px;
    font-size: 14px;
  }

  .group-name {
    font-size: 14px;
  }

  .group-list {
    max-height: 180px;
  }

  .wizard-footer {
    flex-wrap: wrap;
    gap: 6px;
    padding-top: 12px;
  }

  .wizard-content-browse {
    min-height: 300px;
  }

  .content-cta {
    padding: 12px;
  }

  .content-cta-icon {
    font-size: 20px;
  }

  .content-cta-title {
    font-size: 13px;
  }

  .content-cta-desc {
    font-size: 11px;
  }
}
</style>
