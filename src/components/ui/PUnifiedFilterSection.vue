<template>
  <div class="ufs">
    <!-- Section header -->
    <button class="ufs-header" @click="toggleExpand">
      <LucideIcon v-if="icon" :name="icon" :size="14" class="ufs-header-icon" />
      <span class="ufs-header-label">{{ label }}</span>
      <LucideIcon
        :name="isExpanded ? 'chevron-up' : 'chevron-down'"
        :size="12"
        class="ufs-header-chevron"
      />
    </button>

    <!-- Expanded body -->
    <div v-if="isExpanded" class="ufs-body">
      <!-- Internal search -->
      <div v-if="searchable" class="ufs-search">
        <LucideIcon name="search" :size="12" class="ufs-search-icon" />
        <input
          ref="sectionSearchRef"
          v-model="internalQuery"
          type="text"
          :placeholder="label"
          class="ufs-search-input"
        />
      </div>
      <!-- Options list -->
      <div class="ufs-options">
        <label
          v-for="opt in filteredOptions"
          :key="opt.value"
          class="ufs-option"
        >
          <PCheckbox
            :modelValue="modelValue.includes(opt.value)"
            size="sm"
            @update:modelValue="() => toggle(opt.value)"
            inputClass="ufs-option-checkbox"
          />
          <span class="ufs-option-label" v-html="highlightMatch(opt.label, internalQuery)"></span>
          <span v-if="opt.count != null" class="ufs-option-count">{{ opt.count }}</span>
        </label>
        <div v-if="!filteredOptions.length" class="ufs-empty">
          No options found
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import LucideIcon from './LucideIcon.vue'
import { PCheckbox } from './index.js'

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  icon: { type: String, default: null },
  options: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
  searchable: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const { registerSection, unregisterSection, expandedSection, setExpanded } = inject('unifiedFilter')

const internalQuery = ref('')
const sectionSearchRef = ref(null)

const isExpanded = computed(() => expandedSection.value === props.id)

const filteredOptions = computed(() => {
  if (!internalQuery.value) return props.options
  const q = internalQuery.value.toLowerCase()
  return props.options.filter(o => o.label.toLowerCase().includes(q))
})

function toggleExpand() {
  setExpanded(props.id)
}

function toggle(value) {
  const current = [...props.modelValue]
  const idx = current.indexOf(value)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(value)
  emit('update:modelValue', current)
}

function removeValue(value) {
  emit('update:modelValue', props.modelValue.filter(v => v !== value))
}

function highlightMatch(text, query) {
  if (!query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>')
}

function labelFor(value) {
  const opt = props.options.find(o => o.value === value)
  return opt ? opt.label : value
}

// Register with parent
const selectedLabels = computed(() =>
  props.modelValue.map(val => ({
    valueLabel: labelFor(val),
    remove: () => removeValue(val),
  }))
)

onMounted(() => {
  registerSection(props.id, {
    label: props.label,
    icon: props.icon,
    selectedLabels,
    clearFn: () => emit('update:modelValue', []),
  })
})

onBeforeUnmount(() => {
  unregisterSection(props.id)
})

// Focus search when expanded
watch(isExpanded, async (val) => {
  if (val && props.searchable) {
    internalQuery.value = ''
    await nextTick()
    sectionSearchRef.value?.focus()
  }
})
</script>

<style scoped>
.ufs {
  border-bottom: 1px solid #f1f5f9;
}

.ufs:last-child {
  border-bottom: none;
}

.ufs-header {
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

.ufs-header:hover {
  background: #f8fafc;
}

.ufs-header-icon {
  color: #64748b;
  flex-shrink: 0;
}

.ufs-header-label {
  white-space: nowrap;
  flex-shrink: 0;
}

.ufs-header-chevron {
  color: #94a3b8;
  flex-shrink: 0;
  margin-left: auto;
}

.ufs-body {
  padding: 0 0 8px;
}

.ufs-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px 8px;
}

.ufs-search-icon {
  color: #94a3b8;
  flex-shrink: 0;
}

.ufs-search-input {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  color: #334155;
  outline: none;
  background: white;
}

.ufs-search-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.ufs-search-input::placeholder {
  color: #94a3b8;
}

.ufs-options {
  max-height: 180px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 4px;
}

.ufs-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  min-width: 0;
  cursor: pointer;
  border-radius: 4px;
  transition: background 100ms;
}

.ufs-option:hover {
  background: #f8fafc;
}

.ufs-option-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1.5px solid #cbd5e1;
  cursor: pointer;
  accent-color: #2563eb;
  flex-shrink: 0;
}

.ufs-option-label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ufs-option-label :deep(mark) {
  background: #fef08a;
  border-radius: 2px;
  padding: 0 1px;
  color: inherit;
}

.ufs-option-count {
  font-size: 12px;
  color: #94a3b8;
  flex-shrink: 0;
}

.ufs-empty {
  padding: 12px 14px;
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
}
</style>
