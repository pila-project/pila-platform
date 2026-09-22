import { ref, computed, watch } from 'vue'
import { isEmptyEncryptionSecret, publishDerivedPublicKey } from './publish-derived-public-key.js'
import {
  clearDecryptUserInfoCache,
  setSkipExpensiveDecrypt,
} from './decrypt-user-info-cache.js'

let sharedNamePassword = null
let sharedUserId = null
/** @type {import('vue').Ref<'missing'|'ok'|'invalid'|'unknown'>|null} */
let sharedKeyStatus = null
/** Last student ids used for probing (so key changes can re-probe) */
let lastProbeUserIds = []
/** Drop stale probe results so an older invalid cannot skip-nacl after a newer key. */
let probeGeneration = 0

export function useEncryptionKey(store) {
  const userId = store.state.user

  if (!sharedNamePassword || sharedUserId !== userId) {
    sharedUserId = userId
    const stored = localStorage.getItem(`zkek-${userId}`) || ''
    sharedNamePassword = ref(stored)
    sharedKeyStatus = ref(stored ? 'unknown' : 'missing')
    lastProbeUserIds = []
    probeGeneration += 1

    watch(sharedNamePassword, async (val) => {
      probeGeneration += 1
      clearDecryptUserInfoCache()
      setSkipExpensiveDecrypt(false)
      if (isEmptyEncryptionSecret(val)) {
        sharedKeyStatus.value = 'missing'
        if (lastProbeUserIds.length) {
          await revalidateEncryptionKey(lastProbeUserIds)
        }
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
    const ids = lastProbeUserIds
    const gen = ++probeGeneration
    if (!ids.length) {
      if (gen !== probeGeneration) return keyStatus.value
      keyStatus.value = namePassword.value ? 'unknown' : 'missing'
      setSkipExpensiveDecrypt(false)
      return keyStatus.value
    }
    try {
      const result = await store.getters.probeEncryptionKey(ids)
      if (gen !== probeGeneration) return keyStatus.value
      // Banner is about the teacher zkek field; skip-nacl follows probe (admin credential included).
      keyStatus.value = !namePassword.value ? 'missing' : result
      setSkipExpensiveDecrypt(result === 'missing' || result === 'invalid')
    } catch (e) {
      if (gen !== probeGeneration) return keyStatus.value
      console.warn('[useEncryptionKey] probe failed', e)
      keyStatus.value = namePassword.value ? 'unknown' : 'missing'
      setSkipExpensiveDecrypt(false)
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
