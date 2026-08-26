<template>
  <PModal
    layer="preview"
    width="90vw"
    height="90vh"
    @close="$emit('close')"
  >
    <template #title>
      <div>
        <span class="font-semibold">{{ previewTitle(header.name) }}</span>
        <span v-if="header.total" class="text-sm font-normal text-slate-500 ml-2">
          {{ questionCounter(header) }}
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
import { useStore } from 'vuex'
import { PModal } from '@/components/ui/index.js'
import SequencePreviewBody from './sequence-preview-body.vue'

defineProps({
  id: { type: String, required: true },
})

const store = useStore()
function t(slug) { return store.getters.t(slug) }

function previewTitle(name) {
  return `${t('preview')}: "${name || t('untitled')}"`
}

function questionCounter(header) {
  return t('item-n-of-n')
    .replace('{current}', String((header.index || 0) + 1))
    .replace('{total}', String(header.total || 0))
}

defineEmits(['close'])

const header = ref({ name: '', index: 0, total: 0 })
</script>