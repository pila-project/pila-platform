<template>
  <div class="search-filter">
    <div class="search-filter-input-wrapper">
      <LucideIcon name="search" :size="14" class="search-filter-icon" />
      <input
        type="text"
        :value="modelValue"
        :placeholder="placeholder || 'Search...'"
        class="search-filter-input input"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    </div>
    <div v-if="type !== 'search-only' && filters.length" class="search-filter-chips">
      <button
        v-for="filter in filters"
        :key="filter.key"
        class="filter-chip-btn"
        :class="{ 'filter-chip-active': activeFilters[filter.key] }"
        @click="toggleFilter(filter)"
      >
        {{ filter.label }}
        <span v-if="activeFilters[filter.key]" class="filter-chip-value">
          {{ getFilterDisplay(filter) }}
        </span>
        <LucideIcon name="chevron-down" :size="10" class="chevron" />
      </button>
    </div>
  </div>
</template>

<script setup>
import LucideIcon from './LucideIcon.vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  filters: {
    type: Array,
    default: () => [],
    // Each filter: { key: string, label: string, options: Array }
  },
  activeFilters: {
    type: Object,
    default: () => ({}),
  },
  type: {
    type: String,
    default: 'full',
    validator: v => ['full', 'simple', 'search-only'].includes(v),
  },
  placeholder: String,
})

const emit = defineEmits(['update:modelValue', 'update:activeFilters'])

function toggleFilter(filter) {
  const newFilters = { ...props.activeFilters }
  if (newFilters[filter.key]) {
    delete newFilters[filter.key]
  } else {
    newFilters[filter.key] = filter.options?.[0]?.value || true
  }
  emit('update:activeFilters', newFilters)
}

function getFilterDisplay(filter) {
  const val = props.activeFilters[filter.key]
  if (!val || val === true) return ''
  const opt = filter.options?.find(o => o.value === val)
  return opt ? opt.label : val
}
</script>
