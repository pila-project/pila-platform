<template>
  <div v-if="visible" role="alert" :class="alertClasses">
    <i :class="iconClass" class="alert-icon" />
    <div class="flex-1">
      <slot>{{ title }}</slot>
    </div>
    <button v-if="closable" class="alert-close" aria-label="Dismiss" @click="visible = false; $emit('close')">
      <i class="fa fa-times" />
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

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
  info: 'fa fa-info-circle',
  success: 'fa fa-check-circle',
  warning: 'fa fa-exclamation-triangle',
  error: 'fa fa-times-circle',
}

const iconClass = computed(() => {
  if (props.icon) {
    return props.icon.startsWith('fa') ? props.icon : `fa fa-${props.icon}`
  }
  return defaultIcons[props.variant]
})

const alertClasses = computed(() => [
  'alert',
  `alert-${props.variant}`,
  `alert-${props.appearance}`,
])
</script>
