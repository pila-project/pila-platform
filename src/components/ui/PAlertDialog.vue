<template>
  <PModal
    :width="width"
    persistent
    @close="$emit('cancel')"
  >
    <template #title>
      <span />
    </template>
    <template #body>
      <div :class="dialogClasses">
        <div class="alert-dialog-icon" :class="`alert-dialog-icon-${variant}`">
          <i :class="variantIcon" />
        </div>
        <h3 class="alert-dialog-title">{{ title }}</h3>
        <p v-if="description" class="alert-dialog-description">{{ description }}</p>
        <slot />
        <div class="alert-dialog-actions">
          <PButton
            v-if="cancelText"
            variant="ghost"
            :text="cancelText"
            @click="$emit('cancel')"
          />
          <PButton
            :variant="confirmVariant"
            :destructive="variant === 'error'"
            :text="confirmText"
            @click="$emit('confirm')"
          />
        </div>
      </div>
    </template>
  </PModal>
</template>

<script setup>
import { computed } from 'vue'
import PModal from './PModal.vue'
import PButton from './PButton.vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'notification',
    validator: v => ['error', 'success', 'notification'].includes(v),
  },
  centered: {
    type: Boolean,
    default: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  confirmText: {
    type: String,
    default: 'Confirm',
  },
  cancelText: {
    type: String,
    default: 'Cancel',
  },
  width: {
    type: String,
    default: '512px',
  },
})

defineEmits(['confirm', 'cancel'])

const variantIcons = {
  error: 'fa fa-circle-exclamation',
  success: 'fa fa-circle-check',
  notification: 'fa fa-bell',
}

const variantIcon = computed(() => variantIcons[props.variant])

const confirmVariant = computed(() => {
  if (props.variant === 'error') return 'danger'
  if (props.variant === 'success') return 'primary'
  return 'primary'
})

const dialogClasses = computed(() => [
  'alert-dialog',
  props.centered ? 'alert-dialog-centered' : '',
])
</script>
