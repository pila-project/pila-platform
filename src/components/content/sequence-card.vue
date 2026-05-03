<template>
  <div
    class="sc"
    :class="{ 'sc-active': active, 'sc-dragover': isDragOver }"
    @click="$emit('select')"
    @dragover.prevent="isDragOver = true"
    @dragleave="isDragOver = false"
    @drop.prevent="onDrop"
  >
    <!-- Header -->
    <div class="sc-header">
      <div class="sc-header-content">
        <div v-if="isNew" class="sc-new-badge">{{ t('new') }}</div>
        <div class="sc-title-row">
          <h3 class="sc-title">{{ seqState?.name || t('untitled') }}</h3>
          <PMenu align-right>
            <template #activator="{ props }">
              <button class="sc-menu-trigger" @click.stop="props.onClick">
                <LucideIcon name="ellipsis-vertical" :size="12" />
              </button>
            </template>
            <PMenuItem :title="t('view-sequence-content')" prepend-icon="lucide:list" @click="expanded = true" />
            <PMenuItem :title="t('edit-sequence-details')" prepend-icon="lucide:pencil" @click="$emit('edit')" />
            <PMenuItem :title="t('preview-sequence')" prepend-icon="lucide:eye" @click="$emit('preview')" />
            <PMenuItem :title="t('delete-sequence')" prepend-icon="lucide:trash-2" danger @click="$emit('delete')" />
          </PMenu>
        </div>
        <p class="sc-desc">{{ seqState?.description || '' }}</p>
        <span class="sc-modified">{{ t('last-modified') }} - {{ lastModifiedDate }}</span>
      </div>
    </div>

    <!-- Footer: expand/collapse + item list -->
    <div class="sc-footer" :class="{ 'sc-footer-expanded': expanded }">
      <button class="sc-expand-btn" @click.stop="expanded = !expanded">
        {{ t('show-items') }} ({{ itemCount }})
        <LucideIcon :name="expanded ? 'chevron-up' : 'chevron-down'" :size="10" class="sc-chevron" />
      </button>

      <div v-if="expanded && items.length" class="sc-items">
        <div
          v-for="(itemId, i) in items"
          :key="itemId"
          class="sc-item-card"
          :class="{
            'sc-item-dragging': dragIndex === i,
            'sc-item-drop-above': dropTarget === i && dropTarget < dragIndex,
            'sc-item-drop-below': dropTarget === i && dropTarget > dragIndex,
          }"
          draggable="true"
          @dragstart.stop="onItemDragStart(i, $event)"
          @dragend="onItemDragEnd"
          @dragover.stop.prevent="onItemDragOver(i, $event)"
          @dragleave="onItemDragLeave"
          @drop.stop.prevent="onItemDrop(i)"
        >
          <!-- Row 1: drag handle + number + type badge + trash -->
          <div class="sc-item-top">
            <LucideIcon name="grip-vertical" :size="11" class="sc-item-grip" />
            <span class="sc-item-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <span
              class="sc-item-type"
              :class="itemMeta[itemId]?.isSequence ? 'sc-item-type-seq' : 'sc-item-type-item'"
            >
              {{ itemMeta[itemId]?.isSequence ? t('sequence') : t('item') }}
            </span>
            <button class="sc-item-delete" @click.stop="removeItem(i)">
              <LucideIcon name="trash-2" :size="13" />
            </button>
          </div>
          <!-- Row 2: title -->
          <div class="sc-item-title">
            <NameOrTranslatedNameFromItemId :itemId="itemId" />
          </div>
          <!-- Row 3: description -->
          <p v-if="itemMeta[itemId]?.description" class="sc-item-desc">
            {{ itemMeta[itemId].description }}
          </p>
        </div>
      </div>
      <div v-else-if="expanded" class="sc-empty">
        {{ t('no-items-yet') }}
      </div>
    </div>

    <!-- Delete item confirmation -->
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { PMenu, PMenuItem, PAlertDialog } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import NameOrTranslatedNameFromItemId from './name-or-translated-name-from-item-id.vue'
import { getContentMetadata } from '@/utils/content-cache.js'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const props = defineProps({
  id: { type: String, required: true },
  active: Boolean,
  isNewest: Boolean,
  version: { type: Number, default: 0 },
})

const emit = defineEmits(['select', 'edit', 'delete', 'preview', 'drop-item'])

const isDragOver = ref(false)

// ── Internal reorder drag state ──
const dragIndex = ref(null)
const dropTarget = ref(null)
const isInternalDrag = ref(false)

function onDrop(e) {
  isDragOver.value = false
  if (isInternalDrag.value) return // ignore internal reorder drops on the card itself
  const itemId = e.dataTransfer.getData('text')
  if (itemId) {
    emit('drop-item', itemId)
  }
}

function onItemDragStart(index, e) {
  dragIndex.value = index
  isInternalDrag.value = true
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/x-reorder', String(index))
}

function onItemDragEnd() {
  dragIndex.value = null
  dropTarget.value = null
  isInternalDrag.value = false
}

function onItemDragOver(index) {
  if (dragIndex.value === null || index === dragIndex.value) {
    dropTarget.value = null
    return
  }
  dropTarget.value = index
}

function onItemDragLeave() {
  dropTarget.value = null
}

