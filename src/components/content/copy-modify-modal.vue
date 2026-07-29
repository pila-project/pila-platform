<template>
  <PModal
    :width="modalWidth"
    @close="$emit('close')"
  >
    <template v-if="step !== 'success'" #title>
      <div class="cm-modal-header">
        <div class="cm-modal-header-text">
          <div class="cm-modal-title-row">
            <LucideIcon :name="step === 2 ? 'eye' : 'files'" :size="14" class="cm-modal-title-icon" />
            <h2 class="cm-modal-title">{{ stepHeaderTitle }}</h2>
          </div>
          <p class="cm-modal-subtitle">{{ stepHeaderSubtitle }}</p>
        </div>
      </div>
    </template>

    <template #body>
      <!-- Step 1: Copy details -->
      <div v-if="step === 1" class="cm-step-body">
        <div class="stepper">
          <div v-for="s in copySteps" :key="s.num" class="stepper-item">
            <div class="step-col">
              <div class="step-circle" :class="stepCircleClass(s.num)">
                <LucideIcon :name="s.icon" :size="13" />
              </div>
              <span class="step-label" :class="stepLabelClass(s.num)">{{ s.label }}</span>
            </div>
            <div v-if="s.num < 2" class="step-trail" :class="stepTrailClass(s.num)" />
          </div>
        </div>

        <div class="info-banner">
          <LucideIcon name="info" :size="14" class="text-primary-500 shrink-0" />
          <span>{{ copyWillBeCreatedInfo }}</span>
        </div>

        <div class="flex flex-col gap-4">
          <PInput
            v-model="form.title"
            :label="t('new-title')"
            required
            :placeholder="t('copy-of') + '...'"
          />
          <PInput
            v-model="form.description"
            :label="t('description')"
            :placeholder="originalDescription || t('describe-this-content')"
            multiline
            :rows="3"
          />
          <PInput
            v-model="form.notes"
            :label="customizationNotesLabel"
            :placeholder="t('describe-changes-planned')"
            multiline
            :rows="2"
          />

          <div>
            <label class="text-sm font-medium text-slate-700 block mb-1">{{ t('upload-image') }}</label>
            <div
              class="image-upload-area"
              :class="{ 'image-upload-dragover': imageDragover }"
              @click="imageInputRef?.click()"
              @dragover.prevent="imageDragover = true"
              @dragleave="imageDragover = false"
              @drop.prevent="onImageDrop"
            >
              <div v-if="imagePreview" class="image-upload-preview">
                <img :src="imagePreview" alt="" />
                <button type="button" class="image-upload-remove" @click.stop="removeImage">
                  <LucideIcon name="x" :size="11" />
                </button>
              </div>
              <div v-else class="image-upload-placeholder">
                <LucideIcon name="upload" :size="28" class="text-slate-400" />
                <span class="text-sm font-medium text-primary-600">{{ t('upload-image') }}</span>
                <span class="text-xs text-slate-500">{{ t('drag-and-drop-image') }}</span>
              </div>
              <input
                ref="imageInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onImageSelect"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Preview / select content (Figma data table) -->
      <div v-else-if="step === 2" class="cm-step-body">
        <div class="stepper">
          <div v-for="s in copySteps" :key="s.num" class="stepper-item">
            <div class="step-col">
              <div class="step-circle" :class="stepCircleClass(s.num)">
                <LucideIcon :name="step > s.num ? 'check' : s.icon" :size="13" />
              </div>
              <span class="step-label" :class="stepLabelClass(s.num)">{{ s.label }}</span>
            </div>
            <div v-if="s.num < 2" class="step-trail" :class="stepTrailClass(s.num)" />
          </div>
        </div>

        <button type="button" class="add-content-cta" @click="openContentBrowser">
          <LucideIcon name="circle-plus" :size="28" class="text-slate-500" />
          <span class="add-content-cta-label">{{ t('add-content-item-or-sequence') }}</span>
          <span class="add-content-cta-desc">{{ t('browse-and-select-content-from-library') }}</span>
        </button>

        <div class="cm-table-section">
          <div class="cm-added-header">
            <span class="cm-added-heading">
              {{ translateOr('current-item-sequence', 'Current item/sequence') }} ({{ sequenceItemIds.length }})
            </span>
            <PButton
              v-if="sequenceItemIds.length"
              variant="ghost"
              size="sm"
              icon="lucide:eye"
              :text="t('preview')"
              @click="openPreview(sequenceItemIds[0])"
            />
          </div>

          <div v-if="tableLoading" class="cm-table-loading" aria-busy="true">
            <LucideIcon name="loader-2" :size="14" :spin="true" />
            {{ t('loading') }}
          </div>
          <template v-else-if="!sequenceItemIds.length">
            <p class="cm-added-empty">
              {{ translateOr('no-items-added-yet-copy', 'No items added yet. Use the button above to add content from the library.') }}
            </p>
          </template>
          <template v-else>
            <div class="cm-table-toolbar">
              <PInput
                v-model="contentSearchQuery"
                class="cm-table-search"
                :placeholder="translateOr('search-content-title', 'Search content title')"
                icon="lucide:search"
              />
              <PButton
                v-if="hasTableSelection"
                variant="secondary"
                color="danger"
                size="sm"
                icon="lucide:trash-2"
                :text="t('remove')"
                @click="removeSelectedItems"
              />
            </div>
            <div class="cm-table-wrap">
            <PTable
              :headers="tableHeaders"
              :items="tableRows"
              item-key="id"
              selectable
              :selected="tableSelectedRows"
              :items-per-page="10"
              :items-per-page-text="t('rows-per-page')"
              :items-per-page-options="sequenceTablePerPageOptions"
              draggable-rows
              :no-data-text="translateOr('no-matching-items', 'No matching items')"
              @update:selected="onTableSelectionChange"
            >
              <template #item.title="{ item }">
                <div class="cm-cell-title">
                  <span class="cm-cell-title-line">
                    <span class="cm-cell-name">{{ item.name }}</span>
                    <span class="cm-cell-dot">.</span>
                    <span class="cm-cell-source" :class="item.source === 'mine' ? 'source-mine' : 'source-expert'">
                      {{ item.source === 'mine' ? t('my-content') : translateOr('expert-content', 'Expert content') }}
                    </span>
                  </span>
                  <span v-if="item.description" class="cm-cell-desc">{{ item.description }}</span>
                </div>
              </template>
              <template #item.modified="{ item }">
                <span class="cm-cell-modified">{{ item.modifiedLabel || '—' }}</span>
              </template>
              <template #item.type="{ item }">
                <PBadge
                  :variant="item.isSequence ? 'warning' : 'success'"
                  :text="item.typeLabel"
                />
              </template>
              <template #item.grade="{ item }">
                <PBadge
                  v-if="item.gradeLabel"
                  variant="outline"
                  :text="item.gradeLabel"
                />
                <span v-else class="text-slate-400 text-xs">—</span>
              </template>
              <template #item.actions="{ item }">
                <PMenu align-right>
                  <template #activator="{ props: menuProps }">
                    <PButton
                      variant="ghost"
                      size="xsm"
                      icon="lucide:ellipsis-vertical"
                      iconOnly
                      :aria-label="t('actions')"
                      @click.stop="menuProps.onClick"
                    />
                  </template>
                  <PMenuItem
                    :title="t('preview')"
                    prepend-icon="lucide:eye"
                    @click="openPreview(item.id)"
                  />
                  <PMenuItem
                    :title="t('remove')"
                    prepend-icon="lucide:trash-2"
                    danger
                    @click="removeItemFromSequence(item.id)"
                  />
                </PMenu>
              </template>
            </PTable>
            </div>
            <p v-if="hasTableSelection" class="cm-selection-summary">
              {{ selectionSummary }}
            </p>
          </template>
        </div>
      </div>

      <!-- Success -->
      <div v-else-if="step === 'success'" class="success-state">
        <div class="success-icon-ring">
          <LucideIcon name="check" :size="24" class="text-green-600" />
        </div>
        <h3 class="text-lg font-semibold text-zinc-950 mt-4">{{ t('content-copied-successfully') }}</h3>
        <p class="text-sm text-slate-500 mt-2">
          {{ t('find-in-my-content') }} "{{ form.title }}"
        </p>
      </div>
    </template>

    <template #footer>
      <template v-if="step === 1">
        <PButton variant="secondary" color="danger" :text="t('cancel')" @click="$emit('close')" />
        <PButton
          variant="primary"
          :text="t('next')"
          :disabled="!form.title.trim()"
          @click="step = 2"
        />
      </template>
      <template v-else-if="step === 2">
        <PButton variant="outline" :text="t('back')" @click="step = 1" />
        <div class="flex-1" />
        <PButton variant="secondary" color="danger" :text="t('cancel')" @click="$emit('close')" />
        <PButton
          variant="primary"
          :text="t('create-copy')"
          :loading="saving"
          :disabled="!sequenceItemIds.length"
          @click="createCopy"
        />
      </template>
      <template v-else-if="step === 'success'">
        <PButton variant="primary" :text="t('continue')" @click="$emit('created', createdId)" />
      </template>
    </template>
  </PModal>

  <CopyModifyContentPicker
    v-model:open="selectingContent"
    :existing-item-ids="sequenceItemIds"
    :copy-title="form.title"
    @add="onPickerAddItems"
    @preview="openPreview($event)"
  />

  <PreviewModal
    v-if="previewingId"
    :id="previewingId"
    width="90vw"
    height="90vh"
    @close="previewingId = null"
  />

  <SequencePreviewModal
    v-if="sequenceToPreview"
    :id="sequenceToPreview"
    @close="sequenceToPreview = null"
  />
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { validate as isUUID } from 'uuid'
import getName from '@/utils/name-and-translation-for-content.js'
import setTagging from '@/utils/set-tagging.js'
import { MY_CONTENT_TAG } from '@/utils/constants.js'
import {
  normalizeSequenceItems,
  createMapSequenceItems,
  partitionSequenceMemberIds,
} from '@/utils/sequence-items.js'
import { getContentMetadata, invalidate } from '@/utils/content-cache.js'
import { PModal, PInput, PButton, PTable, PBadge, PMenu, PMenuItem } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import PreviewModal from '@/components/common/preview-modal.vue'
import SequencePreviewModal from './sequence-preview-modal.vue'
import { openContentPreview } from '@/utils/open-content-preview.js'
import CopyModifyContentPicker from './copy-modify-content-picker.vue'
import { useStore } from 'vuex'
import { useFeedback } from '@/composables/useFeedback.js'
import { tablePerPageOptions } from '@/utils/pagination-options.js'

