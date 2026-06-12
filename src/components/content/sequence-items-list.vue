<template>
  <div class="sil" :class="{ 'sil--comfortable': comfortable }">
    <div v-if="items.length" class="sil-items">
      <div
        v-for="(itemId, i) in items"
        :key="itemId"
        class="sil-item"
        :class="{
          'sil-item--active': selectedIndex === i,
          'sil-item-dragging': dragIndex === i,
          'sil-item-drop-above': dropTarget === i && dropTarget < dragIndex,
          'sil-item-drop-below': dropTarget === i && dropTarget > dragIndex,
        }"
        draggable="true"
        @click="onRowClick(i)"
        @dragstart.stop="onItemDragStart(i, $event)"
        @dragend="onItemDragEnd"
        @dragover.stop.prevent="onItemDragOver(i, $event)"
        @drop.stop.prevent="onItemDrop(i, $event)"
        @dragleave="onItemDragLeave"
      >
        <div class="sil-item-top">
          <LucideIcon name="grip-vertical" :size="comfortable ? 14 : 11" class="sil-item-grip" />
          <span class="sil-item-num">{{ String(i + 1).padStart(2, '0') }}</span>
          <span
            class="sil-item-type"
            :class="itemMeta[itemId]?.isSequence ? 'sil-item-type-seq' : 'sil-item-type-item'"
          >
            {{ itemMeta[itemId]?.isSequence ? t('sequence') : t('item') }}
          </span>
          <div class="sil-item-end">
            <PButton
              v-if="showPreviewActions"
              variant="ghost"
              size="xsm"
              icon="lucide:eye"
              iconOnly
              :aria-label="t('preview')"
              @click.stop="$emit('preview', itemId)"
            />
            <button
              v-if="!archived"
              class="sil-item-delete"
              :aria-label="t('delete')"
              @click.stop="removeItem(i)"
            >
              <LucideIcon name="trash-2" :size="comfortable ? 14 : 13" />
            </button>
          </div>
        </div>
        <div class="sil-item-title">
          <NameOrTranslatedNameFromItemId :itemId="itemId" />
        </div>
        <p v-if="itemMeta[itemId]?.description" class="sil-item-desc">
          {{ itemMeta[itemId].description }}
        </p>
      </div>
    </div>
    <div v-else class="sil-empty">
      {{ t('no-items-yet') }}
    </div>

    <PAlertDialog
      v-if="itemToDelete !== null"
      variant="error"
      :title="t('confirm-delete-item')"
      :description="t('delete-item-from-sequence-warning')"
      :confirmText="t('delete')"
      :cancelText="t('cancel')"
      @confirm="confirmRemoveItem"
      @cancel="itemToDelete = null"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useStore } from 'vuex'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { PButton, PAlertDialog } from '@/components/ui/index.js'
import NameOrTranslatedNameFromItemId from './name-or-translated-name-from-item-id.vue'
import { getContentMetadata } from '@/utils/content-cache.js'
import {
  normalizeSequenceItems,
  removeItemFromSequence,
  reorderSequenceItems,
  isExternalExploreDrop,
} from '@/utils/sequence-items.js'

const props = defineProps({
  sequenceId: { type: String, required: true },
  archived: { type: Boolean, default: false },
  version: { type: Number, default: 0 },
  comfortable: { type: Boolean, default: false },
  showPreviewActions: { type: Boolean, default: false },
  selectedIndex: { type: Number, default: -1 },
  selectable: { type: Boolean, default: false },
})

