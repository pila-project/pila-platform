<template>
  <div
    class="progress-track"
    :class="sizeClass"
    role="progressbar"
    :aria-valuenow="clampedValue"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="progress-fill"
      :class="colorClass"
      :style="{ width: `${clampedValue}%` }"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: Number,
    default: 0,
  },
  size: {
    type: String,
    default: 'md',
    validator: v => ['xs', 'sm', 'md', 'lg'].includes(v),
  },
  color: {
    type: String,
    default: 'primary',
    validator: v => ['primary', 'success', 'warning', 'danger'].includes(v),
  },
})

const clampedValue = computed(() => Math.min(100, Math.max(0, props.value)))
const sizeClass = computed(() => `progress-${props.size}`)
const colorClass = computed(() => `progress-color-${props.color}`)
</script>
