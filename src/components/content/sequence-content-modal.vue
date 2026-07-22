<template>
  <PModal width="90vw" height="90vh" no-pad-body @close="onRequestClose">
    <template #title>
      <div class="scm-title-block">
        <div class="scm-title-row">
          <span class="scm-title-name">{{ seqName || t('untitled') }}</span>
          <span v-if="loaded && draftIds.length" class="scm-title-meta">
            {{ draftIds.length }} {{ draftIds.length === 1 ? (t('item')) : (t('items')) }}
          </span>
        </div>
        <p v-if="seqDescription" class="scm-description">{{ seqDescription }}</p>
      </div>
    </template>

    <template #body>
      <div v-if="!loaded" class="scm-loading">
        <LucideIcon name="loader-2" :size="14" :spin="true" class="inline mr-2" />
        {{ t('loading') }}
      </div>
      <div v-else class="scm-body">
        <div
          v-if="!draftIds.length"
          class="scm-empty"
          :class="{ 'scm-empty--dragover': emptyDragOver }"
          @dragover.prevent="onEmptyDragOver"
          @dragleave="onEmptyDragLeave"
          @drop.prevent="onEmptyDrop"
        >
          <LucideIcon name="layers" :size="32" class="text-slate-300 mb-3" />
          <p class="text-sm text-slate-500">{{ t('no-items-yet') }}</p>
          <p v-if="!archived" class="text-xs text-slate-400 mt-1">
            {{ t('drag-content-here') }}
          </p>
        </div>

        <div
          v-else
          class="scm-grid"
          @dragover.prevent="onGridDragOver"
          @drop.prevent="onGridDrop"
        >
          <div
            v-for="(itemId, i) in draftIds"
            :key="itemId"
            class="scm-card-wrap"
            :class="{
              'scm-card-wrap--dragging': dragIndex === i,
              'scm-card-wrap--drop-before': dropTarget === i && dropTarget < dragIndex,
              'scm-card-wrap--drop-after': dropTarget === i && dropTarget > dragIndex,
            }"
            :draggable="!archived"
            @dragstart.stop="onCardDragStart(i, $event)"
            @dragend="onCardDragEnd"
            @dragover.stop.prevent="onCardDragOver(i, $event)"
            @drop.stop.prevent="onCardDrop(i, $event)"
            @dragleave="onCardDragLeave"
          >
            <TaggedContentCard
              :id="itemId"
              sequence-view
              :order-index="i"
              :draggable="false"
              :source="isMyContent(itemId) ? 'mine' : 'pila'"
              :grades="getItemTagLabels(itemId)"
              :description="itemDescriptions[itemId] || ''"
              @preview="openPreview(itemId)"
              @info="infoModalId = itemId"
              @remove="requestRemove(i)"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="scm-footer">
        <PButton
          variant="secondary"
          color="danger"
          :text="t('cancel')"
          @click="onRequestClose"
        />
        <PButton
          variant="primary"
          :text="t('update')"
          :disabled="!dirty || archived"
          :loading="saving"
          @click="onUpdate"
        />
      </div>
    </template>
  </PModal>

  <PreviewModal
    v-if="previewing"
    :id="previewing"
    width="90vw"
    height="90vh"
    @close="previewing = null"
  />

  <SequencePreviewModal
    v-if="sequenceToPreview"
    :id="sequenceToPreview"
    @close="sequenceToPreview = null"
  />

  <PModal
    v-if="infoModalId"
    layer="nested"
    width="480px"
    no-pad-body
    @close="infoModalId = null"
  >
    <template #title>
      <div>
        <h2 class="text-lg font-semibold text-zinc-950">{{ t('content-info') }}</h2>
        <p class="text-xs text-slate-500 mt-0.5 truncate">
          <NameOrTranslatedNameFromItemId :item-id="infoModalId" />
        </p>
      </div>
    </template>
    <template #body>
      <ContentMetadataPanel
        :key="infoModalId"
        :id="infoModalId"
        :partition="partition"
        embedded
      />
    </template>
    <template #footer>
      <PButton variant="secondary" :text="t('close')" @click="infoModalId = null" />
    </template>
  </PModal>

  <PAlertDialog
    v-if="itemToDelete !== null"
    variant="error"
    :title="t('confirm-delete-item')"
    :description="t('delete-item-from-sequence-warning')"
    :confirmText="t('delete')"
    :cancelText="t('cancel')"
    @confirm="confirmRemove"
    @cancel="itemToDelete = null"
  />

  <PAlertDialog
    v-if="showDiscardConfirm"
    variant="warning"
    :title="t('discard-changes')"
    :description="t('unsaved-changes-will-be-lost')"
    :confirmText="t('discard')"
    :cancelText="t('cancel')"
    @confirm="discardAndClose"
    @cancel="showDiscardConfirm = false"
  />
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useStore } from 'vuex'
import { PModal, PButton, PAlertDialog } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import TaggedContentCard from '@/components/tags/tagged-content-card.vue'
import PreviewModal from '@/components/common/preview-modal.vue'
import SequencePreviewModal from './sequence-preview-modal.vue'
import { openContentPreview } from '@/utils/open-content-preview.js'
import ContentMetadataPanel from './content-metadata-panel.vue'
import NameOrTranslatedNameFromItemId from './name-or-translated-name-from-item-id.vue'
import { useContentLibrary } from '@/utils/useContentLibrary.js'
import { prefetchBatch, getCachedTagHierarchy } from '@/utils/content-cache.js'
import {
  normalizeSequenceItems,
  persistSequenceItems,
  isExternalExploreDrop,
  isValidSequenceAgentState,
} from '@/utils/sequence-items.js'

