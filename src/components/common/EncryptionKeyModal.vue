<template>
  <PModal
    @close="handleClose"
    :show-close-button="!isSaving"
    width="600px"
    :title="t('enter-encryption-key-word')"
  >
    <template #body>
      <div class="encryption-key-body">
        {{ t('enter-an-encryption-key-word-you-will-remember-t') }}
        <input v-model="localKey" class="input encryption-key-input" :disabled="isSaving" />
      </div>
    </template>

    <template #footer>
      <PButton
        variant="primary"
        :text="isSaving ? t('applying-key') : t('done')"
        :loading="isSaving"
        :disabled="isSaving"
        @click="handleDone"
      />
    </template>
  </PModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useStore } from 'vuex'
import { useEncryptionKey } from '@/utils/useEncryptionKey.js'
import { PModal, PButton } from '@/components/ui/index.js'

const emit = defineEmits(['close'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const { namePassword } = useEncryptionKey(store)

const localKey = ref(namePassword.value)
const isSaving = ref(false)
const keyWasUpdated = ref(false)

// Track if the user actually changed the key while the modal was open
watch(localKey, (val) => {
  if (val !== namePassword.value) {
    keyWasUpdated.value = true
  }
})

async function handleDone() {
  const previousKey = namePassword.value

  if (localKey.value !== previousKey) {
    namePassword.value = localKey.value
    keyWasUpdated.value = true
  }

  if (keyWasUpdated.value) {
    // Lightweight loader — give the reactive components (mainly DecryptedName)
    // a moment to re-decrypt before closing the modal.
    isSaving.value = true
    await new Promise(resolve => setTimeout(resolve, 1200))
    isSaving.value = false
  }

  emitClose()
}

function handleClose() {
  // If user clicks the X or outside while saving, we still want to close
  emitClose()
}

function emitClose() {
  // Reset local state
  keyWasUpdated.value = false
  isSaving.value = false
  emit('close')
}
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