const MODAL_WIDTH = '984px'
const SUCCESS_MODAL_WIDTH = '520px'

const store = useStore()
function t(slug) { return store.getters.t(slug) }
const sequenceTablePerPageOptions = computed(() => tablePerPageOptions(t))

function translateOr(slug, fallback) {
  const value = t(slug)
  if (!value || value === slug || value.endsWith(` ${slug}`) || value.includes(slug)) {
    return fallback
  }
  return value
}

const copyWillBeCreatedInfo = computed(() =>
  translateOr(
    'copy-will-be-created-info',
    'A copy will be created with all content and settings from the existing assignment.',
  ),
)

const customizationNotesLabel = computed(() =>
  translateOr('customization-notes-optional', translateOr('customization-notes', 'Customization notes (optional)')),
)

const { error: showError } = useFeedback()

const props = defineProps({
  id: { type: String, required: true },
})

const emit = defineEmits(['close', 'created'])

const copySteps = [
  { num: 1, icon: 'file-symlink', label: translateOr('step-1', 'Step 1') },
  { num: 2, icon: 'upload', label: translateOr('step-2', 'Step 2') },
]

const step = ref(1)
const saving = ref(false)
const createdId = ref(null)
const previewingId = ref(null)
const sequenceToPreview = ref(null)

