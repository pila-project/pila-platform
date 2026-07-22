<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 flex items-center justify-center"
      :style="overlayStyle"
      @keydown.esc="close('escape')"
    >
      <div
        class="fixed inset-0 bg-black/50 transition-opacity"
        @click="close('outside')"
      />
      <div
        ref="modalRef"
        role="dialog"
        aria-modal="true"
        class="relative flex flex-col bg-white rounded-lg shadow-lg overflow-hidden"
        :style="panelStyle"
        tabindex="-1"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div class="flex-1">
            <slot name="title">
              <h2 class="text-lg font-semibold text-zinc-950">{{ title }}</h2>
            </slot>
          </div>
          <PButton variant="icon" size="sm" icon="lucide:x" iconOnly class="ml-4" aria-label="Close" @click="close('top-x')" />
        </div>

        <!-- Body -->
        <div :class="['flex-1 overflow-auto', noPadBody ? 'relative' : 'px-6 py-4']" :style="noPadBody ? 'min-height: 0' : ''">
          <slot name="body">
            <slot />
          </slot>
        </div>

        <!-- Footer -->
        <div
          v-if="$slots.footer || showCloseButton"
          class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50"
        >
          <slot name="footer">
            <PButton
              v-if="showCloseButton"
              variant="primary"
              :text="closeButtonText"
              @click="close('primary-button')"
            />
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import PButton from './PButton.vue'
import { Z_LAYER_VARS } from '@/design-system/z-layers.js'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/body-scroll-lock.js'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  title: String,
  width: {
    type: String,
    default: '500px'
  },
  height: {
    type: String,
    default: 'auto'
  },
  showCloseButton: Boolean,
  closeButtonText: {
    type: String,
    default: 'Close'
  },
  persistent: Boolean,
  noPadBody: Boolean,
  /** Overlay tier — maps to --z-modal-* tokens in tokens.css */
  layer: {
    type: String,
    default: 'modal',
    validator: value => ['modal', 'nested', 'preview'].includes(value),
  },
})

const emit = defineEmits(['close'])
const modalRef = ref(null)

const layerZIndex = computed(() => {
  const tier = {
    modal: Z_LAYER_VARS.modal,
    nested: Z_LAYER_VARS.nested,
    preview: Z_LAYER_VARS.preview,
  }[props.layer] ?? Z_LAYER_VARS.modal
  return tier
})

const overlayStyle = computed(() => ({
  zIndex: layerZIndex.value,
}))

const panelStyle = computed(() => ({
  zIndex: 1,
  width: props.width,
  maxWidth: '90vw',
  ...(props.height !== 'auto'
    ? { height: props.height, maxHeight: '90vh' }
    : { maxHeight: '90vh' }
  ),
}))

function close(reason) {
  if (props.persistent && reason === 'outside') return
  emit('close', reason)
}

const captureEscape = props.layer === 'preview'

function handleKeydown(e) {
  if (e.key !== 'Escape') return
  if (captureEscape) {
    e.stopPropagation()
    e.stopImmediatePropagation()
  }
  close('escape')
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown, captureEscape)
  lockBodyScroll()
  modalRef.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown, captureEscape)
  unlockBodyScroll()
})
</script>