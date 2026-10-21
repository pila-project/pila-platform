import { ref, computed, watch, effectScope, onScopeDispose } from 'vue'
import { isEmptyEncryptionSecret, publishDerivedPublicKey } from './publish-derived-public-key.js'
import {
  clearDecryptUserInfoCache,
  setSkipExpensiveDecrypt,
  subscribeTeacherDecryptSuccess,
} from './decrypt-user-info-cache.js'

let sharedNamePassword = null
let sharedUserId = null
/** @type {import('vue').Ref<'missing'|'ok'|'invalid'|'unknown'>|null} */
let sharedKeyStatus = null
/** Last student ids used for probing (so key changes can re-probe) */
let lastProbeUserIds = []
/** Drop stale probe results so an older invalid cannot overwrite a newer key. */
let probeGeneration = 0
/**
 * True once a real decrypt opened a student with the CURRENT code this session.
 * A later probe (which samples at most 12 students) must not turn that 'ok'
 * back into 'invalid'. Reset whenever the code changes.
 */
let teacherCodeConfirmed = false
/** Detached scope so the key watcher outlives the component that first subscribed. */
let keyWatchScope = null
/** Latest store passed to useEncryptionKey; the probe getter lives on it. */
let sharedStore = null

/**
 * Global skip is only for "no teacher code". A probe result of 'invalid'
 * used to skip nacl for every roster row, which hid new students and
 * re-logged-in students after a code reset.
 */
export function skipExpensiveForKeyStatus(status, hasAdminSecret = false) {
  // An admin credential key can still open admin-created accounts (role-table).
  return status === 'missing' && !hasAdminSecret
}

function hasStoredAdminSecret() {
  try {
    // Same key as adminCredentialSecretStorageKey() in teacher-login-credentials.js
    // (not imported: that module pulls tweetnacl into node tests).
    return !!sharedUserId && !isEmptyEncryptionSecret(localStorage.getItem(`zkek-a-${sharedUserId}`))
  } catch {
    return false
  }
}

function applySkipForStatus(status) {
  setSkipExpensiveDecrypt(skipExpensiveForKeyStatus(status, hasStoredAdminSecret()))
}

/** Flip invalid/unknown to ok only when the opened code is still the current one. */
export function keyStatusAfterTeacherCodeOpened(currentStatus, openedCode, currentCode) {
  if (isEmptyEncryptionSecret(openedCode) || openedCode !== currentCode) return currentStatus
  if (currentStatus === 'invalid' || currentStatus === 'unknown') return 'ok'
  return currentStatus
}

/**
 * Module-level so the detached key watcher can call it too (it outlives any
 * component that called useEncryptionKey).
 */
async function revalidateEncryptionKey(userIds = []) {
  if (!sharedNamePassword || !sharedKeyStatus || !sharedStore) return 'unknown'
  const namePassword = sharedNamePassword
  const keyStatus = sharedKeyStatus
  const store = sharedStore
  if (Array.isArray(userIds) && userIds.length) {
    lastProbeUserIds = [...userIds]
  }
  const ids = lastProbeUserIds
  const gen = ++probeGeneration
  if (!ids.length) {
    if (gen !== probeGeneration) return keyStatus.value
    keyStatus.value = isEmptyEncryptionSecret(namePassword.value) ? 'missing' : 'unknown'
    applySkipForStatus(keyStatus.value)
    return keyStatus.value
  }
  try {
    const result = await store.getters.probeEncryptionKey(ids)
    if (gen !== probeGeneration) return keyStatus.value
    if (
      teacherCodeConfirmed
      && !isEmptyEncryptionSecret(namePassword.value)
    ) {
      keyStatus.value = 'ok'
      setSkipExpensiveDecrypt(false)
      return keyStatus.value
    }
    // Banner is about the teacher zkek field. Skip follows status, not a failed probe.
    keyStatus.value = isEmptyEncryptionSecret(namePassword.value) ? 'missing' : result
    applySkipForStatus(keyStatus.value)
  } catch (e) {
    if (gen !== probeGeneration) return keyStatus.value
    console.warn('[useEncryptionKey] probe failed', e)
    keyStatus.value = isEmptyEncryptionSecret(namePassword.value) ? 'missing' : 'unknown'
    applySkipForStatus(keyStatus.value)
  }
  return keyStatus.value
}