function openPreview(id) {
  void openContentPreview(id, { previewing: previewingId, sequenceToPreview })
}
const originalName = ref('...')
const originalDescription = ref('')
const originalItems = ref([])
/** Checkbox selection — bulk remove only; list membership defines copy contents. */
const bulkSelectedIds = reactive(new Set())
const sourceIsSequence = ref(true)

const imageInputRef = ref(null)
const imageDragover = ref(false)
const imagePreview = ref(null)
const imageFile = ref(null)
const sourceCoverRef = ref(null)

const selectingContent = ref(false)
const sequenceItemIds = ref([])
const contentSearchQuery = ref('')
const myContentIds = reactive(new Set())
const rowMeta = reactive(new Map())
const tableLoading = ref(true)

const form = reactive({
  title: '',
  description: '',
  notes: '',
})

const modalWidth = computed(() => (step.value === 'success' ? SUCCESS_MODAL_WIDTH : MODAL_WIDTH))

const stepHeaderTitle = computed(() => {
  if (step.value === 2) {
    return translateOr('preview-details', 'Preview details')
  }
  return translateOr('copy-and-modify-content', 'Copy & modify content')
})

const stepHeaderSubtitle = computed(() => {
  if (step.value === 2) {
    return translateOr(
      'step-2-review-content-subtitle',
      'Step 2 of 2: Review existing content or add new content',
    )
  }
  return translateOr(
    'step-1-copy-subtitle',
    `Step 1 of 2: Create your own version of "${originalName.value}" that you can customize for your needs.`,
  )
})

