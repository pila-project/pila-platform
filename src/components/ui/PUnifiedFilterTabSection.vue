<template>
  <div class="ufts">
    <!-- Section header -->
    <button class="ufts-header" @click="toggleExpand">
      <LucideIcon v-if="icon" :name="icon" :size="14" class="ufts-header-icon" />
      <span class="ufts-header-label">{{ label }}</span>
      <!-- Mini chips when collapsed -->
      <div v-if="!isExpanded && modelValue.length" class="ufts-mini-chips">
        <span
          v-for="val in modelValue"
          :key="val"
          class="ufts-mini-chip"
        >
          {{ labelFor(val) }}
          <button class="ufts-mini-chip-remove" @click.stop="removeValue(val)">
            <LucideIcon name="x" :size="8" />
          </button>
        </span>
      </div>
      <LucideIcon
        :name="isExpanded ? 'chevron-up' : 'chevron-down'"
        :size="12"
        class="ufts-header-chevron"
      />
    </button>

    <!-- Expanded body -->
    <div v-if="isExpanded" class="ufts-body">
      <!-- Tabs -->
      <div class="ufts-tabs-wrapper">
        <PTabs
          :modelValue="localActiveTab"
          :tabs="tabs"
          @update:modelValue="onTabChange"
        />
      </div>

      <!-- Search input -->
      <div class="ufts-search">
        <LucideIcon name="search" :size="12" class="ufts-search-icon" />
        <input
          ref="tabSearchRef"
          v-model="internalQuery"
          type="text"
          placeholder="Search"
          class="ufts-search-input"
        />
      </div>

      <!-- Options list -->
      <div class="ufts-options">
        <label
          v-for="opt in filteredOptions"
          :key="opt.value"
          class="ufts-option"
        >
          <input
            type="checkbox"
            :checked="modelValue.includes(opt.value)"
            class="ufts-option-checkbox"
            @change="toggle(opt.value)"
          />
          <span class="ufts-option-label">{{ opt.label }}</span>
        </label>
        <div v-if="!filteredOptions.length" class="ufts-empty">
          No options found
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import LucideIcon from './LucideIcon.vue'
import PTabs from './PTabs.vue'

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  icon: { type: String, default: null },
  tabs: { type: Array, required: true },
  options: { type: Object, default: () => ({}) },
  modelValue: { type: Array, default: () => [] },
  activeTab: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'update:activeTab'])

const { registerSection, unregisterSection, expandedSection, setExpanded } = inject('unifiedFilter')

const internalQuery = ref('')
const tabSearchRef = ref(null)
const localActiveTab = computed(() => props.activeTab || (props.tabs[0]?.key ?? ''))

const isExpanded = computed(() => expandedSection.value === props.id)

// Get options for the active tab
const currentTabOptions = computed(() => {
  const tabKey = localActiveTab.value
  if (tabKey === 'all' || !tabKey) {
    // Merge all tab options
    const all = []
    const seen = new Set()
    for (const key of Object.keys(props.options)) {
      for (const opt of (props.options[key] || [])) {
        if (!seen.has(opt.value)) {
          seen.add(opt.value)
          all.push(opt)
        }
      }
    }
    return all
  }
  return props.options[tabKey] || []
})

const filteredOptions = computed(() => {
  if (!internalQuery.value) return currentTabOptions.value
  const q = internalQuery.value.toLowerCase()
  return currentTabOptions.value.filter(o => o.label.toLowerCase().includes(q))
})

function toggleExpand() {
  setExpanded(props.id)
}

function onTabChange(key) {
  emit('update:activeTab', key)
  internalQuery.value = ''
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

function labelFor(value) {
  for (const key of Object.keys(props.options)) {
    const opt = (props.options[key] || []).find(o => o.value === value)
    if (opt) return opt.label
  }
  return value
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
  if (val) {
    internalQuery.value = ''
    await nextTick()
    tabSearchRef.value?.focus()
  }
})
</script>

<style scoped>
.ufts {
  border-bottom: 1px solid #f1f5f9;
}

.ufts:last-child {
  border-bottom: none;
}

.ufts-header {
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

.ufts-header:hover {
  background: #f8fafc;
}

.ufts-header-icon {
  color: #64748b;
  flex-shrink: 0;
}

.ufts-header-label {
  white-space: nowrap;
  flex-shrink: 0;
}

.ufts-header-chevron {
  color: #94a3b8;
  flex-shrink: 0;
  margin-left: auto;
}

.ufts-mini-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.ufts-mini-chip {
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

.ufts-mini-chip-remove {
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

.ufts-mini-chip-remove:hover {
  background: #dbeafe;
}

.ufts-body {
  padding: 4px 14px 12px;
}

.ufts-tabs-wrapper {
  margin-bottom: 8px;
}

.ufts-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.ufts-search-icon {
  color: #94a3b8;
  flex-shrink: 0;
}

.ufts-search-input {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  color: #334155;
  outline: none;
  background: white;
}

.ufts-search-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.ufts-search-input::placeholder {
  color: #94a3b8;
}

.ufts-options {
  max-height: 180px;
  overflow-y: auto;
}

.ufts-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 6px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 100ms;
}

.ufts-option:hover {
  background: #f8fafc;
}

.ufts-option-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1.5px solid #cbd5e1;
  cursor: pointer;
  accent-color: #2563eb;
  flex-shrink: 0;
}

.ufts-option-label {
  flex: 1;
  font-size: 13px;
  color: #334155;
}

.ufts-empty {
  padding: 12px 0;
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
}
</style>
