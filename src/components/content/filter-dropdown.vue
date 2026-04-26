<template>
  <div class="filter-dropdown" ref="dropdownRef">
    <button
      class="filter-chip"
      :class="{ 'filter-chip-active': modelValue.length > 0 }"
      @click="isOpen = !isOpen"
    >
      <i class="fa-solid fa-plus filter-chip-icon" />
      {{ label }}
      <span v-if="modelValue.length" class="filter-chip-count">{{ modelValue.length }}</span>
      <i class="fa-solid fa-chevron-down filter-chip-chevron" />
    </button>

    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="isOpen" class="filter-panel">
        <!-- Search inside dropdown -->
        <div class="filter-search">
          <i class="fa-solid fa-magnifying-glass filter-search-icon" />
          <input
            ref="searchRef"
            v-model="query"
            type="text"
            :placeholder="label"
            class="filter-search-input"
          />
        </div>

        <!-- Options list -->
        <div class="filter-options">
          <label
            v-for="opt in filteredOptions"
            :key="opt.value"
            class="filter-option"
          >
            <input
              type="checkbox"
              :checked="modelValue.includes(opt.value)"
              class="filter-option-checkbox"
              @change="toggle(opt.value)"
            />
            <span class="filter-option-label">{{ opt.label }}</span>
            <span v-if="opt.count != null" class="filter-option-count">{{ opt.count }}</span>
          </label>
          <div v-if="!filteredOptions.length" class="filter-empty">
            {{ t('no-options-found') }}
          </div>
        </div>

        <!-- Clear link -->
        <button
          v-if="modelValue.length"
          class="filter-clear"
          @click="$emit('update:modelValue', [])"
        >
          {{ t('clear-filters') }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const props = defineProps({
  label: { type: String, required: true },
  options: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const query = ref('')
const dropdownRef = ref(null)
const searchRef = ref(null)

const filteredOptions = computed(() => {
  if (!query.value) return props.options
  const q = query.value.toLowerCase()
  return props.options.filter(o => o.label.toLowerCase().includes(q))
})

function toggle(value) {
  const current = [...props.modelValue]
  const idx = current.indexOf(value)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(value)
  emit('update:modelValue', current)
}

function closeOnClickOutside(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    isOpen.value = false
  }
}

watch(isOpen, async (open) => {
  if (open) {
    query.value = ''
    await nextTick()
    searchRef.value?.focus()
  }
})

onMounted(() => document.addEventListener('click', closeOnClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', closeOnClickOutside))
</script>

<style scoped>
.filter-dropdown {
  position: relative;
  display: inline-block;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: all 150ms;
  white-space: nowrap;
}
.filter-chip:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}
.filter-chip-active {
  background: #eff6ff;
  border-color: #2563eb;
  color: #2563eb;
}

.filter-chip-icon {
  font-size: 10px;
}

.filter-chip-chevron {
  font-size: 10px;
  margin-left: 2px;
}

.filter-chip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: #2563eb;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 0 4px;
}

.filter-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 40;
  min-width: 220px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.filter-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
}

.filter-search-icon {
  font-size: 12px;
  color: #94a3b8;
  flex-shrink: 0;
}

.filter-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  color: #334155;
  background: transparent;
}
.filter-search-input::placeholder {
  color: #94a3b8;
}

.filter-options {
  max-height: 200px;
  overflow-y: auto;
  padding: 4px 0;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 100ms;
}
.filter-option:hover {
  background: #f8fafc;
}

.filter-option-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1.5px solid #cbd5e1;
  cursor: pointer;
  accent-color: #2563eb;
  flex-shrink: 0;
}

.filter-option-label {
  flex: 1;
  font-size: 13px;
  color: #334155;
}

.filter-option-count {
  font-size: 12px;
  color: #94a3b8;
  flex-shrink: 0;
}

.filter-empty {
  padding: 12px;
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
}

.filter-clear {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-top: 1px solid #e2e8f0;
  background: transparent;
  font-size: 13px;
  color: #2563eb;
  cursor: pointer;
  text-align: center;
}
.filter-clear:hover {
  background: #f8fafc;
}
</style>
