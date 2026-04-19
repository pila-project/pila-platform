<template>
  <span :class="classes">
    <slot>{{ text }}</slot>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'info',
    validator: v => ['success', 'warning', 'danger', 'info', 'outline', 'secondary', 'destructive'].includes(v)
  },
  text: String,
  rounded: {
    type: Boolean,
    default: true,
  },
})

const classes = computed(() => [
  'badge',
  `badge-${props.variant}`,
  props.rounded ? 'badge-rounded' : 'badge-square',
])
</script>