async function onItemDrop(toIndex) {
  const fromIndex = dragIndex.value
  dropTarget.value = null
  if (fromIndex === null || fromIndex === toIndex || !seqState.value?.items) return

  const items = seqState.value.items
  const [moved] = items.splice(fromIndex, 1)
  items.splice(toIndex, 0, moved)
  await Agent.synced()
  itemVersion.value++
  dragIndex.value = null
  isInternalDrag.value = false
}

const seqState = ref(null)
const metadata = ref(null)
const expanded = ref(false)
const isNew = ref(false)
const itemMeta = reactive({})
const itemVersion = ref(0)
const itemToDelete = ref(null) // index of item pending delete confirmation

const items = computed(() => {
  itemVersion.value // dependency to force recompute
  return seqState.value?.items || []
})
const itemCount = computed(() => items.value.length)

const lastModifiedDate = computed(() => {
  if (!metadata.value?.updated) return '—'
  return new Date(metadata.value.updated).toLocaleDateString('en-CA')
})

async function loadItemMeta(itemId) {
  if (itemMeta[itemId]) return
  try {
    const [state, meta] = await Promise.all([
      Agent.state(itemId),
      getContentMetadata(itemId),
    ])
    itemMeta[itemId] = {
      description: state.description || '',
      isSequence: meta.active_type === 'application/json;type=sequence',
    }
  } catch {
    itemMeta[itemId] = { description: '', isSequence: false }
  }
}

function removeItem(index) {
  itemToDelete.value = index
}

async function confirmRemoveItem() {
  const index = itemToDelete.value
  itemToDelete.value = null
  if (index !== null && seqState.value?.items) {
    seqState.value.items.splice(index, 1)
    await Agent.synced()
    itemVersion.value++
  }
}

// When parent signals a version change, refresh items without remounting
watch(() => props.version, () => {
  itemVersion.value++
  if (expanded.value && items.value.length) {
    items.value.forEach(id => loadItemMeta(id))
  }
})

// Load item metadata when expanded or items change
watch(
  () => expanded.value && items.value,
  (val) => {
    if (val && items.value.length) {
      items.value.forEach(id => loadItemMeta(id))
    }
  },
  { immediate: true }
)

onMounted(async () => {
  try {
    const [state, meta] = await Promise.all([
      Agent.state(props.id),
      Agent.metadata(props.id),
    ])
    seqState.value = state || { name: '', description: '', items: [] }
    metadata.value = meta

    const hasNoItems = !state?.items || state.items.length === 0
    if (props.isNewest && hasNoItems) {
      isNew.value = true
    }
  } catch (e) {
    console.warn('[SequenceCard] failed to load', props.id, e)
  }
})
</script>

<style scoped>
/* ── Card container ── */
.sc {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 150ms;
}
.sc:hover {
  border-color: #cbd5e1;
}
.sc-active {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px #2563eb;
}
.sc-dragover {
  border-color: #10b981;
  background: #f0fdf4;
  box-shadow: 0 0 0 2px #10b981;
}

/* ── Header ── */
.sc-header {
  display: flex;
  align-items: flex-start;
  padding: 12px;
}

.sc-header-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sc-new-badge {
  display: inline-block;
  padding: 1px 8px;
  border: 1px solid #16a34a;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #16a34a;
  align-self: flex-start;
}

.sc-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4px;
}

.sc-title {
  font-size: 12px;
  font-weight: 500;
  color: #020617;
  line-height: 16px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.sc-desc {
  font-size: 12px;
  font-weight: 400;
  color: #64748b;
  line-height: 16px;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sc-modified {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  line-height: 16px;
}

.sc-menu-trigger {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 12px;
}
.sc-menu-trigger:hover {
  color: #64748b;
}

/* ── Footer ── */
.sc-footer {
  padding: 6px 12px;
  border-top: 1px solid #e2e8f0;
}

.sc-footer-expanded {
  padding-bottom: 12px;
}

.sc-expand-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  font-size: 12px;
  font-weight: 500;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  line-height: 16px;
}
.sc-expand-btn:hover {
  text-decoration: underline;
}

.sc-chevron {
  font-size: 10px;
}

/* ── Items list ── */
.sc-items {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sc-item-card {
  background: #f1f5f9;
  border-radius: 6px;
  padding: 10px 12px;
}

.sc-item-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sc-item-num {
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

/* Type badges */
.sc-item-type {
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
.sc-item-type-item {
  background: #f0fdf4;
  color: #16a34a;
}
.sc-item-type-seq {
  background: #fef9c3;
  color: #a16207;
}

.sc-item-grip {
  color: #94a3b8;
  font-size: 11px;
  cursor: grab;
  flex-shrink: 0;
}
.sc-item-grip:hover {
  color: #64748b;
}

.sc-item-delete {
  margin-left: auto;
  border: none;
  background: none;
  color: #dc2626;
  font-size: 13px;
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
.sc-item-delete:hover {
  opacity: 1;
}

/* Reorder drag states */
.sc-item-dragging {
  opacity: 0.4;
}
.sc-item-drop-above {
  box-shadow: 0 -2px 0 0 #2563eb;
}
.sc-item-drop-below {
  box-shadow: 0 2px 0 0 #2563eb;
}

.sc-item-title {
  font-size: 12px;
  font-weight: 500;
  color: #020617;
  margin-top: 4px;
  line-height: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sc-item-title :deep(span) {
  font-size: 12px !important;
}

.sc-item-desc {
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

.sc-empty {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  padding: 12px 0 4px;
}
</style>
