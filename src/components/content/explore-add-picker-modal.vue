<template>
  <PModal width="520px" no-pad-body @close="$emit('close')">
    <template #title>
      <ExploreAddPickerHeader
        v-if="step !== 'assignment-success'"
        :title="headerTitle"
        :subtitle="headerSubtitle"
        @close="$emit('close')"
      />
    </template>

    <template #body>
      <!-- Step 1: Choose destination -->
      <div v-if="step === 'choose'" class="eap-body">
        <div class="eap-choice-row">
          <button
            type="button"
            class="eap-choice-card"
            :class="{ 'eap-choice-card--selected': destination === 'assignment' }"
            @click="destination = 'assignment'"
          >
            <div class="eap-choice-icon eap-choice-icon--assignment">
              <LucideIcon name="file" :size="21" />
            </div>
            <span class="eap-choice-label">{{ t('add-to-assignment') }}</span>
          </button>
          <button
            type="button"
            class="eap-choice-card"
            :class="{ 'eap-choice-card--selected': destination === 'sequence' }"
            @click="destination = 'sequence'"
          >
            <div class="eap-choice-icon eap-choice-icon--sequence">
              <LucideIcon name="file-chart-line" :size="21" />
            </div>
            <span class="eap-choice-label">{{ t('add-to-sequence') }}</span>
          </button>
        </div>
      </div>

      <!-- Step 2a: Assignment — new vs existing -->
      <div v-else-if="step === 'assignment-choice'" class="eap-body">
        <p class="eap-section-label">
          {{ t('where-add-content') }}
        </p>
        <div class="eap-choice-row">
          <button
            type="button"
            class="eap-choice-card"
            :class="{ 'eap-choice-card--selected': assignmentMode === 'new' }"
            @click="assignmentMode = 'new'"
          >
            <div class="eap-choice-icon eap-choice-icon--assignment">
              <LucideIcon name="file" :size="21" />
            </div>
            <span class="eap-choice-label eap-choice-label--multiline">{{ t('create-new-assignment') }}</span>
          </button>
          <button
            type="button"
            class="eap-choice-card"
            :class="{ 'eap-choice-card--selected': assignmentMode === 'existing' }"
            @click="assignmentMode = 'existing'"
          >
            <div class="eap-choice-icon eap-choice-icon--sequence">
              <LucideIcon name="file-pen" :size="21" />
            </div>
            <span class="eap-choice-label eap-choice-label--multiline">
              {{ t('add-to-existing-assignment') }}
            </span>
          </button>
        </div>
      </div>

      <!-- Step 2a-seq: Sequence — new vs existing (parity with assignment) -->
      <div v-else-if="step === 'sequence-choice'" class="eap-body">
        <p class="eap-section-label">
          {{ t('where-add-content') }}
        </p>
        <div class="eap-choice-row">
          <button
            type="button"
            class="eap-choice-card"
            :class="{ 'eap-choice-card--selected': sequenceMode === 'new' }"
            @click="sequenceMode = 'new'"
          >
            <div class="eap-choice-icon eap-choice-icon--sequence">
              <LucideIcon name="file-chart-line" :size="21" />
            </div>
            <span class="eap-choice-label eap-choice-label--multiline">{{ t('create-new-sequence') }}</span>
          </button>
          <button
            type="button"
            class="eap-choice-card"
            :class="{ 'eap-choice-card--selected': sequenceMode === 'existing' }"
            @click="sequenceMode = 'existing'"
          >
            <div class="eap-choice-icon eap-choice-icon--assignment">
              <LucideIcon name="file-pen" :size="21" />
            </div>
            <span class="eap-choice-label eap-choice-label--multiline">
              {{ t('add-to-existing-sequence') }}
            </span>
          </button>
        </div>
      </div>

      <!-- Step 2b: Pick existing assignment -->
      <div v-else-if="step === 'assignment-list'" class="eap-body">
        <PInput
          v-model="assignmentSearch"
          :placeholder="t('search-assignments')"
          icon="lucide:search"
        />
        <div v-if="assignmentsLoading" class="eap-loading" aria-busy="true">
          <LucideIcon name="loader-2" :size="14" :spin="true" />
          {{ t('loading') }}
        </div>
        <div v-else class="eap-radio-list">
          <button
            v-for="id in filteredAssignmentIds"
            :key="id"
            type="button"
            class="eap-radio-card"
            :class="{ 'eap-radio-card--selected': selectedAssignmentId === id }"
            @click="selectedAssignmentId = id"
          >
            <div class="eap-radio-row">
              <span class="eap-radio-circle" :class="{ 'eap-radio-circle--selected': selectedAssignmentId === id }">
                <span v-if="selectedAssignmentId === id" class="eap-radio-dot" />
              </span>
              <div class="eap-radio-text">
                <span class="eap-radio-title">{{ assignmentData[id]?.name || t('untitled') }}</span>
                <span class="eap-radio-desc">
                  {{ assignmentData[id]?.description || t('no-description') }}
                </span>
              </div>
            </div>
            <div v-if="assignmentBadges(id).length" class="eap-radio-badges">
              <PBadge
                v-for="badge in assignmentBadges(id)"
                :key="badge"
                variant="outline"
                :text="badge"
              />
            </div>
          </button>
          <p v-if="!filteredAssignmentIds.length" class="eap-empty">
            {{ t('no-data-available') }}
          </p>
        </div>
      </div>

      <!-- Step 2c: Pick sequence -->
      <div v-else-if="step === 'sequence-list'" class="eap-body">
        <div v-if="previewItem" class="eap-preview-card">
          <p class="eap-preview-title">{{ previewItem.name }}</p>
          <p v-if="previewItem.description" class="eap-preview-desc">{{ previewItem.description }}</p>
          <p v-if="previewItem.modified" class="eap-preview-meta">{{ previewItem.modified }}</p>
        </div>

        <PInput
          v-model="sequenceSearch"
          :placeholder="t('search-sequences')"
          icon="lucide:search"
        />
        <div v-if="sequencesLoading" class="eap-loading" aria-busy="true">
          <LucideIcon name="loader-2" :size="14" :spin="true" />
          {{ t('loading') }}
        </div>
        <div v-else class="eap-radio-list">
          <button
            v-for="id in filteredSequenceIds"
            :key="id"
            type="button"
            class="eap-radio-card"
            :class="{ 'eap-radio-card--selected': selectedSequenceId === id }"
            @click="selectedSequenceId = id"
          >
            <div class="eap-radio-row">
              <span class="eap-radio-circle" :class="{ 'eap-radio-circle--selected': selectedSequenceId === id }">
                <span v-if="selectedSequenceId === id" class="eap-radio-dot" />
              </span>
              <div class="eap-radio-text">
                <span class="eap-radio-title">{{ sequenceData[id]?.name || t('untitled') }}</span>
                <span v-if="sequenceData[id]?.description" class="eap-radio-desc">
                  {{ sequenceData[id].description }}
                </span>
              </div>
            </div>
            <div v-if="sequenceBadges(id).length" class="eap-radio-badges">
              <PBadge
                v-for="badge in sequenceBadges(id)"
                :key="badge"
                variant="outline"
                :text="badge"
              />
            </div>
          </button>
          <p v-if="!filteredSequenceIds.length" class="eap-empty">
            {{ t('no-sequences-yet') }}
          </p>
        </div>
      </div>

      <!-- Success -->
      <div v-else-if="step === 'assignment-success'" class="eap-success">
        <div class="eap-success-icon">
          <LucideIcon name="check" :size="24" class="text-green-600" />
        </div>
        <h3 class="eap-success-title">
          {{ assignmentResult?.duplicate
            ? (t('content-already-in-assignment'))
            : (t('content-added-to-assignment')) }}
        </h3>
        <p class="eap-success-desc">
          <template v-if="assignmentResult?.duplicate">
            {{ assignmentResult.name }}
          </template>
          <template v-else>
            {{ assignmentResult?.added }} {{ t('items-added-to-assignment') }}
            “{{ assignmentResult?.name }}”
          </template>
        </p>
      </div>
    </template>

    <template #footer>
      <template v-if="step === 'choose'">
        <div class="eap-footer-split">
          <PButton variant="outline" :text="t('back')" @click="$emit('close')" />
          <div class="eap-footer-actions">
            <PButton variant="secondary" :text="t('cancel')" @click="$emit('close')" />
            <PButton
              variant="primary"
              :text="t('next')"
              :disabled="!destination"
              @click="onChooseNext"
            />
          </div>
        </div>
      </template>

      <template v-else-if="step === 'assignment-choice'">
        <div class="eap-footer-split">
          <PButton variant="outline" :text="t('back')" @click="goBack" />
          <div class="eap-footer-actions">
            <PButton variant="secondary" :text="t('cancel')" @click="$emit('close')" />
            <PButton
              variant="primary"
              :text="t('next')"
              :disabled="!assignmentMode"
              @click="onAssignmentChoiceNext"
            />
          </div>
        </div>
      </template>

      <template v-else-if="step === 'sequence-choice'">
        <div class="eap-footer-split">
          <PButton variant="outline" :text="t('back')" @click="goBack" />
          <div class="eap-footer-actions">
            <PButton variant="secondary" :text="t('cancel')" @click="$emit('close')" />
            <PButton
              variant="primary"
              :text="t('next')"
              :disabled="!sequenceMode"
              @click="onSequenceChoiceNext"
            />
          </div>
        </div>
      </template>

      <template v-else-if="step === 'assignment-list'">
        <div class="eap-footer-split">
          <PButton variant="outline" :text="t('back')" @click="goBack" />
          <div class="eap-footer-actions">
            <PButton variant="secondary" :text="t('cancel')" @click="$emit('close')" />
            <PButton
              variant="primary"
              :text="t('add-to-selected-assignment')"
              :disabled="!selectedAssignmentId || !!savingAssignmentId"
              :loading="!!savingAssignmentId"
              @click="onConfirmAssignment"
            />
          </div>
        </div>
      </template>

      <template v-else-if="step === 'sequence-list'">
        <div class="eap-footer-split">
          <PButton variant="outline" :text="t('back')" @click="goBack" />
          <div class="eap-footer-actions">
            <PButton variant="secondary" :text="t('cancel')" @click="$emit('close')" />
            <PButton
              variant="primary"
              :text="t('add-to-sequence')"
              :disabled="!selectedSequenceId"
              @click="onConfirmSequence"
            />
          </div>
        </div>
      </template>

      <template v-else-if="step === 'assignment-success'">
        <div class="eap-footer-actions eap-footer-actions--end">
          <PButton variant="secondary" :text="t('continue-browsing')" @click="$emit('close')" />
          <PButton
            variant="primary"
            :text="t('go-to-assignment')"
            @click="$emit('go-to-assignment')"
          />
        </div>
      </template>

    </template>
  </PModal>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useStore } from 'vuex'
