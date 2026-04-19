<template>
  <label class="inline-flex items-center gap-2 cursor-pointer select-none">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
    <span v-if="label || $slots.default" class="text-sm text-slate-700">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script setup>
defineProps({
  modelValue: Boolean,
  label: String,
  disabled: Boolean,
})

defineEmits(['update:modelValue'])
</script>
