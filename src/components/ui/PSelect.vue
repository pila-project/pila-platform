<template>
  <div class="relative" ref="rootRef">
    <label v-if="label" :id="labelId" class="label">
      {{ label }} <span v-if="required" class="required-marker">*{{ t('required') }}</span>
    </label>
    <button
      :id="selectId"
      ref="triggerRef"
      type="button"
      class="input appearance-none pr-10 cursor-pointer pselect-trigger"
      :class="{ 'border-danger-600': error }"
      :disabled="disabled"
      :aria-required="required || undefined"
      :aria-invalid="!!error || undefined"
      :aria-expanded="open"
      :aria-labelledby="label ? labelId : undefined"
      @click="toggle"
    >
      <span :class="{ 'pselect-placeholder': !selectedTitle }">{{ selectedTitle || placeholder }}</span>
    </button>
    <LucideIcon name="chevron-down" :size="16" class="select-chevron" />
    <p v-if="error" class="mt-1 text-xs text-danger-600">{{ error }}</p>
  </div>
  <Teleport to="body">
    <div
      v-if="open"
      ref="dropdownRef"
      class="pselect-dropdown"
      role="listbox"
      :style="dropdownStyle"
      @click.stop
    >
      <button
        v-for="item in normalizedItems"
        :key="String(item.value)"
        type="button"
        class="pselect-option"
        :class="{ 'pselect-option-active': String(item.value) === String(modelValue) }"
        role="option"
        @click="choose(item.value)"
      >
        {{ item.title }}
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useStore } from 'vuex'
import LucideIcon from './LucideIcon.vue'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const props = defineProps({
  modelValue: [String, Number, Object],
  items: {
    type: Array,
    default: () => []
  },
  itemTitle: {
    type: [String, Function],
    default: 'title'
  },
  itemValue: {
    type: String,
    default: 'value'
  },
  label: String,
  placeholder: String,
  disabled: Boolean,
  required: Boolean,
  error: String,
  returnObject: Boolean,
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootRef = ref(null)
const triggerRef = ref(null)
const dropdownRef = ref(null)
const dropdownStyle = ref({})
const selectId = computed(() => `select-${Math.random().toString(36).slice(2, 9)}`)
const labelId = computed(() => `${selectId.value}-label`)

const normalizedItems = computed(() => {
  return props.items.map(item => {
    if (typeof item === 'string' || typeof item === 'number') {
      return { title: String(item), value: item }
    }
    const title = typeof props.itemTitle === 'function'
      ? props.itemTitle(item)
      : item[props.itemTitle] || item.label || item.title || String(item)
    const value = item[props.itemValue] ?? item.value ?? item
    return { title, value }
  })
})

const selectedTitle = computed(() => {
  const found = normalizedItems.value.find(i => String(i.value) === String(props.modelValue))
  return found?.title || ''
})

function choose(value) {
  emit('update:modelValue', value)
  open.value = false
}

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

function updateDropdownPosition() {
  const el = triggerRef.value
  if (!el || !open.value) return
  const rect = el.getBoundingClientRect()
  const gap = 4
  const pad = 8
  const preferred = 240
  const spaceBelow = window.innerHeight - rect.bottom - gap - pad
  const spaceAbove = rect.top - gap - pad
  const openUp = spaceBelow < Math.min(preferred, 160) && spaceAbove > spaceBelow
  const available = openUp ? spaceAbove : spaceBelow
  const maxHeight = Math.max(96, Math.min(preferred, available))
  const width = rect.width
  const left = Math.min(
    Math.max(pad, rect.left),
    Math.max(pad, window.innerWidth - width - pad),
  )

  dropdownStyle.value = openUp
    ? {
        position: 'fixed',
        left: `${left}px`,
        width: `${width}px`,
        bottom: `${window.innerHeight - rect.top + gap}px`,
        top: 'auto',
        maxHeight: `${maxHeight}px`,
        zIndex: 10050,
      }
    : {
        position: 'fixed',
        left: `${left}px`,
        width: `${width}px`,
        top: `${rect.bottom + gap}px`,
        bottom: 'auto',
        maxHeight: `${maxHeight}px`,
        zIndex: 10050,
      }
}

function onDocPointerDown(e) {
  if (!open.value) return
  if (rootRef.value?.contains(e.target) || dropdownRef.value?.contains(e.target)) return
  open.value = false
}

function bindPositionListeners() {
  window.addEventListener('resize', updateDropdownPosition)
  window.addEventListener('scroll', updateDropdownPosition, true)
}

function unbindPositionListeners() {
  window.removeEventListener('resize', updateDropdownPosition)
  window.removeEventListener('scroll', updateDropdownPosition, true)
}

watch(open, async (isOpen) => {
  unbindPositionListeners()
  if (!isOpen) return
  await nextTick()
  updateDropdownPosition()
  bindPositionListeners()
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  unbindPositionListeners()
})
</script>

<style scoped>
.required-marker {
  color: #dc2626;
  font-size: 12px;
  font-weight: 400;
}
.select-chevron {
  position: absolute;
  right: 1rem;
  bottom: 0.7rem;
  color: var(--color-slate-400);
  pointer-events: none;
}
.pselect-trigger {
  text-align: left;
  display: flex;
  align-items: center;
}
.pselect-placeholder {
  color: #94a3b8;
}
</style>

<style>
.pselect-dropdown {
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(15 23 42 / 0.16);
  padding: 4px;
}
.pselect-option {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  color: #0f172a;
  cursor: pointer;
}
.pselect-option:hover,
.pselect-option-active {
  background: #eff6ff;
}
</style>