import { PModal, PButton, PInput, PBadge } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import ExploreAddPickerHeader from './explore-add-picker-header.vue'
import {
  getCachedContentName,
  nameCacheVersion,
  setCachedLegacyName,
  getContentMetadata,
} from '@/utils/content-cache.js'
import { effectiveAssignmentStatus } from '@/utils/assignment-status.js'

const props = defineProps({
  itemIds: { type: Array, default: () => [] },
  sequenceIds: { type: Array, default: () => [] },
  savingAssignmentId: { type: String, default: null },
  assignmentResult: { type: Object, default: null },
})

const emit = defineEmits([
  'close',
  'create-assignment',
  'create-sequence',
  'confirm-sequence',
  'confirm-assignment',
  'go-to-assignment',
])

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const TEACHER_ASSIGNMENT_TAG = 'teacher-created'
const TEACHER_ASSIGNMENT_TYPE = 'teacher-to-student'

const step = ref('choose')
const destination = ref(null)
const assignmentMode = ref(null)
const sequenceMode = ref(null)
const selectedAssignmentId = ref(null)
const selectedSequenceId = ref(null)
const assignmentSearch = ref('')
const sequenceSearch = ref('')

const assignmentData = reactive({})
const sequenceData = reactive({})
const assignmentsLoading = ref(false)
const sequencesLoading = ref(false)
const previewItem = ref(null)

