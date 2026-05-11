<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
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
        class="relative z-50 flex flex-col bg-white rounded-lg shadow-lg overflow-hidden"
        :style="modalStyle"
        tabindex="-1"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div class="flex-1">
            <slot name="title">
              <h2 class="text-lg font-semibold text-zinc-950">{{ title }}</h2>
            </slot>
          </div>
          <button
            @click="close('top-x')"
            class="ml-4 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <LucideIcon name="x" :size="18" />
          </button>
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
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import PButton from './PButton.vue'
import LucideIcon from './LucideIcon.vue'

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
})

const emit = defineEmits(['close'])
const modalRef = ref(null)

const modalStyle = computed(() => ({
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

function handleKeydown(e) {
  if (e.key === 'Escape') close('escape')
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.body.style.overflow = 'hidden'
  modalRef.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>