const selectionSummary = computed(() => {
  const selected = bulkSelectedIds.size
  const total = sequenceItemIds.value.length
  const fallback = `${selected} of ${total} selected for removal.`
  const translated = t('rows-selected-for-removal-summary')
  if (!translated || translated === 'rows-selected-for-removal-summary') return fallback
  return translated.replace('{selected}', String(selected)).replace('{total}', String(total))
})

const tableHeaders = computed(() => [
  { key: 'title', title: translateOr('title-and-details', 'Title & details'), sortable: false },
  { key: 'modified', title: translateOr('last-modified', 'Last modified') },
  { key: 'type', title: translateOr('content-type', 'Content type'), sortable: false },
  { key: 'grade', title: t('grade'), sortable: false },
  { key: 'actions', title: translateOr('actions', 'Actions'), sortable: false },
])

const filteredTableIds = computed(() => {
  let ids = sequenceItemIds.value
  const q = contentSearchQuery.value.trim().toLowerCase()
  if (q) {
    ids = ids.filter(id => {
      const meta = rowMeta.get(id)
      if (!meta) return false
      return (
        meta.name?.toLowerCase().includes(q)
        || meta.description?.toLowerCase().includes(q)
      )
    })
  }
  return ids
})

const tableRows = computed(() =>
  filteredTableIds.value.map(id => {
    const meta = rowMeta.get(id) || {}
    return {
      id,
      name: meta.name || t('untitled'),
      description: meta.description || '',
      modifiedLabel: meta.modifiedLabel || '',
      modified: meta.modified || '',
      isSequence: meta.isSequence,
      typeLabel: meta.typeLabel || t('item'),
      gradeLabel: meta.gradeLabel || '',
      source: meta.source || (myContentIds.has(id) ? 'mine' : 'expert'),
    }
  }),
)

const tableSelectedRows = computed(() =>
  tableRows.value.filter(row => bulkSelectedIds.has(row.id)),
)

const hasTableSelection = computed(() => bulkSelectedIds.size > 0)

function removeItemFromSequence(id) {
  sequenceItemIds.value = sequenceItemIds.value.filter(itemId => itemId !== id)
  bulkSelectedIds.delete(id)
  rowMeta.delete(id)
}

function removeSelectedItems() {
  const ids = [...bulkSelectedIds]
  ids.forEach(id => removeItemFromSequence(id))
}

function onTableSelectionChange(rows) {
  const visibleIds = new Set(tableRows.value.map(r => r.id))
  visibleIds.forEach((id) => {
    if (!rows.some(r => r.id === id)) bulkSelectedIds.delete(id)
  })
  rows.forEach(r => bulkSelectedIds.add(r.id))
}

function buildCopyItems() {
  return createMapSequenceItems(sequenceItemIds.value)
}

function openContentBrowser() {
  selectingContent.value = true
}

async function addContentToSequence(id) {
  if (!id || sequenceItemIds.value.includes(id)) return false
  // UIUX-113: sequences cannot be members of sequences
  const { allowed } = await partitionSequenceMemberIds([id])
  if (!allowed.length) {
    showError(t('something-went-wrong'))
    return false
  }
  sequenceItemIds.value.push(id)
  await loadRowMeta(id)
  return true
}

async function onPickerAddItems(ids) {
  const { allowed, rejectedSequences } = await partitionSequenceMemberIds(ids || [])
  if (rejectedSequences.length && !allowed.length) {
    showError(t('something-went-wrong'))
    return
  }
  for (const id of allowed) {
    await addContentToSequence(id)
  }
  if (rejectedSequences.length && allowed.length) {
    // Mixed batch: leaf items added; nested sequences rejected without new copy
    showError(t('something-went-wrong'))
  }
}

