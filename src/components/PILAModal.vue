<template>
  <PModal
    :width="width"
    :height="height"
    :show-close-button="showCloseButton"
    :close-button-text="closeButtonText"
    @close="(reason) => $emit('close', reason)"
  >
    <template #title>
      <slot name="title">
        <h2 class="text-lg font-semibold text-zinc-950">Modal Title</h2>
      </slot>
    </template>
    <template #body>
      <slot name="body">
        <p>Modal body content goes here.</p>
      </slot>
    </template>
  </PModal>
</template>

<script>
import { PModal } from '@/components/ui/index.js'

export default {
  name: 'pila-modal',
  components: { PModal },
  props: {
    showCloseButton: {
      type: Boolean,
      default: false,
    },
    closeButtonText: {
      type: String,
      default: 'Close',
    },
    width: {
      type: String,
      default: '800px',
    },
    height: {
      type: String,
      default: 'auto',
    },
  },
  emits: ['close'],
}
</script>