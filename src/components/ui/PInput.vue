<template>
  <div>
    <label v-if="label" :for="inputId" class="label">{{ label }} <span v-if="required" class="required-marker">*{{ t('required') }}</span></label>
    <div :class="icon ? 'relative' : ''">
      <LucideIcon v-if="icon && icon.startsWith('lucide:')" :name="icon.slice(7)" :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <i v-else-if="icon" :class="iconClass" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
      <component
        :is="multiline ? 'textarea' : 'input'"
        :id="inputId"
        :value="modelValue"
        :type="multiline ? undefined : type"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :autofocus="autofocus"
        :rows="multiline ? rows : undefined"
        :aria-required="required || undefined"
        :aria-invalid="!!error || undefined"
        :aria-describedby="error ? `${inputId}-error` : undefined"
        class="input"
        :class="[
          icon ? 'pl-9' : '',
          error ? 'border-danger-600 focus:ring-danger-600' : ''
        ]"
        @input="$emit('update:modelValue', $event.target.value)"
        @keypress.enter="$emit('enter', $event)"
      />
    </div>
    <p v-if="error" :id="`${inputId}-error`" class="mt-1 text-xs text-danger-600">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import LucideIcon from './LucideIcon.vue'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const props = defineProps({
  modelValue: [String, Number],
  label: String,
  placeholder: String,
  type: {
    type: String,
    default: 'text'
  },
  required: Boolean,
  disabled: Boolean,
  autofocus: Boolean,
  error: String,
  multiline: Boolean,
  rows: {
    type: [Number, String],
    default: 3
  },
  id: String,
  icon: String,
})

defineEmits(['update:modelValue', 'enter'])

const inputId = computed(() => props.id || `input-${Math.random().toString(36).slice(2, 9)}`)

const iconClass = computed(() => {
  if (!props.icon) return ''
  if (props.icon.startsWith('fa')) return props.icon
  return `fa fa-${props.icon}`
})
</script>

<style scoped>
textarea.input {
  resize: vertical;
}
.required-marker {
  color: #dc2626;
  font-size: 12px;
  font-weight: 400;
}
</style>
