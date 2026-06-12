<template>
  <div v-if="loading" class="wizard-loading">
    <LucideIcon name="loader-2" :size="14" :spin="true" /> {{ t('loading') }}
  </div>
  <div v-else class="wizard">
    <!-- Header -->
    <div class="wizard-header">
      <div>
        <h2 class="wizard-title">{{ props.editing ? t('edit-assignment') : t('create-new-assignment') }}</h2>
        <p class="wizard-subtitle">{{ stepSubtitles[currentStep - 1] }}</p>
      </div>
      <PButton variant="icon" size="xsm" icon="lucide:x" iconOnly @click="$emit('close')" />
    </div>
    <div class="wizard-separator" />

    <!-- Stepper -->
    <div class="stepper">
      <div v-for="step in steps" :key="step.num" class="stepper-item">
        <div class="step-col">
          <div class="step-circle" :class="stepCircleClass(step.num)">
            <LucideIcon :name="step.icon" :size="13" />
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
        required
      />
      <PInput
        v-model="assignment.description"
        :label="props.editing ? t('learning-goals-and-description') : t('instructions')"
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
          required
        />
        <PInput
          v-model="dueDate"
          :label="t('due-date')"
          :placeholder="t('date-format-placeholder')"
          type="date"
        />
      </div>
      <PInput
        v-model="dueTime"
        :label="t('due-time')"
        :placeholder="t('time-format-placeholder')"
        type="time"
      />
    </div>

    <!-- ═══════════════ Step 2: Assignment content only (library opens in modal) ═══════════════ -->
    <div v-else-if="currentStep === 2" class="step-body step-body-wide">
      <div class="content-cta-centered" @click="openContentBrowser">
        <LucideIcon name="circle-plus" :size="28" class="content-cta-icon" />
        <span class="content-cta-title">{{ t('add-content-item-or-sequence') }}</span>
        <span class="content-cta-desc">{{ t('browse-and-select-content-from-library') || 'Browse and select content from the library' }}</span>
      </div>

      <div class="assignment-content-section">
        <div class="assignment-content-header">
          <span class="assignment-content-heading">
            {{ t('current-item-sequence') || 'Current item/sequence' }} ({{ contentList.length }})
          </span>
          <PButton
            v-if="contentList.length"
            variant="ghost"
            size="sm"
            icon="lucide:eye"
            :text="t('preview')"
            @click="previewing = contentList[0]"
          />
        </div>

        <p v-if="!contentList.length" class="assignment-content-empty">
          {{ t('no-items-added-yet') || 'No items added yet. Use the button above to add content from the library.' }}
        </p>

        <div v-else class="assignment-content-grid">
          <TaggedContentCard
            v-for="id in contentList"
            :key="id"
            :id="id"
            :checked="true"
            :removable="true"
            :grades="assignmentContentGrades(id)"
            @toggle-select="removeContent(id)"
            @remove="removeContent(id)"
            @preview="previewing = id"
          />
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
        <label class="field-label">{{ t('assign-to') }} ({{ t('optional') || 'Optional' }})</label>
        <p class="field-hint">{{ t('assign-to-groups-optional-hint') || 'You can assign classes now or add them later from the assignments page.' }}</p>
        <PInput
          v-model="groupSearch"
          :placeholder="t('search-groups')"
          icon="lucide:search"
        />
        <div class="group-list">
          <div
            v-for="gid in filteredGroups"
            :key="gid"
            class="group-card"
            :class="{ 'group-card-selected': isGroupSelected(gid) }"
            @click="toggleGroup(gid)"
          >
            <div class="group-icon" :class="isGroupSelected(gid) ? 'group-icon-green' : 'group-icon-blue'">
              <LucideIcon name="users" :size="16" />
            </div>
            <div class="group-info">
              <span class="group-name">
                <vueScopeComponent :id="gid" :path="['name']" />
              </span>
              <span class="group-count">{{ t('students') }}</span>
            </div>
            <div class="group-check">
              <LucideIcon v-if="isGroupSelected(gid)" name="check" :size="14" />
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
          class="distribution-option"
        >
          <div
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
          <div
            v-if="opt.value === 'schedule' && distributionOption === 'schedule'"
            class="schedule-fields"
          >
            <div class="field-row">
              <PInput
                v-model="scheduledDate"
                :label="t('publication-date')"
                type="date"
                :placeholder="t('date-format-placeholder')"
              />
              <PInput
                v-model="scheduledTime"
                :label="t('publication-time')"
                type="time"
                :placeholder="t('time-format-placeholder')"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="wizard-footer">
      <PButton
        variant="secondary"
        color="danger"
        :text="t('cancel')"
        @click="$emit('close')"
      />
      <PButton
        v-if="currentStep > 1"
        variant="ghost"
        :text="t('back')"
        @click="currentStep--"
      />
      <div class="flex-1" />
      <PTooltip
        v-if="!props.editing"
        :text="!canSaveDraft ? draftBlockedReason : ''"
        position="top"
      >
        <PButton
          variant="secondary"
          :text="t('save-as-draft') || 'Save as draft'"
          :loading="savingDraft"
          :disabled="!canSaveDraft"
          @click="saveDraft"
        />
      </PTooltip>
      <PTooltip
        v-if="currentStep < 4"
        :text="!canProceed ? stepBlockedReason : ''"
        position="top"
      >
        <PButton
          variant="primary"
          :text="t('next')"
          icon="lucide:arrow-right"
          :icon-right="true"
          :disabled="!canProceed"
          @click="goNext"
        />
      </PTooltip>
      <PTooltip
        v-else
        :text="!canSave ? saveBlockedReason : ''"
        position="top"
      >
        <PButton
          variant="primary"
          :text="props.editing ? (t('save-changes') || 'Save changes') : t('create-assignment')"
          icon="lucide:arrow-right"
          :icon-right="true"
          :disabled="!canSave"
          @click="saveAndClose"
        />
      </PTooltip>
    </div>
  </div>

  <!-- ═══════════════ Content Browser Modal (overlay on top) ═══════════════ -->
  <Teleport to="body">
    <div v-if="selectingContent" class="cb-overlay">
      <div class="cb-backdrop" @click="selectingContent = false" />
      <div class="cb-modal">
        <!-- Header -->
        <div class="cb-modal-header">
          <h2 class="cb-modal-title">{{ t('add-content-item-or-sequence') }}</h2>
          <PButton variant="icon" size="xsm" icon="lucide:x" iconOnly @click="selectingContent = false" />
        </div>

        <!-- Explore content library header -->
        <div class="cb-header">
          <div>
            <h3 class="cb-section-title">
              <LucideIcon name="clipboard-list" :size="16" class="cb-section-icon" />
              {{ t('explore-content-library') }}
            </h3>
            <p class="cb-section-desc">{{ t('discover-customise-and-add-content') }}</p>
          </div>
          <PButton
            v-if="cbSelectedItems.size"
            variant="primary"
            icon="lucide:plus"
            :disabled="pickerNewSelectionCount === 0"
            :text="addSelectedButtonLabel"
            @click="addSelectedContent"
          />
        </div>

        <!-- Shared content browser (same as explore page) -->
        <div class="cb-grid-area">
          <ContentBrowser
            :columns="3"
            :per-page="12"
            use-disk-cache
          >
            <template #card="{ id, source, grades }">
              <TaggedContentCard
                :id="id"
                :checked="isInAssignmentContent(id) || cbSelectedItems.has(id)"
                :in-assignment="isInAssignmentContent(id)"
                :source="source"
                :grades="grades"
                @toggle-select="toggleModalContent(id)"
                @preview="previewing = id"
                @add="onPickerAdd(id)"
              />
            </template>
          </ContentBrowser>
        </div>
      </div>
    </div>
  </Teleport>

  <PreviewModal
    v-if="previewing"
    :id="previewing"
    @close="previewing = null"
  />
