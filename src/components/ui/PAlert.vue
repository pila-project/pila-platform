<template>
  <div v-if="visible" role="alert" :class="alertClasses">
    <LucideIcon v-if="isLucideIcon" :name="lucideIconName" :size="16" class="alert-icon" />
    <i v-else :class="iconClass" class="alert-icon" />
    <div class="flex-1">
      <slot>{{ title }}</slot>
    </div>
    <button v-if="closable" class="alert-close" aria-label="Dismiss" @click="visible = false; $emit('close')">
      <LucideIcon name="x" :size="14" />
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import LucideIcon from './LucideIcon.vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'info',
    validator: v => ['info', 'success', 'warning', 'error'].includes(v),
  },
  appearance: {
    type: String,
    default: 'filled',
    validator: v => ['filled', 'outlined'].includes(v),
  },
  title: String,
  icon: String,
  closable: Boolean,
})

defineEmits(['close'])

const visible = ref(true)

const defaultIcons = {
  info: 'lucide:info',
  success: 'lucide:check-circle',
  warning: 'lucide:triangle-alert',
  error: 'lucide:x-circle',
}

const resolvedIcon = computed(() => props.icon || defaultIcons[props.variant])
const isLucideIcon = computed(() => resolvedIcon.value.startsWith('lucide:'))
const lucideIconName = computed(() => resolvedIcon.value.slice(7))

const iconClass = computed(() => {
  const icon = resolvedIcon.value
  if (icon.startsWith('lucide:')) return ''
  if (icon.startsWith('fa')) return icon
  return `fa fa-${icon}`
})

const alertClasses = computed(() => [
  'alert',
  `alert-${props.variant}`,
  `alert-${props.appearance}`,
])
</script>