function formatDate(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('en-CA')
  } catch {
    return ''
  }
}

async function loadRowMeta(id) {
  try {
    const lang = store.getters.language()
    const [meta, state, name] = await Promise.all([
      getContentMetadata(id),
      Agent.state(id).catch(() => ({})),
      getName(id, lang),
    ])
    const isSequence = meta?.active_type === 'application/json;type=sequence'
    const itemCount = isSequence ? normalizeSequenceItems(state.items).length : 0
    const typeLabel = isSequence
      ? `${t('sequence')}${itemCount ? ` (${itemCount} ${itemCount === 1 ? t('item') : t('items')})` : ''}`
      : t('item')

    rowMeta.set(id, {
      name: name || t('untitled'),
      description: state.description || '',
      modified: meta?.updated || '',
      modifiedLabel: formatDate(meta?.updated),
      isSequence,
      typeLabel,
      gradeLabel: '',
      source: myContentIds.has(id) ? 'mine' : 'expert',
    })
  } catch {
    rowMeta.set(id, {
      name: t('untitled'),
      description: '',
      modified: '',
      modifiedLabel: '',
      isSequence: false,
      typeLabel: t('item'),
      gradeLabel: '',
      source: myContentIds.has(id) ? 'mine' : 'expert',
    })
  }
}

function stepCircleClass(num) {
  if (num < step.value) return 'step-done'
  if (num === step.value) return 'step-active'
  return 'step-upcoming'
}

function stepLabelClass(num) {
  return num <= step.value ? 'step-label-active' : 'step-label-upcoming'
}

function stepTrailClass(num) {
  if (num < step.value) return 'trail-completed'
  if (num === step.value) return 'trail-active'
  return 'trail-upcoming'
}

function onImageSelect(e) {
  const file = e.target.files?.[0]
  if (file) setImage(file)
}

function onImageDrop(e) {
  imageDragover.value = false
  const file = e.dataTransfer.files?.[0]
  if (file?.type.startsWith('image/')) setImage(file)
}

function setImage(file) {
  imageFile.value = file
  const reader = new FileReader()
  reader.onload = (ev) => { imagePreview.value = ev.target?.result }
  reader.readAsDataURL(file)
}

function removeImage() {
  imageFile.value = null
  imagePreview.value = null
  sourceCoverRef.value = null
  if (imageInputRef.value) imageInputRef.value.value = ''
}

async function resolveImagePreviewUrl(imageRef) {
  if (!imageRef) return null
  if (isUUID(imageRef)) {
    try {
      return await Agent.download(imageRef).url()
    } catch {
      return null
    }
  }
  return imageRef
}

async function attachCoverImage(sequenceId, file) {
  if (!file) return
  const imageId = await Agent.upload(file.name, file.type, file)
  const state = await Agent.state(sequenceId)
  state.image = imageId
  await Agent.synced()
}

async function createCopy() {
  if (saving.value) return
  saving.value = true

  try {
    const items = buildCopyItems()
    const id = await Agent.create({
      active_type: 'application/json;type=sequence',
      active: {
        name: form.title.trim(),
        description: form.description.trim(),
        notes: form.notes.trim(),
        items,
        copiedFrom: props.id,
      },
    })

    await setTagging({ tag: MY_CONTENT_TAG, target: id, value: true })
    if (imageFile.value) {
      await attachCoverImage(id, imageFile.value)
    } else if (sourceCoverRef.value) {
      const state = await Agent.state(id)
      state.image = sourceCoverRef.value
      await Agent.synced()
    } else {
      await Agent.synced()
    }
    invalidate(id)
    invalidate(props.id)
    createdId.value = id
    step.value = 'success'
  } catch (e) {
    console.error('[CopyModifyModal] create error:', e)
    showError(t('something-went-wrong'))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const name = await getName(props.id, store.getters.language())
    originalName.value = name || t('untitled')
    form.title = `${t('copy-of')} ${originalName.value}`

    const [state, meta] = await Promise.all([
      Agent.state(props.id),
      Agent.metadata(props.id).catch(() => null),
    ])
    originalDescription.value = state.description || ''
    form.description = originalDescription.value

    const existingCover = state.image || state.picture
    if (existingCover) {
      sourceCoverRef.value = existingCover
      imagePreview.value = await resolveImagePreviewUrl(existingCover)
    }

    sourceIsSequence.value = meta?.active_type === 'application/json;type=sequence'
    const itemIds = normalizeSequenceItems(state.items)
    if (itemIds.length) {
      originalItems.value = itemIds
      sequenceItemIds.value = [...itemIds]
    } else if (!sourceIsSequence.value) {
      originalItems.value = [props.id]
      sequenceItemIds.value = [props.id]
    }

    const env = await Agent.environment()
    const userId = env.auth.user
    const myTaggings = await Agent.query(
      'taggings-for-tag',
      [userId, MY_CONTENT_TAG],
      'tags.knowlearning.systems',
    ).catch(() => [])
    myTaggings.forEach(tagging => myContentIds.add(tagging.target))

    await Promise.allSettled(sequenceItemIds.value.map(id => loadRowMeta(id)))
  } catch (e) {
    console.warn('[CopyModifyModal] load error:', e)
  } finally {
    tableLoading.value = false
  }
})
</script>

