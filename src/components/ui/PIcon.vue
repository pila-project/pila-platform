<template>
  <LucideIcon
    v-if="isLucide"
    :name="lucideName"
    :size="size || 16"
    :color="color"
  />
  <i v-else :class="iconClass" :style="iconStyle" />
</template>

<script setup>
import { computed } from 'vue'
import LucideIcon from './LucideIcon.vue'

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  size: [String, Number],
  color: String,
})

const isLucide = computed(() => props.icon.startsWith('lucide:'))
const lucideName = computed(() => props.icon.slice(7))

const iconClass = computed(() => {
  if (props.icon.startsWith('fa')) return props.icon
  return `fa fa-${props.icon}`
})

const iconStyle = computed(() => ({
  fontSize: props.size ? (typeof props.size === 'number' ? `${props.size}px` : props.size) : undefined,
  color: props.color || undefined,
}))
</script>
