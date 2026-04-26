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
        <h3 class="sc-title">{{ seqState?.name || t('untitled') }}</h3>
        <p class="sc-desc">{{ seqState?.description || '' }}</p>
        <span class="sc-modified">{{ t('last-modified') }} - {{ lastModifiedDate }}</span>
      </div>
      <PMenu align-right>
        <template #activator="{ props }">
          <button class="sc-menu-trigger" @click.stop="props.onClick">
            <i class="fa-solid fa-ellipsis-vertical" />
          </button>
        </template>
        <PMenuItem :title="t('view-sequence-content')" prepend-icon="fa-solid fa-list" @click="expanded = true" />
        <PMenuItem :title="t('edit-sequence-details')" prepend-icon="fa-solid fa-pen" @click="$emit('edit')" />
        <PMenuItem :title="t('preview-sequence')" prepend-icon="fa-regular fa-eye" @click="$emit('preview')" />
        <PMenuItem :title="t('delete-sequence')" prepend-icon="fa-solid fa-trash" danger @click="$emit('delete')" />
      </PMenu>
    </div>

    <!-- Footer: expand/collapse + item list -->
    <div class="sc-footer" :class="{ 'sc-footer-expanded': expanded }">
      <button class="sc-expand-btn" @click.stop="expanded = !expanded">
        {{ t('show-items') }} ({{ itemCount }})
        <i :class="expanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="sc-chevron" />
      </button>

      <div v-if="expanded && items.length" class="sc-items">
        <div v-for="(itemId, i) in items" :key="itemId" class="sc-item-card">
          <!-- Row 1: number + type badge + trash -->
          <div class="sc-item-top">
            <span class="sc-item-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <span
              class="sc-item-type"
              :class="itemMeta[itemId]?.isSequence ? 'sc-item-type-seq' : 'sc-item-type-item'"
            >
              {{ itemMeta[itemId]?.isSequence ? t('sequence') : t('item') }}
            </span>
            <button class="sc-item-delete" @click.stop="removeItem(i)">
              <i class="fa-solid fa-trash" />
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { PMenu, PMenuItem } from '@/components/ui/index.js'
import NameOrTranslatedNameFromItemId from './name-or-translated-name-from-item-id.vue'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const props = defineProps({
  id: { type: String, required: true },
  active: Boolean,
  isNewest: Boolean,
})

const emit = defineEmits(['select', 'edit', 'delete', 'preview', 'drop-item'])

const isDragOver = ref(false)

function onDrop(e) {
  isDragOver.value = false
  const itemId = e.dataTransfer.getData('text')
  if (itemId) {
    emit('drop-item', itemId)
  }
}

const seqState = ref(null)
const metadata = ref(null)
const expanded = ref(false)
const isNew = ref(false)
const itemMeta = reactive({})

const items = computed(() => seqState.value?.items || [])
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
      Agent.metadata(itemId),
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
  if (seqState.value?.items) {
    seqState.value.items.splice(index, 1)
  }
}

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
  border-radius: 8px;
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
  gap: 8px;
  padding: 12px 12px 10px;
}

.sc-header-content {
  flex: 1;
  min-width: 0;
}

.sc-new-badge {
  display: inline-block;
  padding: 1px 8px;
  border: 1px solid #16a34a;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #16a34a;
  margin-bottom: 4px;
}

.sc-title {
  font-size: 12px;
  font-weight: 500;
  color: #020617;
  line-height: 1.4;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sc-desc {
  font-size: 12px;
  font-weight: 400;
  color: #64748b;
  line-height: 1.5;
  margin: 4px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sc-modified {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  color: #64748b;
}

.sc-menu-trigger {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 12px;
}
.sc-menu-trigger:hover {
  background: #f1f5f9;
  color: #64748b;
}

/* ── Footer ── */
.sc-footer {
  padding: 8px 12px 10px;
  border-top: 1px solid #e2e8f0;
}

.sc-footer-expanded {
  background: #eff6ff;
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
}
.sc-expand-btn:hover {
  text-decoration: underline;
}

.sc-chevron {
  font-size: 10px;
}

/* ── Items list ── */
.sc-items {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sc-item-card {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px 12px;
}

.sc-item-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sc-item-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 24px;
  padding: 0 6px;
  background: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}

/* Type badges */
.sc-item-type {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.sc-item-type-item {
  background: #f0fdf4;
  color: #16a34a;
}
.sc-item-type-seq {
  background: #fef9c3;
  color: #a16207;
}

.sc-item-delete {
  margin-left: auto;
  border: none;
  background: none;
  color: #dc2626;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}
.sc-item-delete:hover {
  background: #fef2f2;
}

.sc-item-title {
  font-size: 12px;
  font-weight: 500;
  color: #020617;
  margin-top: 8px;
  line-height: 1.4;
}

.sc-item-desc {
  font-size: 12px;
  font-weight: 400;
  color: #64748b;
  margin: 4px 0 0;
  line-height: 1.5;
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
