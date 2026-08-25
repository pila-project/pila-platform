<template>
  <div class="pdate-field" ref="rootRef">
    <label v-if="label" class="label" :for="fieldId">
      {{ label }}
      <span v-if="required" class="required-marker">*{{ t('required') }}</span>
    </label>
    <button
      :id="fieldId"
      type="button"
      class="input pdate-trigger"
      :disabled="disabled"
      :aria-required="required || undefined"
      :aria-expanded="open"
      :aria-haspopup="true"
      @click="open = !open"
    >
      <span :class="{ 'pdate-placeholder': !displayValue }">{{ displayValue || placeholder || t('date-format-placeholder') }}</span>
      <LucideIcon name="calendar" :size="14" class="pdate-icon" />
    </button>
    <div v-if="open" class="pdate-popover" role="dialog">
      <PDatePicker
        :modelValue="parsed"
        type="single"
        @update:modelValue="onPick"
      />
      <div class="pdate-footer">
        <button type="button" class="pdate-link" @click="clear">{{ t('clear') }}</button>
        <button type="button" class="pdate-link" @click="setToday">{{ t('today') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
})

const emit = defineEmits(['update:modelValue'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const open = ref(false)
const rootRef = ref(null)
const fieldId = computed(() => props.id || `pdate-${Math.random().toString(36).slice(2, 9)}`)

const parsed = computed(() => parseIsoDate(props.modelValue))

const displayValue = computed(() => {
  const date = parsed.value
  if (!date) return ''
  const lang = String(store.state.language || 'en').split(/[-_]/)[0]
  return date.toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' })
})

function onPick(date) {
  emit('update:modelValue', toIsoDateString(date))
  open.value = false
}

function clear() {
  emit('update:modelValue', '')
  open.value = false
}

function setToday() {
  emit('update:modelValue', toIsoDateString(new Date()))
  open.value = false
}

function onDocClick(event) {
  if (!open.value) return
  if (rootRef.value && !rootRef.value.contains(event.target)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
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
.pdate-popover {
  position: absolute;
  z-index: 40;
  top: calc(100% + 4px);
  left: 0;
  min-width: 280px;
  padding: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(15 23 42 / 0.12);
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
.required-marker {
  color: #dc2626;
  font-size: 12px;
  font-weight: 400;
}
</style>
