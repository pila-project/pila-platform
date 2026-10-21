<template>
  <PModal
    @close="handleClose"
    :dismissible="!required"
    :show-close-button="!isSaving"
    width="600px"
    :title="t('create-unique-encryption-code')"
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
        <p class="encryption-key-copy">{{ t('encryption-code-intro') }}</p>
        <div class="encryption-key-attention" role="status">
          <LucideIcon name="circle-alert" :size="16" class="encryption-key-attention-icon" />
          <span>{{ t('encryption-code-keep-safe') }}</span>
        </div>
        <div class="encryption-key-field">
          <input
            v-model="localKey"
            class="input encryption-key-input"
            :type="codeVisible ? 'text' : 'password'"
            :disabled="isSaving"
            autocapitalize="off"
            :autocorrect.attr="'off'"
            spellcheck="false"
            autocomplete="new-password"
          />
          <button
            type="button"
            class="encryption-key-reveal"
            :aria-label="codeVisible ? t('hide-encryption-code') : t('show-encryption-code')"
            :disabled="isSaving"
            @click="codeVisible = !codeVisible"
          >
            <LucideIcon :name="codeVisible ? 'eye-off' : 'eye'" :size="18" />
          </button>
        </div>
      </div>
    </template>

    <template #footer>
      <PButton
        variant="primary"
        :text="isSaving ? t('applying-key') : t('done')"
        :loading="isSaving"
        :disabled="isSaving || !canCommitKey"
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

const props = defineProps({
  /** Missing code: the dialog cannot be dismissed until a code is saved. */
  required: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const {
  namePassword,
  setEncryptionCode,
  isEncryptionKeyInvalid,
  revalidateEncryptionKey,
} = useEncryptionKey(store)

const localKey = ref(namePassword.value)
const codeVisible = ref(false)
const isSaving = ref(false)
const keyWasUpdated = ref(false)
const canCommitKey = computed(() => typeof localKey.value === 'string' && !!localKey.value.trim())

// Soft cues: missing key, or stored key failed to decrypt (not while typing a new attempt)
const modalHintText = computed(() => {
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
  if (!canCommitKey.value) return

  if (await setEncryptionCode(localKey.value)) {
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
  if (props.required) return
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
  margin: 0 0 12px;
  text-align: left;
  line-height: 1.5;
}

.encryption-key-field {
  position: relative;
  margin-top: 16px;
}

.encryption-key-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
  margin-top: 0;
  padding-right: 44px;
}

.encryption-key-reveal {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 100%;
  border: 0;
  background: transparent;
  color: var(--color-slate-500, #64748b);
  cursor: pointer;
}

.encryption-key-reveal:disabled {
  cursor: default;
  opacity: 0.5;
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
