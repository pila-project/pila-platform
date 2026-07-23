<template>
  <div class="pmulti" ref="rootRef">
    <label v-if="label" :id="labelId" class="label">
      {{ label }}
      <span v-if="required" class="required-marker">*Required</span>
    </label>
    <button
      ref="triggerRef"
      type="button"
      class="input pmulti-trigger"
      :class="{ 'border-danger-600': error, 'pmulti-trigger--open': open }"
      :disabled="disabled"
      :aria-expanded="open"
      :aria-labelledby="label ? labelId : undefined"
      :aria-required="required || undefined"
      :aria-invalid="!!error || undefined"
      @click="toggle"
    >
      <span class="pmulti-trigger-text" :class="{ 'pmulti-trigger-placeholder': !selectedLabels.length }">
        {{ triggerLabel }}
      </span>
      <LucideIcon name="chevron-down" :size="16" class="pmulti-chevron" />
    </button>
    <p v-if="error" class="mt-1 text-xs text-danger-600">{{ error }}</p>
  </div>

  <!-- Teleport so modal overflow:hidden does not clip the menu -->
  <Teleport to="body">
    <div
      v-if="open"
      ref="dropdownRef"
      class="pmulti-dropdown"
      role="listbox"
      aria-multiselectable="true"
      :style="dropdownStyle"
      @click.stop
    >
      <label
        v-for="item in normalizedItems"
        :key="String(item.value)"
        class="pmulti-option"
        role="option"
        :aria-selected="isSelected(item.value)"
      >
        <PCheckbox
          :modelValue="isSelected(item.value)"
          size="sm"
          @update:modelValue="() => toggleValue(item.value)"
        />
        <span class="pmulti-option-label">{{ item.title }}</span>
      </label>
      <p v-if="!normalizedItems.length" class="pmulti-empty">—</p>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import LucideIcon from './LucideIcon.vue'
import PCheckbox from './PCheckbox.vue'

const props = defineProps({
  /** Selected values (array). */
  modelValue: {
    type: Array,
    default: () => [],
  },
  items: {
    type: Array,
    default: () => [],
  },
  itemTitle: {
    type: [String, Function],
    default: 'title',
  },
  itemValue: {
    type: String,
    default: 'value',
  },
  label: String,
  placeholder: {
    type: String,
    default: 'Select…',
  },
  disabled: Boolean,
  required: Boolean,
  error: String,
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootRef = ref(null)
const triggerRef = ref(null)
const dropdownRef = ref(null)
const dropdownStyle = ref({})
const labelId = `pmulti-label-${Math.random().toString(36).slice(2, 9)}`

const selected = computed(() =>
  Array.isArray(props.modelValue) ? props.modelValue : [],
)

const normalizedItems = computed(() =>
  props.items.map((item) => {
    if (typeof item === 'string' || typeof item === 'number') {
      return { title: String(item), value: item }
    }
    const title = typeof props.itemTitle === 'function'
      ? props.itemTitle(item)
      : item[props.itemTitle] || item.label || item.title || String(item)
    const value = item[props.itemValue] ?? item.value ?? item
    return { title, value }
  }),
)

const selectedLabels = computed(() => {
  const set = new Set(selected.value.map(String))
  return normalizedItems.value
    .filter(i => set.has(String(i.value)))
    .map(i => i.title)
})

const triggerLabel = computed(() => {
  if (!selectedLabels.value.length) return props.placeholder
  if (selectedLabels.value.length <= 2) return selectedLabels.value.join(', ')
  return `${selectedLabels.value[0]}, ${selectedLabels.value[1]} +${selectedLabels.value.length - 2}`
})

function isSelected(value) {
  return selected.value.some(v => String(v) === String(value))
}

function toggleValue(value) {
  const next = [...selected.value]
  const idx = next.findIndex(v => String(v) === String(value))
  if (idx >= 0) next.splice(idx, 1)
  else next.push(value)
  emit('update:modelValue', next)
}

function updateDropdownPosition() {
  const el = triggerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const gap = 4
  const maxH = 220
  const spaceBelow = window.innerHeight - rect.bottom - gap
  const spaceAbove = rect.top - gap
  const openUp = spaceBelow < 160 && spaceAbove > spaceBelow
  const height = Math.min(maxH, openUp ? spaceAbove : spaceBelow)

  dropdownStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${Math.max(120, height)}px`,
    zIndex: 10050,
    ...(openUp
      ? { bottom: `${window.innerHeight - rect.top + gap}px`, top: 'auto' }
      : { top: `${rect.bottom + gap}px`, bottom: 'auto' }),
  }
}

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

function close() {
  open.value = false
}

function onDocPointerDown(e) {
  if (!open.value) return
  const t = e.target
  if (rootRef.value?.contains(t)) return
  if (dropdownRef.value?.contains(t)) return
  close()
}

function onWindowChange() {
  if (open.value) updateDropdownPosition()
}

watch(open, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    updateDropdownPosition()
  }
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
  window.addEventListener('resize', onWindowChange)
  window.addEventListener('scroll', onWindowChange, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  window.removeEventListener('resize', onWindowChange)
  window.removeEventListener('scroll', onWindowChange, true)
})
</script>

<style scoped>
.pmulti {
  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
}

.required-marker {
  color: #dc2626;
  font-size: 12px;
  font-weight: 400;
}

.pmulti-trigger {
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 40px;
  text-align: left;
  cursor: pointer;
  padding-right: 2.5rem;
  /* Keep width stable when focus/open border color changes */
  border-width: 1px;
  border-style: solid;
}

.pmulti-trigger--open {
  border-color: var(--color-primary-500, #3b82f6);
}

.pmulti-trigger-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #334155;
  font-size: 14px;
}

.pmulti-trigger-placeholder {
  color: #94a3b8;
}

.pmulti-chevron {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  flex-shrink: 0;
  color: var(--color-slate-400);
  pointer-events: none;
}
</style>

<style>
/* Teleported to body — not scoped */
.pmulti-dropdown {
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 6px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.pmulti-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #334155;
  user-select: none;
}

.pmulti-option:hover {
  background: #f8fafc;
}

.pmulti-option-label {
  min-width: 0;
}

.pmulti-empty {
  margin: 0;
  padding: 12px;
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
}
</style>
