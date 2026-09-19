import { ref, computed, watch } from 'vue'
import { isEmptyEncryptionSecret, publishDerivedPublicKey } from './publish-derived-public-key.js'

let sharedNamePassword = null
let sharedUserId = null
/** @type {import('vue').Ref<'missing'|'ok'|'invalid'|'unknown'>|null} */
let sharedKeyStatus = null
/** Last student ids used for probing (so key changes can re-probe) */
let lastProbeUserIds = []

export function useEncryptionKey(store) {
  const userId = store.state.user

  if (!sharedNamePassword || sharedUserId !== userId) {
    sharedUserId = userId
    const stored = localStorage.getItem(`zkek-${userId}`) || ''
    sharedNamePassword = ref(stored)
    sharedKeyStatus = ref(stored ? 'unknown' : 'missing')
    lastProbeUserIds = []

    watch(sharedNamePassword, async (val) => {
      if (isEmptyEncryptionSecret(val)) {
        sharedKeyStatus.value = 'missing'
        return
      }
      localStorage.setItem(`zkek-${userId}`, val)
      // Until re-probed, don't assume valid
      sharedKeyStatus.value = 'unknown'
      if (lastProbeUserIds.length) {
        await revalidateEncryptionKey(lastProbeUserIds)
      }
      try {
        await publishDerivedPublicKey(val)
      } catch (e) {
        console.warn('[useEncryptionKey] public key update failed', e)
      }
    })
  }

  const namePassword = sharedNamePassword
  const keyStatus = sharedKeyStatus
  const hasEncryptionKey = computed(() => !!namePassword.value)
  /** Empty key OR key present but failed to decrypt student data */
  const needsEncryptionAttention = computed(() =>
    keyStatus.value === 'missing' || keyStatus.value === 'invalid'
  )
  const isEncryptionKeyMissing = computed(() => keyStatus.value === 'missing')
  const isEncryptionKeyInvalid = computed(() => keyStatus.value === 'invalid')

  const showEncryptionKeyModal = ref(false)

  function openEncryptionKeyModal() { showEncryptionKeyModal.value = true }
  function closeEncryptionKeyModal() { showEncryptionKeyModal.value = false }

  async function revalidateEncryptionKey(userIds = []) {
    if (Array.isArray(userIds) && userIds.length) {
      lastProbeUserIds = [...userIds]
    }
    if (!namePassword.value) {
      keyStatus.value = 'missing'
      return keyStatus.value
    }
    const ids = lastProbeUserIds
    if (!ids.length) {
      keyStatus.value = 'unknown'
      return keyStatus.value
    }
    try {
      const result = await store.getters.probeEncryptionKey(ids)
      keyStatus.value = result
    } catch (e) {
      console.warn('[useEncryptionKey] probe failed', e)
      keyStatus.value = 'unknown'
    }
    return keyStatus.value
  }

  return {
    namePassword,
    hasEncryptionKey,
    keyStatus,
    needsEncryptionAttention,
    isEncryptionKeyMissing,
    isEncryptionKeyInvalid,
    showEncryptionKeyModal,
    openEncryptionKeyModal,
    closeEncryptionKeyModal,
    revalidateEncryptionKey,
  }
}
