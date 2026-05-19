import { ref, computed, watch } from 'vue'
import * as encryption from '@/utils/encryption.js'
import naclUtil from 'tweetnacl-util'

let sharedNamePassword = null
let sharedUserId = null

export function useEncryptionKey(store) {
  const userId = store.state.user

  if (!sharedNamePassword || sharedUserId !== userId) {
    sharedUserId = userId
    sharedNamePassword = ref(localStorage.getItem(`zkek-${userId}`) || '')

    watch(sharedNamePassword, async (val) => {
      localStorage.setItem(`zkek-${userId}`, val)
      const publicKeys = await Agent.state('user-info-public-keys')
      const { publicKey: publicKeyBuffer } = await encryption.generateKeyPair(val)
      publicKeys.public = naclUtil.encodeBase64(publicKeyBuffer)
    })
  }

  const namePassword = sharedNamePassword
  const hasEncryptionKey = computed(() => !!namePassword.value)
  const showEncryptionKeyModal = ref(false)

  function openEncryptionKeyModal() { showEncryptionKeyModal.value = true }
  function closeEncryptionKeyModal() { showEncryptionKeyModal.value = false }

  return {
    namePassword,
    hasEncryptionKey,
    showEncryptionKeyModal,
    openEncryptionKeyModal,
    closeEncryptionKeyModal,
  }
}
