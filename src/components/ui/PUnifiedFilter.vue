<template>
  <div class="unified-filter" ref="containerRef">
    <!-- Search bar -->
    <div class="unified-filter-bar" :class="{ 'unified-filter-bar-focused': isDropdownOpen }" @click="openDropdown">
      <LucideIcon name="search" :size="14" class="unified-filter-search-icon" />
      <div class="unified-filter-bar-content">
        <!-- Inline chips for active filters -->
        <span
          v-for="chip in allChips"
          :key="chip.id"
          class="unified-chip"
        >
          <span class="unified-chip-label">{{ chip.sectionLabel }}</span>
          <span class="unified-chip-eq">=</span>
          <span class="unified-chip-value">{{ chip.valueLabel }}</span>
          <button class="unified-chip-remove" @click.stop="chip.remove()">
            <LucideIcon name="x" :size="10" />
          </button>
        </span>
        <!-- Search input -->
        <input
          ref="searchInputRef"
          v-model="localSearchQuery"
          :placeholder="allChips.length ? '' : placeholder"
          class="unified-filter-input"
          @focus="openDropdown"
          @keydown.escape="closeDropdown"
        />
      </div>
      <!-- Clear all button -->
      <button
        v-if="allChips.length || localSearchQuery"
        class="unified-filter-clear-btn"
        @click.stop="clearAll"
      >
        <LucideIcon name="x" :size="14" />
      </button>
    </div>

    <!-- Dropdown panel (only renders when filter sections exist) -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-show="isDropdownOpen && hasSections" class="unified-filter-dropdown">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, provide, reactive, shallowReactive, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import LucideIcon from './LucideIcon.vue'
import { useDebounce } from '@/utils/useDebounce'

const props = defineProps({
  searchQuery: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Search...',
  },
  debounce: {
    type: Number,
    default: 500,
  },
})

const emit = defineEmits(['update:searchQuery'])

const containerRef = ref(null)
const searchInputRef = ref(null)
const isDropdownOpen = ref(false)
const expandedSection = ref(null)
const localSearchQuery = ref(props.searchQuery)

// Debounce the search query
const { debounced: debouncedQuery, flush } = useDebounce(localSearchQuery, props.debounce)

watch(debouncedQuery, (val) => {
  emit('update:searchQuery', val)
})

// Sync from parent if changed externally
watch(() => props.searchQuery, (val) => {
  if (val !== localSearchQuery.value) {
    localSearchQuery.value = val
  }
})

// Section registry
const sections = shallowReactive(new Map())

const hasSections = computed(() => sections.size > 0)

function registerSection(id, meta) {
  sections.set(id, meta)
}

function unregisterSection(id) {
  sections.delete(id)
}

function setExpanded(id) {
  expandedSection.value = expandedSection.value === id ? null : id
}

// Build chips from all registered sections
const allChips = computed(() => {
  const chips = []
  for (const [id, meta] of sections) {
    if (meta.selectedLabels && meta.selectedLabels.value) {
      for (const item of meta.selectedLabels.value) {
        chips.push({
          id: `${id}-${item.valueLabel}`,
          sectionLabel: meta.label,
          valueLabel: item.valueLabel,
          remove: item.remove,
        })
      }
    }
  }
  return chips
})

function openDropdown() {
  if (hasSections.value) {
    isDropdownOpen.value = true
  }
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

function closeDropdown() {
  isDropdownOpen.value = false
  expandedSection.value = null
}

function clearAll() {
  localSearchQuery.value = ''
  flush()
  emit('update:searchQuery', '')
  for (const [, meta] of sections) {
    if (meta.clearFn) meta.clearFn()
  }
}

function handleClickOutside(e) {
  if (containerRef.value && !containerRef.value.contains(e.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Provide to child sections
provide('unifiedFilter', {
  registerSection,
  unregisterSection,
  expandedSection,
  setExpanded,
  isDropdownOpen,
})
</script>

<style scoped>
.unified-filter {
  position: relative;
  width: 100%;
}

.unified-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: text;
  transition: all 150ms;
}

.unified-filter-bar:hover {
  border-color: #cbd5e1;
}

.unified-filter-bar-focused {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.unified-filter-search-icon {
  color: #94a3b8;
  flex-shrink: 0;
}

.unified-filter-bar-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.unified-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  height: 24px;
}

.unified-chip-label { color: #64748b; }
.unified-chip-eq { color: #94a3b8; }
.unified-chip-value { color: #2563eb; }

.unified-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  border-radius: 2px;
  flex-shrink: 0;
}

.unified-chip-remove:hover {
  color: #64748b;
  background: #e2e8f0;
}

.unified-filter-input {
  flex: 1;
  min-width: 80px;
  border: none;
  outline: none;
  font-size: 13px;
  color: #334155;
  background: transparent;
  padding: 2px 0;
}

.unified-filter-input::placeholder {
  color: #94a3b8;
}

.unified-filter-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  border-radius: 4px;
  flex-shrink: 0;
}

.unified-filter-clear-btn:hover {
  color: #64748b;
  background: #f1f5f9;
}

.unified-filter-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-height: 60vh;
  overflow-y: auto;
}
</style>
