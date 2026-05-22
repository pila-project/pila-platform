<template>
  <label v-if="label || $slots.default" class="inline-flex items-center gap-2 cursor-pointer select-none">
    <input
      ref="checkboxRef"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :class="['pcheckbox', sizeClass, props.inputClass]"
      @change="onChange"
    />
    <span class="text-sm text-slate-700">
      <slot>{{ label }}</slot>
    </span>
  </label>

  <!-- Standalone mode (no label) - just the styled checkbox input -->
  <input
    v-else
    ref="checkboxRef"
    type="checkbox"
    :checked="modelValue"
    :disabled="disabled"
    :class="['pcheckbox', sizeClass, props.inputClass, 'cursor-pointer']"
    @change="onChange"
    @click.stop
  />
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  label: String,
  disabled: Boolean,
  indeterminate: Boolean,
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  // Allow extra classes to be passed to the actual checkbox input
  inputClass: String,
})

const emit = defineEmits(['update:modelValue'])

const checkboxRef = ref(null)

const sizeClass = computed(() => {
  if (props.size === 'sm') return 'h-3.5 w-3.5'
  if (props.size === 'lg') return 'h-5 w-5'
  return 'h-4 w-4'
})

watch(() => props.indeterminate, (val) => {
  if (checkboxRef.value) {
    checkboxRef.value.indeterminate = !!val
  }
}, { immediate: true })

function onChange(e) {
  emit('update:modelValue', e.target.checked)
}
</script>
