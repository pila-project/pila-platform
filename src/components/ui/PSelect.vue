<template>
  <div class="relative">
    <label v-if="label" :for="selectId" class="label">{{ label }}</label>
    <select
      :id="selectId"
      :value="modelValue"
      class="input appearance-none pr-8 cursor-pointer"
      :class="{ 'border-danger-600': error }"
      :disabled="disabled"
      :required="required"
      :aria-required="required || undefined"
      :aria-invalid="!!error || undefined"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-if="placeholder" value="" disabled selected>{{ placeholder }}</option>
      <option
        v-for="item in normalizedItems"
        :key="item.value"
        :value="item.value"
      >
        {{ item.title }}
      </option>
    </select>
    <i class="fa fa-chevron-down select-chevron" />
    <p v-if="error" class="mt-1 text-xs text-danger-600">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

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

defineEmits(['update:modelValue'])

const selectId = computed(() => `select-${Math.random().toString(36).slice(2, 9)}`)

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
</script>

<style scoped>
.select-chevron {
  position: absolute;
  right: 0.75rem;
  bottom: 0.7rem;
  font-size: 0.625rem;
  color: var(--color-slate-400);
  pointer-events: none;
}
</style>