<style scoped>
.flex-1 {
  flex: 1;
}

.cm-modal-header {
  width: 100%;
}
.cm-modal-header-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cm-modal-title-row {
  display: flex;
  align-items: center;
  gap: 3px;
}
.cm-modal-title-icon {
  color: #334155;
  flex-shrink: 0;
}
.cm-modal-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
  color: #334155;
  margin: 0;
}
.cm-modal-subtitle {
  font-size: 12px;
  line-height: 16px;
  color: #334155;
  margin: 0;
}

.cm-step-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Horizontal stepper (Figma) */
.stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 4px 0 2px;
}
.stepper-item {
  display: flex;
  align-items: flex-start;
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
  border: none;
}
.step-done {
  background: white;
  border: 1px solid #2563eb;
  color: #2563eb;
}
.step-upcoming {
  background: white;
  border: 1px solid #e2e8f0;
  color: #64748b;
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
  width: 80px;
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

.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  background: #eff6ff;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #2563eb;
}

.image-upload-area {
  border: 1px dashed #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms;
  overflow: hidden;
  min-height: 107px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-upload-area:hover {
  border-color: #2563eb;
  background: #f8fafc;
}
.image-upload-dragover {
  border-color: #2563eb;
  background: #eff6ff;
}
.image-upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 56px;
  text-align: center;
}
.image-upload-preview {
  position: relative;
  display: flex;
  justify-content: center;
  padding: 8px;
  width: 100%;
}
.image-upload-preview img {
  max-height: 120px;
  max-width: 100%;
  object-fit: contain;
  border-radius: 4px;
}
.image-upload-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hidden {
  display: none;
}

.add-content-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 102px;
  padding: 12px 56px;
  border: 1px dashed #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: border-color 150ms, background 150ms;
}
.add-content-cta:hover {
  border-color: #2563eb;
  background: #f8fafc;
}
.add-content-cta-label {
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  text-align: center;
}
.add-content-cta-desc {
  font-size: 12px;
  color: #334155;
  text-align: center;
}

.cm-added-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.cm-added-heading {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}
.cm-added-empty {
  font-size: 12px;
  color: #94a3b8;
  padding: 12px 0;
  margin: 0;
}
.cm-selection-summary {
  font-size: 14px;
  line-height: 24px;
  color: #64748b;
  margin: 0;
  padding-top: 16px;
}

.cm-table-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.cm-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.cm-table-search {
  width: 246px;
  flex-shrink: 0;
}
.cm-table-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  font-size: 13px;
  color: #64748b;
}
.cm-table-wrap {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}
.cm-table-wrap :deep(table) {
  width: 100%;
}
.cm-cell-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.cm-cell-title-line {
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  line-height: 20px;
}
.cm-cell-name {
  color: #334155;
  font-size: 12px;
}
.cm-cell-dot {
  margin: 0 2px;
}
.cm-cell-source {
  font-size: 12px;
  font-weight: 500;
}
.source-mine {
  color: #2563eb;
}
.source-expert {
  color: #ca8a04;
}
.cm-cell-desc {
  font-size: 12px;
  line-height: 16px;
  color: #64748b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cm-cell-modified {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
}

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