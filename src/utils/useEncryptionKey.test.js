import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { effectScope, nextTick } from 'vue'
import { getSkipExpensiveDecrypt } from './decrypt-user-info-cache.js'
import {
  keyStatusAfterTeacherCodeOpened,
  resetUseEncryptionKeyForTests,
  skipExpensiveForKeyStatus,
  useEncryptionKey,
} from './useEncryptionKey.js'

function installLocalStorage() {
  const mem = new Map()
  const storage = {
    getItem: (key) => (mem.has(key) ? mem.get(key) : null),
    setItem: (key, value) => { mem.set(key, String(value)) },
    removeItem: (key) => { mem.delete(key) },
    clear: () => { mem.clear() },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  })
  return storage
}

function storeFor(userId, probeResult = 'unknown') {
  return {
    state: { user: userId },
    getters: {
      probeEncryptionKey: async () => probeResult,
    },
  }
}

beforeEach(() => {
  installLocalStorage()
  globalThis.Agent = {
    state: async () => ({}),
  }
  resetUseEncryptionKeyForTests()
})

afterEach(() => {
  resetUseEncryptionKeyForTests()
})

describe('skipExpensiveForKeyStatus', () => {
  // 'invalid' used to turn on the global skip flag. Old login-code students
  // then made every roster row Anonymous, including students created under
  // the new code. Skip is only for a missing code.
  it('is on only when the key status is missing', () => {
    assert.equal(skipExpensiveForKeyStatus('missing'), true)
    assert.equal(skipExpensiveForKeyStatus('invalid'), false)
    assert.equal(skipExpensiveForKeyStatus('unknown'), false)
    assert.equal(skipExpensiveForKeyStatus('ok'), false)
  })
})

describe('keyStatusAfterTeacherCodeOpened', () => {
  it('promotes invalid and unknown only for the current code', () => {
    assert.equal(keyStatusAfterTeacherCodeOpened('invalid', 'code', 'code'), 'ok')
    assert.equal(keyStatusAfterTeacherCodeOpened('unknown', 'code', 'code'), 'ok')
    assert.equal(keyStatusAfterTeacherCodeOpened('ok', 'code', 'code'), 'ok')
    assert.equal(keyStatusAfterTeacherCodeOpened('missing', 'code', 'code'), 'missing')
    assert.equal(keyStatusAfterTeacherCodeOpened('invalid', 'other', 'code'), 'invalid')
    assert.equal(keyStatusAfterTeacherCodeOpened('invalid', '   ', '   '), 'invalid')
  })
})

describe('useEncryptionKey probe skip', () => {
  it('does not skip nacl when the probe returns invalid', async () => {
    localStorage.setItem('zkek-teacher', 'correct horse')
    const api = useEncryptionKey(storeFor('teacher', 'invalid'))
    const status = await api.revalidateEncryptionKey(['student-old'])
    assert.equal(status, 'invalid')
    assert.equal(api.keyStatus.value, 'invalid')
    assert.equal(getSkipExpensiveDecrypt(), false)
  })

  it('skips nacl when there is no teacher code', async () => {
    const api = useEncryptionKey(storeFor('teacher', 'invalid'))
    const status = await api.revalidateEncryptionKey(['student-old'])
    assert.equal(status, 'missing')
    assert.equal(getSkipExpensiveDecrypt(), true)
  })
})

describe('shared key watcher lifetime', () => {
  it('keeps writing the raw code after the component scope that created it stops', async () => {
    const scope = effectScope()
    let api
    scope.run(() => {
      api = useEncryptionKey(storeFor('teacher', 'unknown'))
    })
    scope.stop()
    api.namePassword.value = 'Kept Code'
    await nextTick()
    assert.equal(localStorage.getItem('zkek-teacher'), 'Kept Code')
  })

  it('stops the previous user watcher when the user id changes', async () => {
    const first = useEncryptionKey(storeFor('teacher-a', 'unknown'))
    useEncryptionKey(storeFor('teacher-b', 'unknown'))
    first.namePassword.value = 'should-not-stick'
    await nextTick()
    assert.equal(localStorage.getItem('zkek-teacher-a'), null)
  })
})

