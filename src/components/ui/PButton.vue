<template>
  <button
    :class="classes"
    :type="type"
    :disabled="disabled"
    :aria-disabled="disabled || undefined"
    @click="$emit('click', $event)"
  >
    <i v-if="icon && !iconRight" :class="iconClass" :style="iconStyle" />
    <slot>{{ text }}</slot>
    <i v-if="icon && iconRight" :class="iconClass" :style="iconStyle" />
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: v => ['primary', 'secondary', 'danger', 'ghost', 'text', 'outline', 'link'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: v => ['xsm', 'sm', 'md', 'lg'].includes(v)
  },
  icon: String,
  iconRight: Boolean,
  text: String,
  type: {
    type: String,
    default: 'button'
  },
  disabled: Boolean,
  block: Boolean,
  iconOnly: Boolean,
  destructive: Boolean,
})

defineEmits(['click'])

const iconClass = computed(() => {
  if (!props.icon) return ''
  if (props.icon.startsWith('fa')) return props.icon
  return `fa fa-${props.icon}`
})

const iconStyle = computed(() => {
  if (props.iconOnly) return {}
  return props.iconRight
    ? { marginLeft: '0.5rem' }
    : { marginRight: '0.5rem' }
})

const classes = computed(() => [
  'btn',
  props.destructive ? `btn-${props.variant} btn-destructive` : `btn-${props.variant}`,
  `btn-${props.size}`,
  {
    'w-full': props.block,
    'btn-icon-only': props.iconOnly,
  }
])
</script>

<style scoped>
.btn-icon-only {
  padding: 0.5rem;
  aspect-ratio: 1;
}
</style>