const REORDER_MIME = 'text/x-scm-reorder'

const props = defineProps({
  id: { type: String, required: true },
  archived: { type: Boolean, default: false },
  version: { type: Number, default: 0 },
})

const emit = defineEmits(['close', 'changed'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const partition = computed(() => store.getters.tagPartition)

const { getItemTagLabels, isMyContent, ensureLoaded } = useContentLibrary(store)

const loaded = ref(false)
const saving = ref(false)
const seqName = ref('')
const seqDescription = ref('')
const savedIds = ref([])
const draftIds = ref([])
const itemDescriptions = reactive({})

const previewing = ref(null)
const sequenceToPreview = ref(null)

function openPreview(id) {
  void openContentPreview(id, { previewing, sequenceToPreview })
}
const infoModalId = ref(null)
const itemToDelete = ref(null)
const showDiscardConfirm = ref(false)

const dragIndex = ref(null)
const dropTarget = ref(null)
const emptyDragOver = ref(false)

const dirty = computed(() => {
  const saved = savedIds.value
  const draft = draftIds.value
  if (saved.length !== draft.length) return true
  return saved.some((id, i) => id !== draft[i])
})

function idsEqual(a, b) {
  if (a.length !== b.length) return false
  return a.every((id, i) => id === b[i])
}

function applyLoadedState(name, description, ids) {
  seqName.value = name || ''
  seqDescription.value = description || ''
  const keepDraft = dirty.value && !idsEqual(draftIds.value, ids)
  savedIds.value = [...ids]
  if (!keepDraft) {
    draftIds.value = [...ids]
  }
}

async function loadSequenceMeta() {
  try {
    const state = await Agent.state(props.id)
    if (!isValidSequenceAgentState(state)) {
      emit('close')
      return
    }
    const ids = normalizeSequenceItems(state.items)
    applyLoadedState(state.name, state.description, ids)
    void prefetchItemMeta(ids)
  } catch (e) {
    console.warn('[SequenceContentModal] failed to load', props.id, e)
    emit('close')
  } finally {
    loaded.value = true
  }
}

async function loadItemDescription(itemId) {
  if (!itemId || itemDescriptions[itemId] !== undefined) return
  try {
    const state = await Agent.state(itemId)
    itemDescriptions[itemId] = state?.description || ''
  } catch {
    itemDescriptions[itemId] = ''
  }
}

function prefetchItemMeta(ids) {
  if (!ids.length) return
  void ensureLoaded({ useDiskCache: true })
  void prefetchBatch(
    ids,
    store.getters.language(),
    partition.value,
    getCachedTagHierarchy()?.leafToCategory,
    { priorityIds: ids },
  ).catch(() => {})
  void Promise.allSettled(ids.map(id => loadItemDescription(id)))
}

function insertDraftItem(itemId, index = -1) {
  if (!itemId || props.archived || draftIds.value.includes(itemId)) return
  const ids = [...draftIds.value]
  const at = index >= 0 && index <= ids.length ? index : ids.length
  ids.splice(at, 0, itemId)
  draftIds.value = ids
  void loadItemDescription(itemId)
}

function reorderDraft(fromIndex, toIndex) {
  if (
    fromIndex === null
    || fromIndex === undefined
    || fromIndex === toIndex
    || fromIndex < 0
    || toIndex < 0
    || fromIndex >= draftIds.value.length
    || toIndex >= draftIds.value.length
  ) {
    return
  }
  const ids = [...draftIds.value]
  const [moved] = ids.splice(fromIndex, 1)
  ids.splice(toIndex, 0, moved)
  draftIds.value = ids
}

function requestRemove(index) {
  if (props.archived) return
  itemToDelete.value = index
}

function confirmRemove() {
  const index = itemToDelete.value
  itemToDelete.value = null
  if (index === null || index === undefined || props.archived) return
  draftIds.value = draftIds.value.filter((_, i) => i !== index)
}

function onCardDragStart(index, e) {
  if (props.archived) return
  dragIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData(REORDER_MIME, String(index))
}

function onCardDragEnd() {
  dragIndex.value = null
  dropTarget.value = null
}

function onCardDragOver(index, e) {
  if (e?.dataTransfer && isExternalExploreDrop(e.dataTransfer, dragIndex.value)) {
    e.dataTransfer.dropEffect = 'copy'
    dropTarget.value = index
    return
  }
  if (dragIndex.value === null || index === dragIndex.value) {
    dropTarget.value = null
    return
  }
  dropTarget.value = index
}

function onCardDragLeave() {
  dropTarget.value = null
}

function onCardDrop(toIndex, e) {
  dropTarget.value = null
  if (e && isExternalExploreDrop(e.dataTransfer, dragIndex.value)) {
    const itemId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text')
    insertDraftItem(itemId, toIndex)
    dragIndex.value = null
    return
  }

  const fromIndex = dragIndex.value
  dragIndex.value = null
  if (fromIndex === null || props.archived) return
  reorderDraft(fromIndex, toIndex)
}

function onEmptyDragOver(e) {
  if (props.archived) return
  if (isExternalExploreDrop(e.dataTransfer, null)) {
    e.dataTransfer.dropEffect = 'copy'
    emptyDragOver.value = true
  }
}

function onEmptyDragLeave() {
  emptyDragOver.value = false
}

function onEmptyDrop(e) {
  emptyDragOver.value = false
  if (props.archived) return
  const itemId = e.dataTransfer?.getData('text/plain') || e.dataTransfer?.getData('text')
  insertDraftItem(itemId)
}

function onGridDragOver(e) {
  if (props.archived) return
  if (isExternalExploreDrop(e.dataTransfer, dragIndex.value)) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function onGridDrop(e) {
  if (props.archived || dragIndex.value !== null) return
  const itemId = e.dataTransfer?.getData('text/plain') || e.dataTransfer?.getData('text')
  if (itemId && isExternalExploreDrop(e.dataTransfer, null)) {
    insertDraftItem(itemId)
  }
}

async function onUpdate() {
  if (!dirty.value || props.archived || saving.value) return
  saving.value = true
  try {
    const next = await persistSequenceItems(props.id, draftIds.value)
    savedIds.value = [...next]
    draftIds.value = [...next]
    emit('changed')
  } catch (e) {
    console.warn('[SequenceContentModal] update failed', props.id, e)
  } finally {
    saving.value = false
  }
}

function onRequestClose() {
  if (dirty.value) {
    showDiscardConfirm.value = true
    return
  }
  emit('close')
}

function discardAndClose() {
  showDiscardConfirm.value = false
  draftIds.value = [...savedIds.value]
  emit('close')
}

watch(() => props.version, () => {
  if (!loaded.value) return
  void loadSequenceMeta()
})

watch(draftIds, (ids) => {
  if (ids.length) prefetchItemMeta(ids)
}, { immediate: true })

onMounted(() => {
  void loadSequenceMeta()
})
</script>

<style scoped>
.scm-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 320px;
  color: #64748b;
  font-size: 14px;
}

.scm-body {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
}

.scm-title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding-right: 8px;
}

.scm-title-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.scm-title-name {
  font-size: 18px;
  font-weight: 600;
  color: #09090b;
  line-height: 1.3;
}

.scm-title-meta {
  font-size: 14px;
  font-weight: 400;
  color: #64748b;
  white-space: nowrap;
}

.scm-description {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.scm-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.scm-card-wrap {
  cursor: grab;
  border-radius: 16px;
  transition: box-shadow 120ms, opacity 120ms;
}

.scm-card-wrap:active {
  cursor: grabbing;
}

.scm-card-wrap--dragging {
  opacity: 0.45;
}

.scm-card-wrap--drop-before {
  box-shadow: inset 0 3px 0 0 #2563eb;
}

.scm-card-wrap--drop-after {
  box-shadow: inset 0 -3px 0 0 #2563eb;
}

.scm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  text-align: center;
  border: 2px dashed #e2e8f0;
  border-radius: 16px;
  padding: 48px 24px;
  transition: border-color 120ms, background 120ms;
}

.scm-empty--dragover {
  border-color: #2563eb;
  background: #eff6ff;
}

.scm-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

@media (max-width: 1024px) {
  .scm-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .scm-body {
    padding: 16px;
  }

  .scm-grid {
    grid-template-columns: 1fr;
  }
}
</style>