const emit = defineEmits(['changed', 'select', 'preview', 'drop-item'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const seqState = ref(null)
const itemMeta = reactive({})
const itemVersion = ref(0)
const itemToDelete = ref(null)

const dragIndex = ref(null)
const dropTarget = ref(null)

const items = computed(() => {
  itemVersion.value
  return seqState.value?.items || []
})

function applySeqStateFromAgent(state) {
  const normalized = normalizeSequenceItems(state?.items)
  seqState.value = {
    name: state?.name || '',
    description: state?.description || '',
    items: normalized,
  }
}

async function loadItemMeta(itemId) {
  if (!itemId || itemMeta[itemId]) return
  try {
    const [state, meta] = await Promise.all([
      Agent.state(itemId),
      getContentMetadata(itemId),
    ])
    itemMeta[itemId] = {
      description: state.description || '',
      isSequence: meta?.active_type === 'application/json;type=sequence',
    }
  } catch {
    itemMeta[itemId] = { description: '', isSequence: false }
  }
}

async function reloadSequenceState() {
  try {
    const state = await Agent.state(props.sequenceId)
    applySeqStateFromAgent(state)
    itemVersion.value++
    await Promise.allSettled(items.value.map(id => loadItemMeta(id)))
  } catch (e) {
    console.warn('[SequenceItemsList] failed to refresh', props.sequenceId, e)
  }
}

function onRowClick(index) {
  if (props.selectable) emit('select', index)
}

function removeItem(index) {
  itemToDelete.value = index
}

async function confirmRemoveItem() {
  const index = itemToDelete.value
  itemToDelete.value = null
  if (index === null || index === undefined || props.archived) return
  try {
    const { items: nextItems } = await removeItemFromSequence(props.sequenceId, index)
    applySeqStateFromAgent({
      name: seqState.value?.name || '',
      description: seqState.value?.description || '',
      items: nextItems,
    })
    itemVersion.value++
    emit('changed', { items: nextItems })
  } catch (e) {
    console.warn('[SequenceItemsList] remove item failed', props.sequenceId, e)
  }
}

function emitExternalDrop(itemId, index = -1) {
  if (!itemId) return
  emit('drop-item', index >= 0 ? { itemId, index } : itemId)
}

function onItemDragStart(index, e) {
  if (props.archived) return
  dragIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/x-reorder', String(index))
}

function onItemDragEnd() {
  dragIndex.value = null
  dropTarget.value = null
}

function onItemDragOver(index, e) {
  if (e?.dataTransfer && isExternalExploreDrop(e.dataTransfer, dragIndex.value)) {
    e.dataTransfer.dropEffect = 'copy'
    dropTarget.value = null
    return
  }
  if (dragIndex.value === null || index === dragIndex.value) {
    dropTarget.value = null
    return
  }
  dropTarget.value = index
}

function onItemDragLeave() {
  dropTarget.value = null
}

async function onItemDrop(toIndex, e) {
  dropTarget.value = null
  if (e && isExternalExploreDrop(e.dataTransfer, dragIndex.value)) {
    const itemId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text')
    emitExternalDrop(itemId, toIndex)
    return
  }

  const fromIndex = dragIndex.value
  if (fromIndex === null || fromIndex === toIndex || !seqState.value?.items) return

  dragIndex.value = null
  if (props.archived) return
  try {
    const { items: nextItems } = await reorderSequenceItems(props.sequenceId, fromIndex, toIndex)
    applySeqStateFromAgent({
      name: seqState.value?.name || '',
      description: seqState.value?.description || '',
      items: nextItems,
    })
    itemVersion.value++
    emit('changed', { items: nextItems })
  } catch (e) {
    console.warn('[SequenceItemsList] reorder failed', props.sequenceId, e)
  }
}

watch(() => props.version, () => {
  reloadSequenceState()
})

watch(items, (ids) => {
  if (ids.length) {
    void Promise.allSettled(ids.map(id => loadItemMeta(id)))
  }
}, { immediate: true })

onMounted(() => {
  reloadSequenceState()
})

defineExpose({ reload: reloadSequenceState, items })
</script>

<style scoped>
.sil-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sil--comfortable .sil-items {
  gap: 8px;
}

.sil-item {
  background: #f1f5f9;
  border-radius: 6px;
  padding: 10px 12px;
  cursor: default;
  transition: box-shadow 120ms, background 120ms;
}

.sil--comfortable .sil-item {
  padding: 12px 14px;
  border-radius: 8px;
}

.sil-item--active {
  background: #eff6ff;
  outline: 1px solid #bfdbfe;
}

.sil-item-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sil-item-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  padding: 3px 4px;
  background: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  line-height: 16px;
}

.sil-item-type {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  padding: 3px 4px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}

.sil-item-type-item {
  background: #f0fdf4;
  color: #16a34a;
}

.sil-item-type-seq {
  background: #fef9c3;
  color: #a16207;
}

.sil-item-grip {
  color: #94a3b8;
  cursor: grab;
  flex-shrink: 0;
}

.sil-item-grip:hover {
  color: #64748b;
}

.sil-item-end {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.sil-item-delete {
  border: none;
  background: none;
  color: #dc2626;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 17px;
  flex-shrink: 0;
  opacity: 0.8;
}

.sil-item-delete:hover {
  opacity: 1;
}

.sil-item-dragging {
  opacity: 0.4;
}

.sil-item-drop-above {
  box-shadow: 0 -2px 0 0 #2563eb;
}

.sil-item-drop-below {
  box-shadow: 0 2px 0 0 #2563eb;
}

.sil-item-title {
  font-size: 12px;
  font-weight: 500;
  color: #020617;
  margin-top: 4px;
  line-height: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sil--comfortable .sil-item-title {
  font-size: 13px;
}

.sil-item-desc {
  font-size: 12px;
  font-weight: 400;
  color: #64748b;
  margin: 4px 0 0;
  line-height: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sil-empty {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  padding: 12px 0 4px;
}

.sil--comfortable .sil-empty {
  padding: 32px 16px;
  font-size: 14px;
}
</style>