<template>
  <div class="relative">
    <label v-if="label" :for="selectId" class="label">{{ label }} <span v-if="required" class="required-marker">*{{ t('required') }}</span></label>
    <select
      :id="selectId"
      :value="modelValue"
      class="input appearance-none pr-10 cursor-pointer"
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
    <LucideIcon name="chevron-down" :size="16" class="select-chevron" />
    <p v-if="error" class="mt-1 text-xs text-danger-600">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
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
.required-marker {
  color: #dc2626;
  font-size: 12px;
  font-weight: 400;
}
.select-chevron {
  position: absolute;
  right: 1rem;
  bottom: 0.7rem;
  font-size: 0.625rem;
  color: var(--color-slate-400);
  pointer-events: none;
}
</style>
