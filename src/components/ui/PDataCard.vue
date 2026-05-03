<template>
  <div :class="cardClasses">
    <div v-if="$slots.icon || icon" class="data-card-icon">
      <slot name="icon">
        <LucideIcon v-if="icon.startsWith('lucide:')" :name="icon.slice(7)" :size="20" />
        <i v-else :class="icon.startsWith('fa') ? icon : `fa fa-${icon}`" />
      </slot>
    </div>
    <div class="data-card-content">
      <span v-if="title" class="data-card-title">{{ title }}</span>
      <span v-if="value !== undefined" class="data-card-value">{{ value }}</span>
      <span v-if="subtitle" class="data-card-subtitle">{{ subtitle }}</span>
      <slot />
    </div>
    <div v-if="$slots.actions" class="data-card-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import LucideIcon from './LucideIcon.vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: v => ['default', 'notification', 'success'].includes(v),
  },
  title: String,
  subtitle: String,
  icon: String,
  value: [String, Number],
  compact: Boolean,
})

const cardClasses = computed(() => [
  'data-card',
  props.variant !== 'default' ? `data-card-${props.variant}` : '',
  props.compact ? 'data-card-compact' : '',
])
</script>