const contentLabel = computed(() => {
  void nameCacheVersion.value
  const ids = props.itemIds
  if (!ids?.length) return ''
  if (ids.length === 1) {
    return getCachedContentName(ids[0], store.getters.language()) || t('untitled')
  }
  return `${ids.length} ${t('items-selected')}`
})

const headerTitle = computed(() => {
  if (step.value === 'choose') return t('add-to-assignment-or-sequence')
  if (step.value === 'assignment-choice') {
    return t('add-content-to-assignment')
  }
  if (step.value === 'sequence-choice') {
    return t('add-content-to-sequence')
  }
  if (step.value === 'assignment-list') {
    return t('add-to-existing-assignment-title')
  }
  if (step.value === 'sequence-list') {
    return t('add-to-existing-sequence-title')
  }
  return ''
})

const headerSubtitle = computed(() => {
  const quoted = contentLabel.value ? `“${contentLabel.value}”` : t('selected-content')
  if (step.value === 'choose') {
    return t('add-picker-subtitle')
  }
  if (step.value === 'assignment-choice') {
    return ''
  }
  if (step.value === 'sequence-choice') {
    return t('add-to-sequence-choice-subtitle').replace('{name}', quoted)
  }
  if (step.value === 'assignment-list') {
    return t('add-to-existing-assignment-subtitle').replace('{name}', quoted)
  }
  if (step.value === 'sequence-list') {
    return t('add-to-existing-sequence-subtitle').replace('{name}', quoted)
  }
  return ''
})

