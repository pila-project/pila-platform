<template>
  <PModal
    @close="handleClose"
    :show-close-button="!isSaving"
    width="600px"
    :title="t('enter-encryption-key-word')"
  >
    <template #body>
      <div class="encryption-key-body">
        <div
          v-if="modalHintText"
          class="encryption-key-attention"
          role="status"
        >
          <LucideIcon name="circle-alert" :size="16" class="encryption-key-attention-icon" />
          <span>{{ modalHintText }}</span>
        </div>
        <p class="encryption-key-copy">{{ t('enter-an-encryption-key-word-you-will-remember-t') }}</p>
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
import { ref, watch, computed } from 'vue'
import { useStore } from 'vuex'
import { useEncryptionKey } from '@/utils/useEncryptionKey.js'
import { PModal, PButton } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'

const emit = defineEmits(['close'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const {
  namePassword,
  isEncryptionKeyInvalid,
  revalidateEncryptionKey,
} = useEncryptionKey(store)

const localKey = ref(namePassword.value)
const isSaving = ref(false)
const keyWasUpdated = ref(false)

// Soft cues: missing key, or stored key failed to decrypt (not while typing a new attempt)
const modalHintText = computed(() => {
  if (!localKey.value.trim()) return t('encryption-key-required-hint')
  // Only show invalid for the *stored* wrong key, not mid-edit of a new value
  if (
    isEncryptionKeyInvalid.value
    && localKey.value === namePassword.value
  ) {
    return t('encryption-key-invalid-hint')
  }
  return ''
})

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
    // Lightweight loader — give reactive name decrypt + key probe a moment
    isSaving.value = true
    await revalidateEncryptionKey()
    await new Promise(resolve => setTimeout(resolve, 800))
    isSaving.value = false
  }

  emitClose()
}

function handleClose() {
  emitClose()
}

function emitClose() {
  keyWasUpdated.value = false
  isSaving.value = false
  emit('close')
}
</script>

<style scoped>
.encryption-key-body {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 20px 42px;
  text-align: center;
  font-size: 14px;
  color: var(--color-slate-600);
}

.encryption-key-copy {
  margin: 0;
  text-align: left;
  line-height: 1.5;
}

.encryption-key-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
  margin-top: 16px;
}

.encryption-key-attention {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  text-align: left;
  padding: 10px 12px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: var(--color-danger-50, #fef2f2);
  color: var(--color-danger-600, #dc2626);
  font-size: 13px;
  line-height: 1.4;
}

.encryption-key-attention-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--color-danger-600, #dc2626);
}
</style>