describe('code change after a roster probe', () => {
  // The detached watcher re-probes the last roster on a code change. It used
  // to call a function that only existed inside useEncryptionKey, so the
  // change threw and the new public key was never published.
  it('re-probes and publishes without throwing', async () => {
    const published = {}
    globalThis.Agent = { state: async () => published }
    let probes = 0
    const store = {
      state: { user: 'teacher-r' },
      getters: { probeEncryptionKey: async () => { probes += 1; return 'ok' } },
    }
    const k = useEncryptionKey(store)
    await k.revalidateEncryptionKey(['s1', 's2'])
    const before = probes
    k.namePassword.value = 'new-code'
    for (let i = 0; i < 5; i++) { await nextTick(); await new Promise(r => setTimeout(r, 10)) }
    assert.ok(probes > before)
    assert.equal(k.keyStatus.value, 'ok')
    assert.equal(localStorage.getItem('zkek-teacher-r'), 'new-code')
    // Publishing needs tweetnacl ESM exports, which plain node:test lacks. The
    // offline repro (repro-logic-fixed.mjs) covers it with shims.
  })

  it('keeps ok after a real decrypt confirmed the current code', async () => {
    const { notifyTeacherDecryptSuccess } = await import('./decrypt-user-info-cache.js')
    localStorage.setItem('zkek-teacher-c', 'code-c')
    const store = {
      state: { user: 'teacher-c' },
      getters: { probeEncryptionKey: async () => 'invalid' },
    }
    const k = useEncryptionKey(store)
    assert.equal(await k.revalidateEncryptionKey(['old1']), 'invalid')
    notifyTeacherDecryptSuccess('code-c')
    assert.equal(k.keyStatus.value, 'ok')
    assert.equal(await k.revalidateEncryptionKey(['old1']), 'ok')
  })
})

describe('watcher ordering and admin key', () => {
  // Page watchers (decrypted-name, view-submissions) read localStorage as soon
  // as the code ref changes. The shared watcher must have written it first.
  // Vue sorts a watcher with no component last, so component watchers would
  // otherwise read the old code. The write must happen synchronously.
  it('writes the new code synchronously, before any component watcher runs', () => {
    const k = useEncryptionKey(storeFor('teacher-o'))
    k.namePassword.value = 'code-o'
    assert.equal(localStorage.getItem('zkek-teacher-o'), 'code-o')
    assert.equal(k.keyStatus.value, 'unknown')
  })

  it('does not skip nacl with no teacher code when an admin key is stored', async () => {
    localStorage.setItem('zkek-a-admin-x', 'admin-secret')
    const api = useEncryptionKey(storeFor('admin-x'))
    assert.equal(getSkipExpensiveDecrypt(), false)
    assert.equal(await api.revalidateEncryptionKey(['s1']), 'missing')
    assert.equal(getSkipExpensiveDecrypt(), false)
    assert.equal(skipExpensiveForKeyStatus('missing', true), false)
  })

  it('does not turn the skip on before any probe (pages that never probe)', () => {
    useEncryptionKey(storeFor('admin-y'))
    assert.equal(getSkipExpensiveDecrypt(), false)
  })

  it('setEncryptionCode writes through when only localStorage lost the code', async () => {
    localStorage.setItem('zkek-teacher-m', 'code-m')
    const k = useEncryptionKey(storeFor('teacher-m'))
    localStorage.removeItem('zkek-teacher-m') // e.g. logout in another tab
    assert.equal(await k.setEncryptionCode('code-m'), true)
    assert.equal(localStorage.getItem('zkek-teacher-m'), 'code-m')
    assert.equal(await k.setEncryptionCode('   '), false)
  })
})
