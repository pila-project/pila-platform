<template>
  <Teleport to="body">
    <div class="drawer-overlay" @click.self="$emit('close')">
      <div class="drawer-panel">
        <!-- Header -->
        <div class="drawer-header">
          <h3 class="drawer-title">{{ t('property-filter') }}</h3>
          <button v-if="hasActiveFilters" class="drawer-reset" @click="resetAll">{{ t('reset-all') }}</button>
        </div>

        <!-- Filter sections -->
        <div class="drawer-body">
          <div
            v-for="filter in filters"
            :key="filter.key"
            class="filter-section"
          >
            <button class="filter-section-header" @click="toggleSection(filter.key)">
              <span class="filter-section-title">{{ filter.label }}</span>
              <i :class="openSections.has(filter.key) ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="text-xs text-slate-400" />
            </button>
            <div v-if="openSections.has(filter.key)" class="filter-section-body">
              <label
                v-for="opt in filter.options"
                :key="opt.value"
                class="filter-section-option"
              >
                <input
                  type="checkbox"
                  :checked="isSelected(filter.key, opt.value)"
                  class="filter-section-checkbox"
                  @change="toggle(filter.key, opt.value)"
                />
                <span>{{ opt.label }}</span>
              </label>
              <div v-if="!filter.options.length" class="text-xs text-slate-400 py-2 px-1">
                {{ t('no-options-available') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const props = defineProps({
  filters: { type: Array, required: true },
  activeFilters: { type: Object, required: true },
})

const emit = defineEmits(['close', 'update:filter', 'reset'])

const openSections = reactive(new Set())

// Open first section by default
if (props.filters.length) {
  openSections.add(props.filters[0].key)
}

const hasActiveFilters = computed(() => {
  return Object.values(props.activeFilters).some(v => v && v.length > 0)
})

function toggleSection(key) {
  if (openSections.has(key)) openSections.delete(key)
  else openSections.add(key)
}

function isSelected(key, value) {
  return (props.activeFilters[key] || []).includes(value)
}

function toggle(key, value) {
  const current = [...(props.activeFilters[key] || [])]
  const idx = current.indexOf(value)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(value)
  emit('update:filter', key, current)
}

function resetAll() {
  emit('reset')
}
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.3);
}

.drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  max-width: 85vw;
  background: white;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}
.drawer-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}
.drawer-reset {
  border: none;
  background: none;
  font-size: 13px;
  font-weight: 500;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
}
.drawer-reset:hover {
  text-decoration: underline;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.filter-section {
  border-bottom: 1px solid #f1f5f9;
}

.filter-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}
.filter-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.filter-section-body {
  padding: 0 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.filter-section-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 14px;
  color: #334155;
  cursor: pointer;
}

.filter-section-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  accent-color: #2563eb;
  cursor: pointer;
  flex-shrink: 0;
}
</style>