</template>

<script setup>
  import { ref, reactive, computed, watch } from 'vue'
  import { useStore } from 'vuex'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import TaggedContentCard from '@/components/tags/tagged-content-card.vue'
  import ContentBrowser from '@/components/content/content-browser.vue'
  import PreviewModal from '@/components/common/preview-modal.vue'
  import { useContentLibrary } from '@/utils/useContentLibrary.js'
  import { normalizeAssignmentContent } from '@/utils/assignment-content.js'
  import { useToast } from '@/utils/useToast.js'
  import { PButton, PInput, PSelect, PTooltip } from '@/components/ui/index.js'
  import LucideIcon from '@/components/ui/LucideIcon.vue'

  const props = defineProps({
    id: String,
    editing: Boolean,
    initialContentIds: {
      type: Array,
      default: () => [],
    },
  })

  const emit = defineEmits(['close', 'saved', 'update:width'])

  const store = useStore()
  function t(slug) { return store.getters.t(slug) }
  const { info: toastInfo, error: toastError } = useToast()
  const savingDraft = ref(false)

  // ── Wizard state ──
  const loading = ref(true)
  const currentStep = ref(1)
  const assignment = ref({ name: '', description: '', content: [] })
  const selectingContent = ref(false)
  const previewing = ref(null)
  const { getItemTagLabels } = useContentLibrary(store)

  // ── Step definitions ──
  const steps = [
    { num: 1, icon: 'file-text' },
    { num: 2, icon: 'upload' },
    { num: 3, icon: 'file-text' },
    { num: 4, icon: 'graduation-cap' },
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
  const assignmentTypeOptions = computed(() => [t('assessment'), t('practice'), t('homework'), t('learning')])

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
  const DEFAULT_PUBLICATION_TIME = '08:00'

  const groupSearch = ref('')
  const distributionOption = ref('publish')
  const scheduledDate = ref('')
  const scheduledTime = ref('')

  watch(distributionOption, (value) => {
    if (value === 'schedule' && !scheduledTime.value) {
      scheduledTime.value = DEFAULT_PUBLICATION_TIME
    }
  })

  const groups = computed(() => store.getters['groups/groups']('class', true))

  // ── Step 4: pending group assignments (applied on Save only) ──
  const pendingGroupIds = ref(new Set())

  const filteredGroups = computed(() => {
    let ids = groups.value
    if (groupSearch.value) {
      const q = groupSearch.value.toLowerCase()
      ids = ids.filter(gid => {
        const group = store.state.groups.groups[gid]
        return group?.name?.toLowerCase().includes(q)
      })
    }
    const selected = pendingGroupIds.value
    return [...ids].sort((a, b) => {
      const aSelected = selected.has(a) ? 0 : 1
      const bSelected = selected.has(b) ? 0 : 1
      if (aSelected !== bSelected) return aSelected - bSelected
      return ids.indexOf(a) - ids.indexOf(b)
    })
  })

  const distributionOptions = computed(() => [
    { value: 'publish', label: t('publish-immediately'), description: t('students-can-start-right-away') },
    { value: 'schedule', label: t('schedule-for-later'), description: t('set-publication-date') },
    { value: 'draft', label: t('save-as-draft'), description: t('keep-working-before-publishing') },
  ])

  function assignmentsForItem() {
    return store.getters['assignments/assignments'](props.id, 'teacher-to-student')
  }

  function assignmentForGroup(group_id) {
    const assignments = assignmentsForItem()
    return assignments.find(id => store.getters['assignments/get'](id).group_id === group_id)
  }

  function isGroupSelected(group_id) {
    return pendingGroupIds.value.has(group_id)
  }

  function toggleGroup(group_id) {
    const next = new Set(pendingGroupIds.value)
    if (next.has(group_id)) next.delete(group_id)
    else next.add(group_id)
    pendingGroupIds.value = next
  }

  function seedPendingGroupsFromStore() {
    const assigned = store.getters['assignments/assignedGroups'](
      props.id,
      'teacher-to-student',
      false
    )
    pendingGroupIds.value = new Set(assigned)
  }

  async function applyPendingGroupAssignments() {
    const itemId = props.id
    const assignmentType = 'teacher-to-student'
    const currentlyAssigned = new Set(
      store.getters['assignments/assignedGroups'](itemId, assignmentType, false)
    )
    const pending = pendingGroupIds.value

    for (const groupId of currentlyAssigned) {
      if (!pending.has(groupId)) {
        const assignmentId = assignmentForGroup(groupId)
        if (assignmentId) await store.dispatch('assignments/unassign', assignmentId)
      }
    }
    for (const groupId of pending) {
      if (!currentlyAssigned.has(groupId)) {
        await store.dispatch('assignments/assign', {
          group_id: groupId,
          item_id: itemId,
          assignment_type: assignmentType,
        })
      }
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
    cbSelectedItems.clear()
    selectingContent.value = true
  }

  function assignmentContentGrades(id) {
    return getItemTagLabels(id)
  }

  function onContentSelect(id) {
    if (!id || assignmentContentIdSet.value.has(id)) return false
    if (!Array.isArray(assignment.value.content)) {
      assignment.value.content = assignment.value.content ? [assignment.value.content] : []
    }
    assignment.value.content.push(id)
    return true
  }

  function removeContent(id) {
    if (Array.isArray(assignment.value.content)) {
      assignment.value.content = assignment.value.content.filter(c => c !== id)
    } else if (assignment.value.content === id) {
      assignment.value.content = []
    }
  }

  const contentList = computed(() => {
    if (!assignment.value.content) return []
    const raw = Array.isArray(assignment.value.content)
      ? assignment.value.content
      : [assignment.value.content]
    return [...new Set(normalizeAssignmentContent(raw))]
  })

  /** O(1) membership — recomputed only when contentList changes. */
  const assignmentContentIdSet = computed(() => new Set(contentList.value))

  function isInAssignmentContent(id) {
    return assignmentContentIdSet.value.has(id)
  }

  const step1Valid = computed(() =>
    (assignment.value.name || '').trim() !== '' && !!assignmentType.value?.trim()
  )

  const step2Valid = computed(() => contentList.value.length > 0)

  const step4SaveValid = computed(() => {
    if (distributionOption.value === 'schedule') {
      return !!scheduledDate.value
    }
    return true
  })

  const canProceed = computed(() => {
    if (currentStep.value === 1) return step1Valid.value
    if (currentStep.value === 2) return step2Valid.value
    return true
  })

  const canSave = computed(() =>
    step1Valid.value && step2Valid.value && step4SaveValid.value
  )

  const stepBlockedReason = computed(() => {
    if (currentStep.value === 1) {
      const missing = []
      if (!(assignment.value.name || '').trim()) missing.push(t('assignment-title'))
      if (!assignmentType.value?.trim()) missing.push(t('assignment-type'))
      if (missing.length === 2) {
        return t('fill-required-fields-to-continue')
          || 'Fill in all required fields to continue.'
      }
      if (missing.length) {
        return `${t('required') || 'Required'}: ${missing.join(', ')}`
      }
    }
    if (currentStep.value === 2 && !step2Valid.value) {
      return t('add-at-least-one-content-item-to-continue')
        || 'Add at least one content item to continue.'
    }
    return ''
  })

  const saveBlockedReason = computed(() => {
    if (distributionOption.value === 'schedule' && !scheduledDate.value) {
      return t('set-publication-date-to-save')
    }
    if (!step1Valid.value || !step2Valid.value) {
      return t('complete-required-steps-before-saving')
        || 'Complete all required steps before saving.'
    }
    return ''
  })

  const canSaveDraft = computed(() => (assignment.value.name || '').trim() !== '')

  const draftBlockedReason = computed(() => {
    if (!canSaveDraft.value) {
      return t('assignment-title-required-for-draft')
        || 'Enter an assignment title to save a draft.'
    }
    return ''
  })

  function goNext() {
    if (!canProceed.value) return
    currentStep.value++
  }

  // ── Content browser (overlay modal selection) ──
  const cbSelectedItems = reactive(new Set())

  const pickerNewSelectionCount = computed(() => {
    let count = 0
    for (const id of cbSelectedItems) {
      if (!assignmentContentIdSet.value.has(id)) count++
    }
    return count
  })

  const addSelectedButtonLabel = computed(() => {
    const nameSuffix = assignment.value.name
      ? ` ${t('to')} "${assignment.value.name}"`
      : ''
    const newCount = pickerNewSelectionCount.value
    const total = cbSelectedItems.size
    if (newCount > 0 && newCount < total) {
      return `${t('add-selected')} (${newCount} ${t('new') || 'new'})${nameSuffix}`
    }
    if (newCount > 0) {
      return `${t('add-selected')} (${newCount})${nameSuffix}`
    }
    return `${t('add-selected')} (${total})${nameSuffix}`
  })

  function toggleModalContent(id) {
    const inAssignment = isInAssignmentContent(id)
    const inPickerSelection = cbSelectedItems.has(id)

    if (inAssignment || inPickerSelection) {
      if (inAssignment) removeContent(id)
      if (inPickerSelection) cbSelectedItems.delete(id)
      return
    }

    cbSelectedItems.add(id)
  }

  function onPickerAdd(id) {
    if (isInAssignmentContent(id)) {
      toastInfo(t('already-in-assignment') || 'This item is already in the assignment')
      return
    }
    if (onContentSelect(id)) {
      cbSelectedItems.delete(id)
      selectingContent.value = false
    }
  }

  function addSelectedContent() {
    const newIds = [...cbSelectedItems].filter(id => !assignmentContentIdSet.value.has(id))
    const skipped = cbSelectedItems.size - newIds.length
    let added = 0
    for (const id of newIds) {
      if (onContentSelect(id)) added++
    }
    cbSelectedItems.clear()
    if (added > 0) {
      selectingContent.value = false
      if (skipped > 0) {
        toastInfo(
          `${added} ${t('items-added') || 'added'}. ${skipped} ${t('already-in-assignment') || 'already in assignment'}.`,
        )
      }
    } else if (skipped > 0) {
      toastInfo(t('all-selected-already-in-assignment') || 'All selected items are already in this assignment')
    }
  }

  // ── Save all settings to backend ──
  async function saveSettings({ asDraft = false } = {}) {
    const state = await Agent.state(props.id)
    state.name = assignment.value.name || ''
    state.description = assignment.value.description || ''
    state.content = [...contentList.value]
    state.assignmentType = assignmentType.value || 'Assignment'
    state.dueDate = dueDate.value || null
    state.dueTime = dueTime.value || null
    state.allowLate = allowLate.value
    state.maxAttempts = maxAttempts.value || '1 attempt'
    state.feedbackTiming = feedbackTiming.value || 'At the end'
    state.shuffleQuestions = shuffleQuestions.value
    state.showAnswers = showAnswers.value
    state.teacherNotes = teacherNotes.value || ''
    if (asDraft) {
      state.status = 'Draft'
      distributionOption.value = 'draft'
    } else {
      state.status = distributionOption.value === 'publish' ? 'Published'
        : distributionOption.value === 'schedule' ? 'Scheduled'
        : 'Draft'
    }
    if (distributionOption.value === 'schedule' && !asDraft) {
      state.scheduledDate = scheduledDate.value || null
      state.scheduledTime = scheduledTime.value || DEFAULT_PUBLICATION_TIME
    }
  }

  async function saveDraft() {
    if (!canSaveDraft.value || savingDraft.value) return
    savingDraft.value = true
    try {
      await saveSettings({ asDraft: true })
      await applyPendingGroupAssignments()
      await Agent.synced()
      emit('saved', { asDraft: true })
      emit('close')
    } catch (e) {
      console.error('[TeacherToStudent] save draft error:', e)
      toastError(t('something-went-wrong') || 'Something went wrong. Please try again.')
    } finally {
      savingDraft.value = false
    }
  }

  async function saveAndClose() {
    if (!canSave.value) return
    await saveSettings()
    await applyPendingGroupAssignments()
    await Agent.synced()
    emit('saved', { asDraft: distributionOption.value === 'draft' })
    emit('close')
  }

  // ── Load assignment data ──
  async function init() {
    loading.value = true

    if (props.editing) {
      // Editing existing assignment — load from backend
      const state = await Agent.state(props.id)
      assignment.value = {
        ...state,
        content: normalizeAssignmentContent(state.content),
      }

      // Load persisted settings
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
      if (state.scheduledDate) scheduledDate.value = state.scheduledDate
      if (state.scheduledTime) {
        scheduledTime.value = state.scheduledTime
      } else if (state.status === 'Scheduled') {
        scheduledTime.value = DEFAULT_PUBLICATION_TIME
      }
      seedPendingGroupsFromStore()
    } else {
      const seedContent = props.initialContentIds?.length
        ? [...props.initialContentIds]
        : []
      assignment.value = { name: '', description: '', content: seedContent }
      pendingGroupIds.value = new Set()
    }

    loading.value = false
  }

  init()
</script>

<style scoped>
.wizard {
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

.field-hint {
  font-size: 13px;
  color: #64748b;
  margin: -4px 0 10px;
}

/* ── Step 2: Wide body ── */
.step-body-wide {
  gap: 12px;
}

/* ── Step 2: Centered CTA ── */
.content-cta-centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  border: 1px dashed #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms;
}
.content-cta-centered:hover {
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
}

.content-cta-desc {
  font-size: 12px;
  color: #64748b;
  text-align: center;
  max-width: 280px;
}

.assignment-content-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.assignment-content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.assignment-content-heading {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.assignment-content-empty {
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  padding: 16px 12px;
  border: 1px dashed #e2e8f0;
  border-radius: 8px;
}

.assignment-content-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

/* ── Step 3: Toggle switches ── */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  max-width: 560px;
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

.distribution-option {
  display: flex;
  flex-direction: column;
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

.schedule-fields {
  margin: 4px 0 8px;
  padding-left: 32px;
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

/* ── Content browser overlay modal ── */
.cb-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cb-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.cb-modal {
  position: relative;
  z-index: 61;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 984px;
  max-width: 92vw;
  height: 85vh;
  padding: 24px;
  overflow: hidden;
}

.cb-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.cb-modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.cb-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 0 12px;
  flex-shrink: 0;
}

.cb-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cb-section-icon {
  color: var(--color-primary-600, #4f46e5);
}

.cb-section-desc {
  font-size: 12px;
  color: #64748b;
  margin: 4px 0 0;
}

.cb-grid-area {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
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

  .cb-overlay {
    align-items: flex-end;
  }

  .cb-modal {
    width: 100%;
    max-width: 100vw;
    height: 92vh;
    border-radius: 16px 16px 0 0;
    padding: 16px;
  }

  .cb-modal-title {
    font-size: 16px;
  }

  .content-cta-centered {
    padding: 16px;
  }

}
</style>
