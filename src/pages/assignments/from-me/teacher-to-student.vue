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
      <button class="wizard-close" @click="$emit('close')">
        <LucideIcon name="x" :size="12" />
      </button>
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

    <!-- ═══════════════ Step 2: Add Content ═══════════════ -->
    <div v-else-if="currentStep === 2" class="step-body step-body-wide">
      <!-- Centered CTA -->
      <div class="content-cta-centered" @click="openContentBrowser">
        <LucideIcon name="circle-plus" :size="28" class="content-cta-icon" />
        <span class="content-cta-title">{{ t('add-content-item-or-sequence') }}</span>
      </div>

      <!-- Search + Show tabs -->
      <div class="cb-toolbar">
        <PInput
          v-model="cbSearch"
          :placeholder="t('search-content-title')"
          icon="lucide:search"
          class="cb-search"
        />
        <div class="cb-show-tabs">
          <span class="cb-show-label">{{ t('show') }}:</span>
          <button class="cb-tab" :class="{ 'cb-tab-active': cbShowTab === 'all' }" @click="cbShowTab = 'all'">{{ t('all-content') }}</button>
          <button class="cb-tab" :class="{ 'cb-tab-active': cbShowTab === 'expert' }" @click="cbShowTab = 'expert'">{{ t('pila-content') }}</button>
          <button class="cb-tab" :class="{ 'cb-tab-active': cbShowTab === 'mine' }" @click="cbShowTab = 'mine'">{{ t('my-content') }}</button>
        </div>
      </div>

      <!-- Content table -->
      <div class="ct-wrapper">
        <div v-if="cbLoading" class="cb-loading">
          <LucideIcon name="loader-2" :size="14" :spin="true" /> {{ t('loading') }}...
        </div>
        <table v-else-if="cbFilteredList.length" class="ct-table">
          <thead>
            <tr>
              <th class="ct-th ct-th-check"><input type="checkbox" class="ct-checkbox" :checked="ctAllSelected" @change="ctToggleAll" /></th>
              <th class="ct-th ct-th-title">{{ t('title-and-details') }} <LucideIcon name="arrow-up-down" :size="10" /></th>
              <th class="ct-th">{{ t('last-modified') }} <LucideIcon name="arrow-up-down" :size="10" /></th>
              <th class="ct-th">{{ t('content-type') }}</th>
              <th class="ct-th">{{ t('grade') }}</th>
              <th class="ct-th">{{ t('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="id in cbFilteredList" :key="id" class="ct-tr" :class="{ 'ct-tr-selected': contentList.includes(id) }">
              <td class="ct-td"><input type="checkbox" class="ct-checkbox" :checked="contentList.includes(id)" @change="ctToggleRow(id)" /></td>
              <td class="ct-td ct-td-title">
                <div class="ct-title-text">
                  <NameOrTranslatedNameFromItemId :itemId="id" />
                  <span class="ct-source-dot">.</span>
                  <span class="ct-source-badge" :class="cbMyContent.includes(id) ? 'ct-source-mine' : 'ct-source-expert'">
                    {{ cbMyContent.includes(id) ? t('my-content') : t('expert') }}
                  </span>
                </div>
                <div class="ct-title-desc">{{ cbGetItemDescription(id) }}</div>
              </td>
              <td class="ct-td ct-td-date">{{ cbGetLastModified(id) }}</td>
              <td class="ct-td">
                <span :class="cbIsSequence(id) ? 'ct-type-sequence' : 'ct-type-item'">
                  {{ cbIsSequence(id) ? t('sequence') : t('item') }}
                </span>
              </td>
              <td class="ct-td"><span v-if="cbGetGrade(id)" class="ct-grade">{{ cbGetGrade(id) }}</span></td>
              <td class="ct-td ct-td-actions">
                <button class="ct-action-btn" @click.stop="previewing = id"><LucideIcon name="ellipsis-vertical" :size="14" /></button>
                <span class="ct-drag"><LucideIcon name="grip-vertical" :size="14" /></span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="cb-empty">{{ t('no-content-found') }}</div>
      </div>

      <!-- Selected count -->
      <div v-if="cbFilteredList.length" class="ct-selected-info">
        {{ contentList.length }} {{ t('of') }} {{ cbFilteredList.length }} {{ t('rows-selected') }}.
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
          icon="lucide:search"
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
              <LucideIcon name="users" :size="16" />
            </div>
            <div class="group-info">
              <span class="group-name">
                <vueScopeComponent :id="gid" :path="['name']" />
              </span>
              <span class="group-count">{{ t('students') }}</span>
            </div>
            <div class="group-check">
              <LucideIcon v-if="assignmentForGroup(gid)" name="check" :size="14" />
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
        <div v-if="distributionOption === 'schedule'" class="schedule-fields">
          <div class="field-row">
            <PInput
              v-model="scheduledTime"
              :label="t('due-time')"
              type="time"
              :placeholder="t('time-format-placeholder')"
            />
            <PInput
              v-model="scheduledDate"
              :label="t('due-date')"
              type="date"
              :placeholder="t('date-format-placeholder')"
            />
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
        icon="lucide:arrow-right"
        :icon-right="true"
        @click="currentStep++"
      />
      <PButton
        v-else
        variant="primary"
        :text="t('create-assignment')"
        icon="lucide:arrow-right"
        :icon-right="true"
        @click="saveAndClose"
      />
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
          <button class="cb-close" @click="selectingContent = false">
            <LucideIcon name="x" :size="12" />
          </button>
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
            :text="t('add-selected') + ' (' + cbSelectedItems.size + ')' + (assignment.name ? ' ' + t('to') + ' &quot;' + assignment.name + '&quot;' : '')"
            @click="addSelectedContent"
          />
        </div>

        <!-- Search + Show tabs -->
        <div class="cb-toolbar">
          <PInput
            v-model="cbSearch"
            :placeholder="t('search-content-title')"
            icon="lucide:search"
            class="cb-search"
          />
          <div class="cb-show-tabs">
            <span class="cb-show-label">{{ t('show') }}:</span>
            <button
              class="cb-tab"
              :class="{ 'cb-tab-active': cbShowTab === 'all' }"
              @click="cbShowTab = 'all'"
            >{{ t('all-content') }}</button>
            <button
              class="cb-tab"
              :class="{ 'cb-tab-active': cbShowTab === 'expert' }"
              @click="cbShowTab = 'expert'"
            >{{ t('pila-content') }}</button>
            <button
              class="cb-tab"
              :class="{ 'cb-tab-active': cbShowTab === 'mine' }"
              @click="cbShowTab = 'mine'"
            >{{ t('my-content') }}</button>
          </div>
        </div>

        <!-- Content grid -->
        <div class="cb-grid-area">
          <div v-if="cbLoading" class="cb-loading">
            <LucideIcon name="loader-2" :size="14" :spin="true" /> {{ t('loading') }}...
          </div>
          <div v-else-if="!cbFilteredList.length" class="cb-empty">
            {{ t('no-content-found') }}
          </div>
          <div v-else class="cb-grid">
            <TaggedContentCard
              v-for="id in cbFilteredList"
              :key="id"
              :id="id"
              :checked="cbSelectedItems.has(id)"
              :source="cbMyContent.includes(id) ? 'mine' : 'pila'"
              :grades="cbGetItemGrades(id)"
              @toggle-select="cbToggleSelection(id)"
              @preview="previewing = id"
              @add="cbToggleSelection(id)"
              @click="cbToggleSelection(id)"
            />
          </div>
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
  import { ref, reactive, computed, watch, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import TaggedContentCard from '@/components/tags/tagged-content-card.vue'
  import PreviewModal from '@/components/common/preview-modal.vue'
  import NameOrTranslatedNameFromItemId from '@/components/content/name-or-translated-name-from-item-id.vue'
  import { PButton, PInput, PSelect } from '@/components/ui/index.js'
  import LucideIcon from '@/components/ui/LucideIcon.vue'
  import { MY_CONTENT_TAG } from '@/utils/constants.js'
  import {
    nameCache, metadataCache, tagCache, tagNameCache,
    loadTagHierarchy, prefetchBatch,
  } from '@/utils/content-cache.js'

  const props = defineProps({
    id: String,
    editing: Boolean,
  })

  const emit = defineEmits(['close', 'saved', 'update:width'])

  const store = useStore()
  function t(slug) { return store.getters.t(slug) }

  // ── Wizard state ──
  const loading = ref(true)
  const currentStep = ref(1)
  const assignment = ref({ name: '', description: '', content: [] })
  const selectingContent = ref(false)
  const previewing = ref(null)

  // ── Auto-load content data on Step 2 ──
  watch(currentStep, (step) => {
    if (step === 2) loadContentBrowser()
  })

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
  const groupSearch = ref('')
  const distributionOption = ref('publish')
  const scheduledDate = ref('')
  const scheduledTime = ref('')

  const groups = computed(() => store.getters['groups/groups']('class', true))

  const filteredGroups = computed(() => {
    if (!groupSearch.value) return groups.value
    const q = groupSearch.value.toLowerCase()
    return groups.value.filter(gid => {
      const group = store.state.groups.groups[gid]
      return group?.name?.toLowerCase().includes(q)
    })
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
    loadContentBrowser()
  }

  function onContentSelect(id) {
    if (!Array.isArray(assignment.value.content)) {
      assignment.value.content = assignment.value.content ? [assignment.value.content] : []
    }
    if (!assignment.value.content.includes(id)) {
      assignment.value.content.push(id)
    }
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
    if (Array.isArray(assignment.value.content)) return assignment.value.content
    return [assignment.value.content]
  })

  // ── Content browser (inline picker) ──
  const cbLoading = ref(false)
  const cbSearch = ref('')
  const cbShowTab = ref('all')
  const cbTaggedContent = ref([])
  const cbMyContent = reactive([])
  const cbSelectedItems = reactive(new Set())
  const cbDataLoaded = ref(false)

  const cbFilteredList = computed(() => {
    let list = cbTaggedContent.value.map(t => t.target)
    if (cbShowTab.value === 'mine') list = [...cbMyContent]
    else if (cbShowTab.value === 'expert') list = list.filter(id => !cbMyContent.includes(id))
    else list = [...new Set([...list, ...cbMyContent])]

    if (cbSearch.value) {
      const q = cbSearch.value.toLowerCase()
      list = list.filter(id => {
        const name = nameCache.get(id)
        return name ? name.toLowerCase().includes(q) : true
      })
    }
    return list
  })

  function cbGetItemGrades(id) {
    const tags = tagCache.get(id) || {}
    const labels = []
    for (const leafIds of Object.values(tags)) {
      for (const leafId of leafIds) {
        const name = tagNameCache.get(leafId)
        if (name) labels.push(name)
      }
    }
    return labels.slice(0, 4)
  }

  function cbToggleSelection(id) {
    if (cbSelectedItems.has(id)) cbSelectedItems.delete(id)
    else cbSelectedItems.add(id)
  }

  function addSelectedContent() {
    for (const id of cbSelectedItems) {
      onContentSelect(id)
    }
    cbSelectedItems.clear()
    selectingContent.value = false
  }

  // ── Content table helpers ──
  const ctAllSelected = computed(() => {
    if (!cbFilteredList.value.length) return false
    return cbFilteredList.value.every(id => contentList.value.includes(id))
  })

  function ctToggleRow(id) {
    if (contentList.value.includes(id)) {
      removeContent(id)
    } else {
      onContentSelect(id)
    }
  }

  function ctToggleAll() {
    if (ctAllSelected.value) {
      assignment.value.content = []
    } else {
      assignment.value.content = [...cbFilteredList.value]
    }
  }

  function cbIsSequence(id) {
    const meta = metadataCache.get(id)
    return meta?.active_type === 'application/json;type=sequence'
  }

  function cbGetItemDescription(id) {
    // Description not always cached — return empty if not available
    return ''
  }

  function cbGetLastModified(id) {
    const meta = metadataCache.get(id)
    if (meta?.updated) {
      return new Date(meta.updated).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }
    return '--'
  }

  function cbGetGrade(id) {
    const tags = tagCache.get(id) || {}
    for (const leafIds of Object.values(tags)) {
      for (const leafId of leafIds) {
        const name = tagNameCache.get(leafId)
        if (name && name.toLowerCase().includes('grade')) return name
      }
    }
    return null
  }

  async function loadContentBrowser() {
    if (cbDataLoaded.value) return
    cbLoading.value = true
    try {
      const partition = store.getters.tagPartition
      const tag = '1a53db50-e248-11ee-ab5f-07f4a7408770'
      const competencyTag = 'f760dad0-f133-11ee-804e-27f76a81958c'

      const hierarchy = await loadTagHierarchy(partition, competencyTag)
      const result = await Agent.query('taggings-for-tag', [partition, tag], 'tags.knowlearning.systems')
      cbTaggedContent.value = result

      // Load my content
      const env = await Agent.environment()
      const myContentResult = await Agent.query(
        'taggings-for-tag', [env.auth.user, MY_CONTENT_TAG], 'tags.knowlearning.systems'
      ).catch(() => [])
      myContentResult.forEach(t => { if (!cbMyContent.includes(t.target)) cbMyContent.push(t.target) })

      const allIds = [...new Set([...result.map(t => t.target), ...cbMyContent])]
      await prefetchBatch(allIds, store.getters.language(), partition, hierarchy.leafToCategory)

      cbDataLoaded.value = true
    } catch (e) {
      console.error('[content-browser] load error:', e)
    }
    cbLoading.value = false
  }

  // ── Save all settings to backend ──
  async function saveSettings() {
    const state = await Agent.state(props.id)
    state.name = assignment.value.name || ''
    state.description = assignment.value.description || ''
    state.content = assignment.value.content || []
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
    if (distributionOption.value === 'schedule') {
      state.scheduledDate = scheduledDate.value || null
      state.scheduledTime = scheduledTime.value || null
    }
  }

  async function saveAndClose() {
    await saveSettings()
    await Agent.synced()
    emit('saved')
    emit('close')
  }

  // ── Load assignment data ──
  async function init() {
    loading.value = true

    if (props.editing) {
      // Editing existing assignment — load from backend
      const state = await Agent.state(props.id)
      // Normalize content to array (backward compat with single-value)
      if (state.content && !Array.isArray(state.content)) {
        state.content = [state.content]
      } else if (!state.content) {
        state.content = []
      }
      assignment.value = state

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
      if (state.scheduledTime) scheduledTime.value = state.scheduledTime
    } else {
      // Creating new assignment — use local-only state (no backend call)
      assignment.value = { name: '', description: '', content: [] }
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

/* ── Step 2: Content table ── */
.ct-wrapper {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  min-height: 0;
}

.ct-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.ct-th {
  text-align: left;
  padding: 10px 14px;
  font-weight: 600;
  font-size: 12px;
  color: #64748b;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
  user-select: none;
}

.ct-th :deep(svg) {
  vertical-align: middle;
  display: inline;
  margin-left: 4px;
  cursor: pointer;
}

.ct-th-check {
  width: 40px;
  text-align: center;
}

.ct-th-title {
  min-width: 240px;
}

.ct-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  cursor: pointer;
  accent-color: #2563eb;
}

.ct-tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background 150ms;
}

.ct-tr:hover {
  background: #f8fafc;
}

.ct-tr-selected {
  background: #eff6ff;
}

.ct-td {
  padding: 12px 14px;
  color: #334155;
  vertical-align: middle;
}

.ct-td:first-child {
  text-align: center;
}

.ct-td-title {
  max-width: 300px;
}

.ct-title-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: #0f172a;
}

.ct-title-desc {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}

.ct-source-dot {
  color: #94a3b8;
  font-weight: 700;
}

.ct-source-badge {
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.ct-source-expert {
  color: #d97706;
}

.ct-source-mine {
  color: #2563eb;
}

.ct-td-date {
  white-space: nowrap;
  color: #64748b;
  font-size: 13px;
}

/* Content type badges */
.ct-type-sequence {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: #fff7ed;
  color: #ea580c;
  border: 1px solid #fed7aa;
}

.ct-type-item {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

/* Grade badge */
.ct-grade {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: #f8fafc;
  color: #334155;
  border: 1px solid #e2e8f0;
}

/* Actions column */
.ct-td-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ct-action-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.ct-action-btn:hover {
  color: #334155;
  background: #f1f5f9;
}

.ct-drag {
  color: #cbd5e1;
  cursor: grab;
  display: flex;
  align-items: center;
}

/* Selected info */
.ct-selected-info {
  font-size: 13px;
  color: #64748b;
  padding: 4px 0;
  flex-shrink: 0;
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
  margin-top: 12px;
  padding-left: 28px;
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

.cb-close {
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
.cb-close:hover {
  background: #e2e8f0;
  color: #334155;
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

.cb-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 16px;
}

.cb-search {
  max-width: 320px;
  flex: 1;
}

.cb-show-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cb-show-label {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  margin-right: 4px;
}

.cb-tab {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 150ms;
  white-space: nowrap;
}

.cb-tab:hover {
  background: #f8fafc;
}

.cb-tab-active {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

.cb-grid-area {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.cb-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.cb-loading,
.cb-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px;
  color: #64748b;
  font-size: 14px;
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

  .cb-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .cb-search {
    max-width: 100%;
  }

  .cb-show-tabs {
    overflow-x: auto;
  }

  .cb-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .content-cta-centered {
    padding: 16px;
  }

  .ct-wrapper {
    overflow-x: auto;
  }

  .ct-table {
    min-width: 600px;
  }
}
</style>
