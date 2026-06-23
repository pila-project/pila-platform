<template>
  <PModal
    width="90vw"
    height="90vh"
    @close="$emit('close')"
  >
    <template #title>
      <div>
        <span class="font-semibold">Preview: "{{ header.name || 'Untitled' }}"</span>
        <span v-if="header.total" class="text-sm font-normal text-slate-500 ml-2">
          Question {{ header.index + 1 }} of {{ header.total }}
        </span>
      </div>
    </template>

    <template #body>
      <SequencePreviewBody :sequence-id="id" @header="header = $event" />
    </template>
  </PModal>
</template>

<script setup>
import { ref } from 'vue'
import { PModal } from '@/components/ui/index.js'
import SequencePreviewBody from './sequence-preview-body.vue'

defineProps({
  id: { type: String, required: true },
})

defineEmits(['close'])

const header = ref({ name: '', index: 0, total: 0 })
</script>