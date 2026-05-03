<template>
  <div class="ufds">
    <!-- Section header -->
    <button class="ufds-header" @click="toggleExpand">
      <LucideIcon :name="icon" :size="14" class="ufds-header-icon" />
      <span class="ufds-header-label">{{ label }}</span>
      <!-- Mini chip when date range is selected and collapsed -->
      <div v-if="!isExpanded && hasValue" class="ufds-mini-chips">
        <span class="ufds-mini-chip">
          {{ formattedRange }}
          <button class="ufds-mini-chip-remove" @click.stop="clearValue">
            <LucideIcon name="x" :size="8" />
          </button>
        </span>
      </div>
      <LucideIcon name="calendar-search" :size="14" class="ufds-header-calendar" />
    </button>

    <!-- Expanded body with date picker -->
    <div v-if="isExpanded" class="ufds-body">
      <PDatePicker
        :modelValue="modelValue"
        type="range"
        @update:modelValue="onDateChange"
      />
      <button
        v-if="hasValue"
        class="ufds-clear"
        @click="clearValue"
      >
        Clear dates
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, onBeforeUnmount } from 'vue'
import LucideIcon from './LucideIcon.vue'
import PDatePicker from './PDatePicker.vue'

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  icon: { type: String, default: 'calendar' },
  modelValue: { type: Array, default: null },
})

const emit = defineEmits(['update:modelValue'])

const { registerSection, unregisterSection, expandedSection, setExpanded } = inject('unifiedFilter')

const isExpanded = computed(() => expandedSection.value === props.id)

const hasValue = computed(() =>
  props.modelValue && props.modelValue[0] && props.modelValue[1]
)

const formattedRange = computed(() => {
  if (!hasValue.value) return ''
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(props.modelValue[0])} – ${fmt(props.modelValue[1])}`
})

function toggleExpand() {
  setExpanded(props.id)
}

function onDateChange(val) {
  emit('update:modelValue', val)
}

function clearValue() {
  emit('update:modelValue', null)
}

// Register with parent
const selectedLabels = computed(() => {
  if (!hasValue.value) return []
  return [{
    valueLabel: formattedRange.value,
    remove: clearValue,
  }]
})

onMounted(() => {
  registerSection(props.id, {
    label: props.label,
    icon: props.icon,
    selectedLabels,
    clearFn: clearValue,
  })
})

onBeforeUnmount(() => {
  unregisterSection(props.id)
})
</script>

<style scoped>
.ufds {
  border-bottom: 1px solid #f1f5f9;
}

.ufds:last-child {
  border-bottom: none;
}

.ufds-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  text-align: left;
  transition: background 100ms;
}

.ufds-header:hover {
  background: #f8fafc;
}

.ufds-header-icon {
  color: #64748b;
  flex-shrink: 0;
}

.ufds-header-label {
  white-space: nowrap;
  flex-shrink: 0;
}

.ufds-header-calendar {
  color: #2563eb;
  flex-shrink: 0;
  margin-left: auto;
}

.ufds-mini-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.ufds-mini-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  color: #2563eb;
  white-space: nowrap;
}

.ufds-mini-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  border: none;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  border-radius: 2px;
}

.ufds-mini-chip-remove:hover {
  background: #dbeafe;
}

.ufds-body {
  padding: 8px 14px 12px;
}

.ufds-clear {
  display: block;
  width: 100%;
  padding: 6px 0;
  margin-top: 8px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #2563eb;
  cursor: pointer;
  text-align: center;
}

.ufds-clear:hover {
  text-decoration: underline;
}
</style>
