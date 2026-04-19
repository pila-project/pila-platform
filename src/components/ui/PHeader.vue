<template>
  <div :class="headerClasses">
    <div class="header-text">
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      <slot />
    </div>
    <div v-if="$slots.actions" class="header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: String,
  bordered: Boolean,
})

const headerClasses = computed(() => [
  'page-header',
  props.bordered ? 'page-header-bordered' : '',
])
</script>
