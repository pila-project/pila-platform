<template>
  <div
    class="list-row"
    :class="{ 'list-row-checked': checked }"
    @click="$emit('click')"
  >
    <!-- Checkbox -->
    <input
      type="checkbox"
      :checked="checked"
      class="list-checkbox"
      @click.stop
      @change="$emit('toggle-select')"
    />

    <!-- Thumbnail -->
    <div class="list-thumb">
      <img v-if="image" :src="image" />
      <i v-else class="fa-solid fa-file-lines text-slate-300" />
    </div>

    <!-- Badge -->
    <PBadge :variant="isSequence ? 'warning' : 'info'" class="list-badge">
      {{ isSequence ? 'Sequence' : 'Item' }}
    </PBadge>

    <!-- Title + description -->
    <div class="list-content">
      <span class="list-title">
        <NameOrTranslatedNameFromItemId :itemId="id" />
      </span>
      <span class="list-desc">{{ description || '' }}</span>
    </div>

    <!-- Source badge -->
    <span v-if="source === 'mine'" class="source-pill source-mine">My content</span>
    <span v-else class="source-pill source-pila">PILA content</span>

    <!-- Actions -->
    <div class="list-actions">
      <PButton
        variant="secondary"
        size="sm"
        icon="fa-regular fa-eye"
        text="Preview"
        @click.stop="$emit('preview')"
      />
      <PButton
        variant="primary"
        size="sm"
        icon="fa-solid fa-plus"
        text="Add"
        @click.stop="$emit('add')"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import NameOrTranslatedNameFromItemId from './name-or-translated-name-from-item-id.vue'
import { getContentImage, getContentMetadata } from '@/utils/content-cache.js'
import { PButton, PBadge } from '@/components/ui/index.js'

const props = defineProps({
  id: { type: String, required: true },
  checked: Boolean,
  source: { type: String, default: 'pila' },
  description: String,
})

defineEmits(['click', 'toggle-select', 'preview', 'add'])

const image = ref(null)
const isSequence = ref(false)

onMounted(async () => {
  try {
    image.value = await getContentImage(props.id)
    const meta = await getContentMetadata(props.id)
    isSequence.value = meta.active_type === 'application/json;type=sequence'
  } catch {}
})
</script>

<style scoped>
.list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: white;
  cursor: pointer;
  transition: background 100ms;
}
.list-row:hover {
  background: #f8fafc;
}
.list-row-checked {
  background: #eff6ff;
}

.list-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1.5px solid #cbd5e1;
  cursor: pointer;
  accent-color: #10b981;
  flex-shrink: 0;
}

.list-thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.list-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.list-badge {
  flex-shrink: 0;
}

.list-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.list-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-desc {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
  white-space: nowrap;
}
.source-pila {
  background: #fef9c3;
  color: #a16207;
  border: 1px solid #ca8a04;
}
.source-mine {
  background: #eff6ff;
  color: #2563eb;
}

.list-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .list-badge,
  .source-pill,
  .list-desc {
    display: none;
  }
  .list-row {
    gap: 8px;
    padding: 8px 12px;
  }
}
</style>
