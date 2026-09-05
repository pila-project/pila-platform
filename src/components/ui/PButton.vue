<template>
  <button
    :class="classes"
    :type="type"
    :disabled="disabled || loading"
    :aria-disabled="disabled || loading || undefined"
    @click="$emit('click', $event)"
  >
    <template v-if="loading">
      <LucideIcon name="loader-2" :size="iconSize" :spin="true" :style="icon && !iconRight ? iconStyle : { marginRight: '0.5rem' }" />
    </template>
    <template v-else-if="icon && !iconRight">
      <LucideIcon v-if="isLucide" :name="lucideName" :size="iconSize" :style="iconStyle" />
      <i v-else :class="iconClass" :style="iconStyle" />
    </template>
    <span v-if="!iconOnly" class="btn-text"><slot>{{ text }}</slot></span>
    <slot v-else>{{ text }}</slot>
    <template v-if="!loading && icon && iconRight">
      <LucideIcon v-if="isLucide" :name="lucideName" :size="iconSize" :style="iconStyle" />
      <i v-else :class="iconClass" :style="iconStyle" />
    </template>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import LucideIcon from './LucideIcon.vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: v => ['primary', 'secondary', 'outline', 'ghost', 'icon', 'link', 'danger', 'warning', 'text'].includes(v)
  },
  color: {
    type: String,
    default: '',
    validator: v => ['', 'danger', 'warning', 'success'].includes(v)
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
  loading: Boolean,
  block: Boolean,
  iconOnly: Boolean,
  destructive: Boolean,
})

defineEmits(['click'])

const isLucide = computed(() => props.icon?.startsWith('lucide:'))
const lucideName = computed(() => props.icon?.slice(7))

const iconSize = computed(() => props.size === 'xsm' ? 12 : 16)

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

const resolvedVariant = computed(() => {
  if (props.variant === 'text') return 'link'
  if (props.variant === 'outline') return 'secondary'
  return props.variant
})

const resolvedColor = computed(() => {
  if (props.color) return props.color
  if (props.destructive) return 'danger'
  if (props.variant === 'danger') return 'danger'
  if (props.variant === 'warning') return 'warning'
  return ''
})

const effectiveVariant = computed(() => {
  const v = resolvedVariant.value
  if (v === 'danger' || v === 'warning') return 'primary'
  return v
})

const classes = computed(() => [
  'btn',
  `btn-${effectiveVariant.value}`,
  `btn-${props.size}`,
  {
    [`btn-color-${resolvedColor.value}`]: !!resolvedColor.value,
    'w-full': props.block,
    'btn-icon-only': props.iconOnly,
    'btn-loading': props.loading,
  }
])
</script>

<style scoped>
.btn-icon-only {
  padding: 0.5rem;
  aspect-ratio: 1;
  min-width: unset;
}
.btn-loading {
  opacity: 0.75;
  cursor: wait;
}
</style>
