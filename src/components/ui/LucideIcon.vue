<template>
  <component
    :is="iconComponent"
    :size="size"
    :color="color"
    :stroke-width="strokeWidth"
    :class="{ 'lucide-spin': spin }"
  />
</template>

<script setup>
import { computed } from 'vue'
import * as icons from 'lucide-vue-next'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 16
  },
  color: String,
  strokeWidth: {
    type: [Number, String],
    default: 2
  },
  spin: Boolean,
})

function kebabToPascal(str) {
  return str
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

const iconComponent = computed(() => {
  const name = kebabToPascal(props.name)
  return icons[name] || null
})
</script>

<style scoped>
.lucide-spin {
  animation: lucide-spin 1s linear infinite;
}
@keyframes lucide-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
