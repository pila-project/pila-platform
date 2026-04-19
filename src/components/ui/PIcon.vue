<template>
  <i :class="iconClass" :style="iconStyle" />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  size: String,
  color: String,
})

const iconClass = computed(() => {
  if (props.icon.startsWith('fa')) return props.icon
  return `fa fa-${props.icon}`
})

const iconStyle = computed(() => ({
  fontSize: props.size || undefined,
  color: props.color || undefined,
}))
</script>