const teacherAssignmentIds = computed(() => {
  const ids = store.getters['pila_tags/withTag'](TEACHER_ASSIGNMENT_TAG) || []
  return ids.filter(id => !assignmentData[id]?.archived)
})

const filteredAssignmentIds = computed(() => {
  const q = assignmentSearch.value.trim().toLowerCase()
  return teacherAssignmentIds.value.filter(id => {
    if (!q) return true
    const d = assignmentData[id]
    const name = (d?.name || '').toLowerCase()
    const desc = (d?.description || '').toLowerCase()
    return name.includes(q) || desc.includes(q)
  })
})

const filteredSequenceIds = computed(() => {
  const q = sequenceSearch.value.trim().toLowerCase()
  return props.sequenceIds.filter(id => {
    if (!q) return true
    const d = sequenceData[id]
    const name = (d?.name || '').toLowerCase()
    const desc = (d?.description || '').toLowerCase()
    return name.includes(q) || desc.includes(q)
  })
})

function formatDate(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('en-CA')
  } catch {
    return ''
  }
}

function assignmentBadges(id) {
  const badges = []
  const data = assignmentData[id]
  if (data?.dueDate) {
    badges.push(`${t('due-date')} - ${formatDate(data.dueDate)}`)
  }
  const status = assignmentPickerStatus(id)
  if (status) badges.push(t(status.toLowerCase()))
  return badges
}

function assignmentPickerStatus(id) {
  const data = assignmentData[id]
  const groups = store.getters['assignments/assignedGroups'](id, TEACHER_ASSIGNMENT_TYPE, false)
  return effectiveAssignmentStatus(data, { hasAssignedGroups: groups.length > 0 })
}

function sequenceBadges(id) {
  const badges = []
  const data = sequenceData[id]
  if (data?.updated) {
    badges.push(`${t('last-modified')} - ${formatDate(data.updated)}`)
  }
  return badges
}

async function loadAssignmentEntry(id) {
  if (assignmentData[id]) return
  try {
    const state = await Agent.state(id)
    assignmentData[id] = {
      name: state.name || '',
      description: state.description || '',
      status: state.status || null,
      scheduledDate: state.scheduledDate || null,
      scheduledTime: state.scheduledTime || null,
      dueDate: state.dueDate || null,
      archived: !!state.archived,
    }
    if (state.name) setCachedLegacyName(id, state.name)
  } catch {
    assignmentData[id] = { name: '', description: '', archived: false }
  }
}

async function loadAssignments() {
  assignmentsLoading.value = true
  try {
    if (!store.getters['pila_tags/withTag'](TEACHER_ASSIGNMENT_TAG)?.length) {
      await store.dispatch('pila_tags/load')
    }
    const ids = store.getters['pila_tags/withTag'](TEACHER_ASSIGNMENT_TAG) || []
    await Promise.allSettled(ids.map(loadAssignmentEntry))
  } finally {
    assignmentsLoading.value = false
  }
}

async function loadSequenceEntry(id) {
  if (sequenceData[id]) return
  try {
    const [state, meta] = await Promise.all([
      Agent.state(id),
      getContentMetadata(id),
    ])
    sequenceData[id] = {
      name: state?.name || '',
      description: state?.description || '',
      updated: meta?.updated || null,
    }
    if (state?.name) setCachedLegacyName(id, state.name)
  } catch {
    sequenceData[id] = { name: '', description: '' }
  }
}

async function loadSequences() {
  sequencesLoading.value = true
  try {
    await Promise.allSettled(props.sequenceIds.map(loadSequenceEntry))
  } finally {
    sequencesLoading.value = false
  }
}

async function loadPreviewItem() {
  const id = props.itemIds?.[0]
  if (!id) {
    previewItem.value = null
    return
  }
  try {
    const [state, meta] = await Promise.all([
      Agent.state(id),
      getContentMetadata(id),
    ])
    const lang = store.getters.language()
    const name = getCachedContentName(id, lang) || state?.name || t('untitled')
    previewItem.value = {
      name,
      description: state?.description || '',
      modified: meta?.updated
        ? `${t('last-modified')} - ${formatDate(meta.updated)}`
        : '',
    }
  } catch {
    previewItem.value = {
      name: getCachedContentName(id, store.getters.language()) || t('untitled'),
      description: '',
      modified: '',
    }
  }
}

