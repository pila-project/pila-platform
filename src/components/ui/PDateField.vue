<template>
  <div class="pdate-field" ref="rootRef">
    <label v-if="label" class="label" :for="fieldId">
      {{ label }}
      <span v-if="required" class="required-marker">*{{ t('required') }}</span>
    </label>
    <button
      :id="fieldId"
      ref="triggerRef"
      type="button"
      class="input pdate-trigger"
      :disabled="disabled"
      :aria-required="required || undefined"
      :aria-expanded="open"
      :aria-haspopup="true"
      @click="toggle"
    >
      <span :class="{ 'pdate-placeholder': !displayValue }">{{ displayValue || placeholder || t('date-format-placeholder') }}</span>
      <LucideIcon name="calendar" :size="14" class="pdate-icon" />
    </button>
    <Teleport to="body">
      <div
        v-if="open"
        ref="popoverRef"
        class="pdate-popover"
        role="dialog"
        :style="popoverStyle"
      >
        <PDatePicker
          :modelValue="parsed"
          type="single"
          :min="minDate"
          @update:modelValue="onPick"
        />
        <div class="pdate-footer">
          <button type="button" class="pdate-link" @click="clear">{{ t('clear') }}</button>
          <button type="button" class="pdate-link" @click="setToday">{{ t('today') }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import LucideIcon from './LucideIcon.vue'
import PDatePicker from './PDatePicker.vue'
import { parseIsoDate, toIsoDateString } from '@/utils/iso-date.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: String,
  placeholder: String,
  required: Boolean,
  disabled: Boolean,
  id: String,
  /** Calendar-day minimum (Date or YYYY-MM-DD). Today is allowed if min is start of today. */
  min: { type: [Date, String], default: null },
})

const emit = defineEmits(['update:modelValue'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const open = ref(false)
const rootRef = ref(null)
const triggerRef = ref(null)
const popoverRef = ref(null)
const popoverStyle = ref({})
const fieldId = computed(() => props.id || `pdate-${Math.random().toString(36).slice(2, 9)}`)

const parsed = computed(() => parseIsoDate(props.modelValue))

const minDate = computed(() => {
  if (!props.min) return null
  if (props.min instanceof Date) {
    return new Date(props.min.getFullYear(), props.min.getMonth(), props.min.getDate())
  }
  return parseIsoDate(props.min)
})

const displayValue = computed(() => {
  const date = parsed.value
  if (!date) return ''
  const lang = String(store.state.language || 'en').split(/[-_]/)[0]
  return date.toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' })
})

function startOfToday() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

function isBeforeMin(date) {
  if (!minDate.value || !date) return false
  return date < minDate.value
}

function findScrollParent(el) {
  let node = el?.parentElement
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node)
    const overflowY = style.overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node
    }
    node = node.parentElement
  }
  return null
}

async function scrollFieldAndCalendarIntoView() {
  const trigger = triggerRef.value
  const pop = popoverRef.value
  if (!trigger) return
  trigger.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
  await nextTick()
  positionPopover()
  if (!pop) return
  const tRect = trigger.getBoundingClientRect()
  const pRect = pop.getBoundingClientRect()
  const top = Math.min(tRect.top, pRect.top)
  const bottom = Math.max(tRect.bottom, pRect.bottom)
  const overflowBottom = Math.max(0, bottom - window.innerHeight + 12)
  const overflowTop = Math.max(0, 12 - top)
  if (!overflowBottom && !overflowTop) return
  const scroller = findScrollParent(trigger)
  if (scroller) scroller.scrollTop += overflowBottom - overflowTop
  else window.scrollBy(0, overflowBottom - overflowTop)
  await nextTick()
  positionPopover()
}

async function toggle() {
  if (open.value) {
    open.value = false
    return
  }
  open.value = true
  await nextTick()
  positionPopover()
  await scrollFieldAndCalendarIntoView()
}

function positionPopover() {
  if (!open.value) return
  const trigger = triggerRef.value
  const pop = popoverRef.value
  if (!trigger || !pop) return
  const rect = trigger.getBoundingClientRect()
  const popH = pop.offsetHeight || 320
  const popW = Math.max(280, pop.offsetWidth || 280)
  const gap = 6
  let top = rect.bottom + gap
  if (top + popH > window.innerHeight - 8) {
    top = Math.max(8, rect.top - popH - gap)
  }
  let left = rect.left
  if (left + popW > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - popW - 8)
  }
  popoverStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 10050,
  }
}

function onPick(date) {
  if (isBeforeMin(date)) return
  emit('update:modelValue', toIsoDateString(date))
  open.value = false
}

function clear() {
  emit('update:modelValue', '')
  open.value = false
}

function setToday() {
  const today = startOfToday()
  if (isBeforeMin(today)) return
  emit('update:modelValue', toIsoDateString(today))
  open.value = false
}

function onDocClick(event) {
  if (!open.value) return
  if (rootRef.value?.contains(event.target)) return
  if (popoverRef.value?.contains(event.target)) return
  open.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', onDocClick)
  window.addEventListener('resize', positionPopover)
  window.addEventListener('scroll', positionPopover, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  window.removeEventListener('resize', positionPopover)
  window.removeEventListener('scroll', positionPopover, true)
})
</script>

<style scoped>
.pdate-field {
  position: relative;
}
.pdate-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-align: left;
  cursor: pointer;
}
.pdate-placeholder {
  color: #94a3b8;
}
.pdate-icon {
  color: #64748b;
  flex-shrink: 0;
}
.required-marker {
  color: #dc2626;
  font-size: 12px;
  font-weight: 400;
}
</style>

<style>
.pdate-popover {
  min-width: 280px;
  padding: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(15 23 42 / 0.18);
}
.pdate-footer {
  display: flex;
  justify-content: space-between;
  padding: 4px 8px 4px;
}
.pdate-link {
  border: none;
  background: none;
  color: #2563eb;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
</style>
