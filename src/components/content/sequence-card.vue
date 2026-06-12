<template>
  <div
    v-if="isRenderable"
    class="sc"
    :class="{ 'sc-archived': archived, 'sc-dragover': isDragOver && !archived }"
    @dragover.prevent="!archived && (isDragOver = true)"
    @dragleave="!archived && (isDragOver = false)"
    @drop.prevent.stop="onDrop"
  >
    <!-- Header -->
    <div class="sc-header">
      <div class="sc-header-content">
        <div v-if="isNew && !archived" class="sc-new-badge">{{ t('new') }}</div>
        <div class="sc-title-row">
          <h3 class="sc-title">{{ seqState?.name || t('untitled') }}</h3>
          <span v-if="archived" class="sc-archived-badge">{{ t('archived') }}</span>
          <div class="sc-title-actions">
            <button
              v-if="!archived"
              type="button"
              class="sc-heart-btn"
              :class="{ 'sc-heart-btn--active': favorited }"
              :aria-pressed="favorited"
              :aria-label="favorited ? (t('remove-from-favorites') || 'Remove from favorites') : (t('add-to-favorites') || 'Add to favorites')"
              @click.stop="$emit('toggle-favorite')"
            >
              <LucideIcon name="heart" :size="14" />
            </button>
            <PMenu align-right>
            <template #activator="{ props }">
              <PButton variant="icon" size="xsm" icon="lucide:ellipsis-vertical" iconOnly @click.stop="props.onClick" />
            </template>
            <template v-if="!archived">
              <PMenuItem :title="t('view-sequence-content')" prepend-icon="lucide:list" @click="$emit('view-content')" />
              <PMenuItem :title="t('edit-sequence-details')" prepend-icon="lucide:pencil" @click="$emit('edit')" />
              <PMenuItem :title="t('preview-sequence')" prepend-icon="lucide:eye" @click="$emit('preview')" />
              <PMenuItem
                :title="t('archive-sequence')"
                prepend-icon="lucide:archive"
                @click="$emit('archive')"
              />
            </template>
            <PMenuItem
              v-else
              :title="t('restore') || 'Restore'"
              prepend-icon="lucide:archive-restore"
              @click="$emit('restore')"
            />
            </PMenu>
          </div>
        </div>
        <p class="sc-desc">{{ seqState?.description || '' }}</p>
        <span class="sc-modified">{{ t('last-modified') }} - {{ lastModifiedDate }}</span>
      </div>
    </div>

    <!-- Footer: expand/collapse + item list -->
    <div
      class="sc-footer"
      :class="{ 'sc-footer-expanded': expanded }"
      @dragover.prevent="onFooterDragOver"
      @dragleave="onFooterDragLeave"
      @drop.prevent.stop="onFooterDrop"
    >
      <button v-if="!archived" class="sc-expand-btn" @click.stop="expanded = !expanded">
        {{ t('show-items') }} ({{ itemCount }})
        <LucideIcon :name="expanded ? 'chevron-up' : 'chevron-down'" :size="10" class="sc-chevron" />
      </button>
      <p v-else class="sc-archived-meta">{{ t('show-items') }} ({{ itemCount }})</p>

      <div v-if="!archived && expanded" class="sc-items-wrap">
        <SequenceItemsList
          :sequence-id="id"
          :archived="archived"
          :version="version"
          @changed="onListChanged"
          @drop-item="payload => { expanded = true; $emit('drop-item', payload) }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { PMenu, PMenuItem } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import PButton from '@/components/ui/PButton.vue'
import SequenceItemsList from './sequence-items-list.vue'
import {
  normalizeSequenceItems,
  isExternalExploreDrop,
  isValidSequenceAgentState,
} from '@/utils/sequence-items.js'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const props = defineProps({
  id: { type: String, required: true },
  archived: Boolean,
  favorited: Boolean,
  isNewest: Boolean,
  version: { type: Number, default: 0 },
})

const emit = defineEmits(['edit', 'archive', 'restore', 'preview', 'view-content', 'drop-item', 'toggle-favorite', 'items-changed'])

const isDragOver = ref(false)

function onDrop(e) {
  if (props.archived) return
  isDragOver.value = false
  if (!isExternalExploreDrop(e.dataTransfer, null)) return
  const itemId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text')
  emitExternalDrop(itemId)
}

function emitExternalDrop(itemId, index = -1) {
  if (!itemId) return
  expanded.value = true
  emit('drop-item', index >= 0 ? { itemId, index } : itemId)
}

function onFooterDragOver(e) {
  if (isExternalExploreDrop(e.dataTransfer, null)) {
    e.dataTransfer.dropEffect = 'copy'
    isDragOver.value = true
  }
}

function onFooterDragLeave() {
  isDragOver.value = false
}

function onFooterDrop(e) {
  onDrop(e)
}

function applySeqStateFromAgent(state) {
  if (!isValidSequenceAgentState(state)) {
    isRenderable.value = false
    seqState.value = null
    return
  }
  isRenderable.value = true
  seqState.value = {
    name: state?.name || '',
    description: state?.description || '',
    items: normalizeSequenceItems(state.items),
  }
}

const seqState = ref(null)
const metadata = ref(null)
const expanded = ref(false)
const isNew = ref(false)
const isRenderable = ref(false)

const itemCount = computed(() => seqState.value?.items?.length || 0)

const lastModifiedDate = computed(() => {
  if (!metadata.value?.updated) return '—'
  return new Date(metadata.value.updated).toLocaleDateString('en-CA')
})

function onListChanged({ items }) {
  if (seqState.value) {
    seqState.value = { ...seqState.value, items: items || [] }
  }
  if (items?.length) isNew.value = false
  emit('items-changed')
}

async function reloadSequenceState() {
  try {
    const [state, meta] = await Promise.all([
      Agent.state(props.id),
      Agent.metadata(props.id),
    ])
    applySeqStateFromAgent(state)
    metadata.value = meta
    if (seqState.value.items.length) isNew.value = false
  } catch (e) {
    isRenderable.value = false
    console.warn('[SequenceCard] failed to refresh', props.id, e)
  }
}

watch(() => props.version, () => {
  reloadSequenceState()
})

onMounted(async () => {
  try {
    const [state, meta] = await Promise.all([
      Agent.state(props.id),
      Agent.metadata(props.id),
    ])
    applySeqStateFromAgent(state)
    metadata.value = meta

    if (props.isNewest && !seqState.value.items.length) {
      isNew.value = true
    }
  } catch (e) {
    isRenderable.value = false
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
  transition: all 150ms;
}
.sc:hover {
  border-color: #cbd5e1;
}
.sc-archived {
  opacity: 0.85;
  background: #fffbeb;
  border-color: #fde68a;
  cursor: default;
}
.sc-archived:hover {
  border-color: #fde68a;
}
.sc-archived-badge {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 9999px;
  background: #fff7ed;
  border: 1px solid #ea580c;
  color: #ea580c;
  font-size: 10px;
  font-weight: 500;
  line-height: 14px;
}
.sc-archived-meta {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  line-height: 16px;
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

.sc-title-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.sc-heart-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: none;
  color: #94a3b8;
  cursor: pointer;
  transition: color 150ms;
}

.sc-heart-btn:hover {
  color: #ef4444;
}

.sc-heart-btn:not(.sc-heart-btn--active) :deep(svg) {
  fill: none;
}

.sc-heart-btn--active {
  color: #ef4444;
}

.sc-heart-btn--active :deep(svg) {
  fill: currentColor;
  stroke: currentColor;
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

.sc-items-wrap {
  margin-top: 12px;
}
</style>
