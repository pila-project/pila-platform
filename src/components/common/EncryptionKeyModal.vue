<template>
  <PModal
    @close="$emit('close')"
    show-close-button
    :close-button-text="t('done')"
    width="600px"
    :title="t('enter-encryption-key-word')"
  >
    <template #body>
      <div class="encryption-key-body">
        {{ t('enter-an-encryption-key-word-you-will-remember-t') }}
        <input v-model="namePassword" class="input encryption-key-input" />
      </div>
    </template>
  </PModal>
</template>

<script setup>
import { useStore } from 'vuex'
import { useEncryptionKey } from '@/utils/useEncryptionKey.js'
import { PModal } from '@/components/ui/index.js'

defineEmits(['close'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const { namePassword } = useEncryptionKey(store)
</script>

<style scoped>
.encryption-key-body {
  padding: 20px 42px;
  text-align: center;
  font-size: 14px;
  color: var(--color-slate-600);
}

.encryption-key-input {
  width: 60%;
  text-align: center;
  margin-top: 16px;
}
</style>
