<template>
  <PModal
    :title="step === 'success' ? '' : undefined"
    :width="step === 2 && browsingContent ? '900px' : '520px'"
    @close="$emit('close')"
  >
    <template v-if="step !== 'success'" #title>
      <div>
        <h2 class="text-lg font-semibold text-zinc-950">Create new assignment</h2>
        <p class="text-xs text-slate-500 mt-0.5">{{ stepSubtitles[step - 1] }}</p>
      </div>
    </template>

    <template #body>
      <!-- Success state -->
      <div v-if="step === 'success'" class="success-state">
        <div class="success-icon-ring">
          <LucideIcon name="check" :size="24" class="text-green-600" />
        </div>
        <h3 class="text-lg font-semibold text-zinc-950 mt-4">New assignment has been successfully created</h3>
        <p class="text-sm text-slate-500 mt-2">
          A new assignment "{{ form.name }}" has been created and "content" has been successfully added to it.
        </p>
      </div>

      <template v-else>
        <!-- Stepper -->
        <div class="stepper">
          <div v-for="s in steps" :key="s.num" class="stepper-item">
            <div class="step-col">
              <div class="step-circle" :class="stepCircleClass(s.num)">
                <LucideIcon :name="s.icon" :size="13" />
              </div>
              <span class="step-label" :class="stepLabelClass(s.num)">Step {{ s.num }}</span>
            </div>
            <div v-if="s.num < 4" class="step-trail" :class="stepTrailClass(s.num)" />
          </div>
        </div>

        <!-- Step 1: Title & Instructions -->
        <div v-if="step === 1" class="step-body">
          <PInput
            v-model="form.name"
            label="Assignment Title"
            placeholder="e.g, Mathematics Quiz - Fractions"
            required
          />
          <PInput
            v-model="form.description"
            label="Instructions"
            placeholder="Provide detailed instructions for students"
            multiline
            :rows="4"
          />
          <div class="field-row">
            <PSelect
              v-model="form.assignmentType"
              label="Assignment type"
              placeholder="Assignment"
              :items="assignmentTypeOptions"
              required
            />
            <PInput
              v-model="form.dueDate"
              label="Due date(Optional)"
              placeholder="mm/dd/yyyy"
              type="date"
            />
          </div>
          <PInput
            v-model="form.dueTime"
            label="Due time(Optional)"
            placeholder="--:-- --"
            type="time"
          />
        </div>

        <!-- Step 2: Add Content -->
        <div v-else-if="step === 2" class="step-body">
          <!-- Content CTA -->
          <div class="content-cta" @click="browsingContent = !browsingContent">
            <LucideIcon name="circle-plus" :size="24" class="content-cta-icon" />
            <div>
              <span class="content-cta-title">Add content item/sequence</span>
              <span class="content-cta-desc">Browse and select content from the library</span>
            </div>
          </div>

          <!-- Inline content browser (same component as explore page) -->
          <ContentBrowser
            v-if="browsingContent"
            :columns="2"
            :per-page="6"
            :per-page-options="[6, 12, 24]"
            use-disk-cache
          >
            <template #card="{ id, source, grades }">
              <TaggedContentCard
                :id="id"
                :checked="form.contentIds.includes(id)"
                :source="source"
                :grades="grades"
                @click="previewingId = id"
                @toggle-select="toggleContent(id)"
              />
            </template>
          </ContentBrowser>

          <!-- Current selected content -->
          <div class="mt-3">
            <div class="content-current-header">
              <span class="text-sm font-medium text-slate-700">Current item/sequence ({{ form.contentIds.length }})</span>
              <PButton
                v-if="form.contentIds.length"
                variant="ghost"
                size="sm"
                icon="lucide:eye"
                text="Preview"
                @click="previewingId = form.contentIds[0]"
              />
            </div>
            <div v-if="!form.contentIds.length" class="text-xs text-slate-400 py-3">
              no items added yet
            </div>
            <div v-else class="content-selected-list">
              <div v-for="cid in form.contentIds" :key="cid" class="content-selected-item">
                <LucideIcon name="file-text" :size="14" class="text-primary-600" />
                <span class="flex-1 text-sm text-slate-700 truncate">
                  <NameOrTranslatedNameFromItemId :itemId="cid" />
                </span>
                <button class="content-remove-btn" @click="removeContent(cid)">
                  <LucideIcon name="x" :size="12" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Assignment Details -->
        <div v-else-if="step === 3" class="step-body">
          <div class="toggle-row">
            <div class="toggle-content">
              <span class="toggle-label">Allow late submissions</span>
              <span class="toggle-desc">Students can submit after due date</span>
            </div>
            <button class="toggle-switch" :class="{ active: form.allowLate }" @click="form.allowLate = !form.allowLate">
              <span class="toggle-thumb" />
            </button>
          </div>

          <div class="field-row">
            <PSelect
              v-model="form.maxAttempts"
              label="Maximum attempts"
              placeholder="1 attempt"
              :items="maxAttemptsOptions"
            />
            <PSelect
              v-model="form.feedbackTiming"
              label="Feedback timing"
              placeholder="At the end"
              :items="feedbackTimingOptions"
            />
          </div>

          <div class="toggle-row">
            <div class="toggle-content">
              <span class="toggle-label">Shuffle questions</span>
              <span class="toggle-desc">Randomize question order for each student</span>
            </div>
            <button class="toggle-switch" :class="{ active: form.shuffleQuestions }" @click="form.shuffleQuestions = !form.shuffleQuestions">
              <span class="toggle-thumb" />
            </button>
          </div>

          <div class="toggle-row">
            <div class="toggle-content">
              <span class="toggle-label">Show correct answers</span>
              <span class="toggle-desc">Display correct answers after submission</span>
            </div>
            <button class="toggle-switch" :class="{ active: form.showAnswers }" @click="form.showAnswers = !form.showAnswers">
              <span class="toggle-thumb" />
            </button>
          </div>

          <div class="wizard-separator" />

          <PInput
            v-model="form.teacherNotes"
            label="Teacher notes (private)"
            placeholder="Add private notes for your reference..."
            multiline
            :rows="3"
          />
        </div>

        <!-- Step 4: Assign & Publish -->
        <div v-else-if="step === 4" class="step-body">
          <div class="assign-section">
            <label class="field-label">Assign to</label>
            <PInput
              v-model="groupSearch"
              placeholder="Search group(s)"
              icon="lucide:search"
            />
            <div class="group-list">
              <div
                v-for="gid in filteredGroups"
                :key="gid"
                class="group-card"
                :class="{ 'group-card-selected': selectedGroups.has(gid) }"
                @click="toggleGroup(gid)"
              >
                <div class="group-icon" :class="selectedGroups.has(gid) ? 'group-icon-green' : 'group-icon-blue'">
                  <LucideIcon name="users" :size="16" />
                </div>
                <div class="group-info">
                  <span class="group-name">
                    <vueScopeComponent :id="gid" :path="['name']" />
                  </span>
                  <span class="group-meta">
                    <vueScopeComponent :id="gid" :path="['name']" />
                  </span>
                </div>
                <div class="group-check">
                  <LucideIcon v-if="selectedGroups.has(gid)" name="check" :size="14" />
                </div>
              </div>
              <div v-if="!filteredGroups.length" class="text-xs text-slate-400 py-3">
                No groups found
              </div>
            </div>
          </div>

          <div class="wizard-separator" />

          <div class="distribution-section">
            <label class="field-label">Distribution options</label>
            <div
              v-for="opt in distributionOptions"
              :key="opt.value"
              class="radio-option"
              @click="form.distribution = opt.value"
            >
              <div class="radio-circle" :class="{ selected: form.distribution === opt.value }">
                <div v-if="form.distribution === opt.value" class="radio-dot" />
              </div>
              <div class="radio-content">
                <span class="radio-label">{{ opt.label }}</span>
                <span class="radio-desc">{{ opt.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <template #footer>
      <template v-if="step === 'success'">
        <PButton variant="secondary" :text="t('continue-browsing')" @click="$emit('close')" />
        <PButton variant="primary" :text="t('go-to-assignment')" @click="$emit('close')" />
      </template>
      <template v-else>
        <PButton
          v-if="step > 1"
          variant="ghost"
          text="Back"
          @click="onBack"
        />
        <div class="flex-1" />
        <PButton
          variant="secondary"
          color="danger"
          :text="t('cancel')"
          @click="$emit('close')"
        />
        <PButton
          v-if="step < 4"
          variant="primary"
          text="Next"
          icon="lucide:arrow-right"
          :icon-right="true"
          :disabled="!canProceed"
          @click="step++"
        />
        <PButton
          v-else
          variant="primary"
          text="Create assignment"
          icon="lucide:arrow-right"
          :icon-right="true"
          :disabled="!canProceed"
          :loading="creating"
          @click="createAssignment"
        />
      </template>
    </template>
  </PModal>

  <PreviewModal
    v-if="previewingId"
    :id="previewingId"
    @close="previewingId = null"
  />
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useStore } from 'vuex'
import { vueScopeComponent } from '@knowlearning/agents/vue.js'
import NameOrTranslatedNameFromItemId from './name-or-translated-name-from-item-id.vue'
import TaggedContentCard from '@/components/tags/tagged-content-card.vue'
import ContentBrowser from './content-browser.vue'
import PreviewModal from '@/components/common/preview-modal.vue'
import { PModal, PInput, PButton, PSelect } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'

const store = useStore()

const props = defineProps({
  contentIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'created'])

const step = ref(1)
const creating = ref(false)
const previewingId = ref(null)
const browsingContent = ref(false)
const groupSearch = ref('')

// Groups
const selectedGroups = reactive(new Set())

// Form state
const form = reactive({
  name: '',
  description: '',
  assignmentType: '',
  dueDate: '',
  dueTime: '',
  contentIds: [...props.contentIds],
  allowLate: true,
  maxAttempts: '',
  feedbackTiming: '',
  shuffleQuestions: true,
  showAnswers: true,
  teacherNotes: '',
  distribution: 'publish',
})

const steps = [
  { num: 1, icon: 'file-output' },
  { num: 2, icon: 'upload' },
  { num: 3, icon: 'file-up' },
  { num: 4, icon: 'graduation-cap' },
]

const stepSubtitles = [
  'Step 1 of 4: Add title and instructions',
  'Step 2 of 4: Add content',
  'Step 3 of 4: Add assignment details',
  'Step 4 of 4: Assign and publish',
]

const assignmentTypeOptions = ['Assignment', 'Quiz', 'Project']
const maxAttemptsOptions = ['1 attempt', '2 attempts', '3 attempts', 'Unlimited']
const feedbackTimingOptions = ['At the end', 'After each question', 'Never']
const distributionOptions = [
  { value: 'publish', label: 'Publish immediately', description: 'Students can start working right away' },
  { value: 'schedule', label: 'Schedule for later', description: 'Set a specific date and time to publish' },
  { value: 'draft', label: 'Save as draft', description: 'Keep working on it before publishing' },
]

const groups = computed(() => store.getters['groups/groups']('class', true))

const filteredGroups = computed(() => {
  if (!groupSearch.value) return groups.value
  return groups.value
})

function toggleContent(id) {
  const idx = form.contentIds.indexOf(id)
  if (idx >= 0) form.contentIds.splice(idx, 1)
  else form.contentIds.push(id)
}

function removeContent(id) {
  const idx = form.contentIds.indexOf(id)
  if (idx >= 0) form.contentIds.splice(idx, 1)
}

function toggleGroup(gid) {
  if (selectedGroups.has(gid)) selectedGroups.delete(gid)
  else selectedGroups.add(gid)
}

const canProceed = computed(() => {
  if (step.value === 1) return form.name.trim() !== '' && form.assignmentType !== ''
  if (step.value === 2) return form.contentIds.length > 0
  if (step.value === 3) return true
  if (step.value === 4) return selectedGroups.size > 0
  return false
})

function onBack() {
  if (step.value === 2 && browsingContent.value) {
    browsingContent.value = false
  } else {
    step.value--
  }
}

// Stepper helpers
function stepCircleClass(num) {
  return num <= step.value ? 'step-active' : 'step-upcoming'
}

function stepLabelClass(num) {
  return num <= step.value ? 'step-label-active' : 'step-label-upcoming'
}

function stepTrailClass(num) {
  if (num < step.value) return 'trail-completed'
  if (num === step.value) return 'trail-active'
  return 'trail-upcoming'
}

async function createAssignment() {
  if (creating.value) return
  creating.value = true

  try {
    // Create assignments for each selected group + content item
    for (const contentId of form.contentIds) {
      for (const groupId of selectedGroups) {
        await store.dispatch('assignments/assign', {
          group_id: groupId,
          item_id: contentId,
          assignment_type: 'teacher-to-student',
        })
      }
    }
    step.value = 'success'
    emit('created')
  } catch (e) {
    console.error('[CreateAssignmentModal] error:', e)
  } finally {
    creating.value = false
  }
}

</script>

<style scoped>
/* Stepper */
.stepper {
  display: flex;
  align-items: flex-start;
  padding: 12px 0 16px;
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
    #0162dd 0px, #0162dd 3px,
    transparent 3px, transparent 7px
  );
  height: 2px;
  margin-top: 15px;
}
.trail-upcoming {
  background: #e2e8f0;
}

/* Step body */
.step-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
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
.wizard-separator {
  height: 1px;
  background: #e2e8f0;
}
.flex-1 {
  flex: 1;
}
.cancel-btn {
  color: #dc2626 !important;
}

/* Content CTA */
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
  color: #334155;
  display: block;
  margin-top: 2px;
}

/* Current content */
.content-current-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.content-selected-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.content-selected-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
}
.content-remove-btn {
  border: none;
  background: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 12px;
}
.content-remove-btn:hover {
  color: #dc2626;
}

/* Toggle switches */
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

/* Groups */
.assign-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.group-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
.group-meta {
  font-size: 12px;
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

/* Distribution */
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
  color: #64748b;
}

/* Success */
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 16px;
}
.success-icon-ring {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f0fdf4;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