function onChooseNext() {
  if (destination.value === 'assignment') {
    step.value = 'assignment-choice'
  } else if (destination.value === 'sequence') {
    step.value = 'sequence-choice'
  }
}

function onAssignmentChoiceNext() {
  if (assignmentMode.value === 'new') {
    emit('create-assignment')
    return
  }
  if (assignmentMode.value === 'existing') {
    step.value = 'assignment-list'
    loadAssignments()
  }
}

function onSequenceChoiceNext() {
  if (sequenceMode.value === 'new') {
    emit('create-sequence')
    return
  }
  if (sequenceMode.value === 'existing') {
    step.value = 'sequence-list'
    loadSequences()
    loadPreviewItem()
  }
}

function onConfirmAssignment() {
  if (selectedAssignmentId.value) {
    emit('confirm-assignment', selectedAssignmentId.value)
  }
}

function onConfirmSequence() {
  if (selectedSequenceId.value) {
    emit('confirm-sequence', selectedSequenceId.value)
  }
}

function goBack() {
  if (step.value === 'assignment-choice') {
    step.value = 'choose'
    assignmentMode.value = null
  } else if (step.value === 'assignment-list') {
    step.value = 'assignment-choice'
    selectedAssignmentId.value = null
    assignmentSearch.value = ''
  } else if (step.value === 'sequence-choice') {
    step.value = 'choose'
    sequenceMode.value = null
  } else if (step.value === 'sequence-list') {
    step.value = 'sequence-choice'
    selectedSequenceId.value = null
    sequenceSearch.value = ''
  }
}

watch(
  () => props.assignmentResult,
  (result) => {
    if (result) step.value = 'assignment-success'
  },
)

watch(step, (s) => {
  if (s === 'assignment-list' && !Object.keys(assignmentData).length) loadAssignments()
  if (s === 'sequence-list' && !Object.keys(sequenceData).length) {
    loadSequences()
    loadPreviewItem()
  }
})

onMounted(() => {
  if (props.assignmentResult) step.value = 'assignment-success'
})
</script>

<style scoped>
.eap-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 24px;
}

.eap-section-label {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #334155;
}

.eap-choice-row {
  display: flex;
  gap: 17px;
  padding: 2px;
}

.eap-choice-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  transition: border-color 150ms, box-shadow 150ms;
}

.eap-choice-card:hover {
  border-color: #cbd5e1;
}

.eap-choice-card--selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px #2563eb;
}

.eap-choice-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 33px;
  height: 33px;
  border-radius: 8px;
}

.eap-choice-icon--assignment {
  background: #dbeafe;
  color: #2563eb;
}

.eap-choice-icon--sequence {
  background: #fef9c3;
  color: #ca8a04;
}

.eap-choice-label {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #334155;
  text-align: center;
}

.eap-choice-label--multiline {
  line-height: 1.2;
  white-space: pre-line;
}

.eap-preview-card {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
}

.eap-preview-title {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  color: #020617;
}

.eap-preview-desc {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 16px;
  color: #64748b;
}

.eap-preview-meta {
  margin: 5px 0 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  color: #64748b;
}

.eap-radio-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 280px;
  overflow-y: auto;
  padding: 2px 8px 2px 2px;
}

.eap-radio-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  padding: 8px 0 6px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  text-align: left;
  transition: border-color 150ms, box-shadow 150ms;
}

.eap-radio-card:hover {
  border-color: #cbd5e1;
}

.eap-radio-card--selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px #2563eb;
}

.eap-radio-row {
  display: flex;
  gap: 8px;
  padding: 8px 8px 0;
  align-items: flex-start;
}

.eap-radio-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #e2e8f0;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}

.eap-radio-circle--selected {
  border-color: #2563eb;
}

.eap-radio-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #2563eb;
}

.eap-radio-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.eap-radio-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  color: #020617;
}

.eap-radio-desc {
  font-size: 14px;
  line-height: 20px;
  color: #64748b;
}

.eap-radio-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 0 33px 6px;
}

.eap-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  font-size: 13px;
  color: #64748b;
}

.eap-empty {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
  padding: 12px;
}

.eap-footer-split {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.eap-footer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.eap-footer-actions--end {
  margin-left: auto;
}

.eap-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 24px;
  text-align: center;
}

.eap-success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  background: #dcfce7;
}

.eap-success-title {
  margin: 16px 0 0;
  font-size: 18px;
  font-weight: 600;
  color: #020617;
}

.eap-success-desc {
  margin: 8px 0 0;
  font-size: 14px;
  color: #64748b;
}
</style>