function bindSharedKeyEffects(userId) {
  if (keyWatchScope) {
    keyWatchScope.stop()
    keyWatchScope = null
  }
  keyWatchScope = effectScope(true)
  keyWatchScope.run(() => {
    watch(sharedNamePassword, async (val) => {
      probeGeneration += 1
      teacherCodeConfirmed = false
      clearDecryptUserInfoCache()
      setSkipExpensiveDecrypt(false)
      if (isEmptyEncryptionSecret(val)) {
        sharedKeyStatus.value = 'missing'
        applySkipForStatus('missing')
        if (lastProbeUserIds.length) {
          await revalidateEncryptionKey(lastProbeUserIds)
        }
        return
      }
      localStorage.setItem(`zkek-${userId}`, val)
      // Until re-probed, don't assume valid
      sharedKeyStatus.value = 'unknown'
      setSkipExpensiveDecrypt(false)
      if (lastProbeUserIds.length) {
        await revalidateEncryptionKey(lastProbeUserIds)
      }
      try {
        await publishDerivedPublicKey(val)
      } catch (e) {
        console.warn('[useEncryptionKey] public key update failed', e)
      }
    }, {
      // Sync: write localStorage and clear the name cache BEFORE component
      // watchers (decrypted-name, view-submissions) re-read the code. A
      // detached watcher would otherwise run last and those pages would keep
      // names cached under the old code.
      flush: 'sync',
    })

    const unsubscribe = subscribeTeacherDecryptSuccess((code) => {
      if (!sharedNamePassword || !sharedKeyStatus) return
      const next = keyStatusAfterTeacherCodeOpened(
        sharedKeyStatus.value,
        code,
        sharedNamePassword.value,
      )
      if (next !== 'ok' || sharedKeyStatus.value === 'ok') return
      teacherCodeConfirmed = true
      sharedKeyStatus.value = 'ok'
      setSkipExpensiveDecrypt(false)
    })
    onScopeDispose(unsubscribe)
  })
}

export function useEncryptionKey(store) {
  const userId = store.state.user
  sharedStore = store

  if (!sharedNamePassword || sharedUserId !== userId) {
    sharedUserId = userId
    const stored = localStorage.getItem(`zkek-${userId}`) || ''
    sharedNamePassword = ref(stored)
    sharedKeyStatus = ref(isEmptyEncryptionSecret(stored) ? 'missing' : 'unknown')
    lastProbeUserIds = []
    probeGeneration += 1
    teacherCodeConfirmed = false
    // As on ui-dev: only a roster probe (Manage Classes) turns the skip on.
    // Pages that never probe (admin, dashboards) keep trying every key.
    setSkipExpensiveDecrypt(false)
    bindSharedKeyEffects(userId)
  }

  const namePassword = sharedNamePassword
  const keyStatus = sharedKeyStatus
  const hasEncryptionKey = computed(() => !!namePassword.value && !isEmptyEncryptionSecret(namePassword.value))
  /** Empty key OR key present but failed to decrypt student data */
  const needsEncryptionAttention = computed(() =>
    keyStatus.value === 'missing' || keyStatus.value === 'invalid'
  )
  const isEncryptionKeyMissing = computed(() => keyStatus.value === 'missing')
  const isEncryptionKeyInvalid = computed(() => keyStatus.value === 'invalid')

  const showEncryptionKeyModal = ref(false)

  function openEncryptionKeyModal() { showEncryptionKeyModal.value = true }
  function closeEncryptionKeyModal() { showEncryptionKeyModal.value = false }

  /**
   * Commit a code from the dialog. If the ref already holds it but this
   * browser's stored copy differs (e.g. logout in another tab), write it
   * through so create and decrypt read the same code.
   */
  async function setEncryptionCode(code) {
    if (isEmptyEncryptionSecret(code)) return false
    if (namePassword.value !== code) {
      namePassword.value = code
      return true
    }
    if (localStorage.getItem(`zkek-${userId}`) !== code) {
      localStorage.setItem(`zkek-${userId}`, code)
      clearDecryptUserInfoCache()
      try {
        await publishDerivedPublicKey(code)
      } catch (e) {
        console.warn('[useEncryptionKey] public key update failed', e)
      }
      return true
    }
    return false
  }

  return {
    setEncryptionCode,
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

/** Test-only: drop the detached watcher and shared refs between cases. */
export function resetUseEncryptionKeyForTests() {
  if (keyWatchScope) {
    keyWatchScope.stop()
    keyWatchScope = null
  }
  sharedNamePassword = null
  sharedUserId = null
  sharedKeyStatus = null
  sharedStore = null
  lastProbeUserIds = []
  probeGeneration += 1
  teacherCodeConfirmed = false
  subscribeTeacherDecryptSuccess(null)
  setSkipExpensiveDecrypt(false)
}
