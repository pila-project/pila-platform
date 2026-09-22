import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  DECRYPT_USER_INFO_CONCURRENCY,
  activeDecryptCountForTests,
  clearDecryptUserInfoCache,
  decryptUserInfoWithCache,
  enqueueDecryptUserIds,
  getSkipExpensiveDecrypt,
  providerKeyFingerprint,
  resetDecryptUserInfoCacheForTests,
  setSkipExpensiveDecrypt,
  shouldSkipNaclAfterPublicInfo,
} from './decrypt-user-info-cache.js'

function delay(ms = 20) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

beforeEach(() => {
  resetDecryptUserInfoCacheForTests()
})

afterEach(() => {
  resetDecryptUserInfoCacheForTests()
})

describe('providerKeyFingerprint', () => {
  it('joins non-empty keys; empty list is empty string', () => {
    assert.equal(providerKeyFingerprint(['zkek', 'admin']), 'zkek\u001fadmin')
    assert.equal(providerKeyFingerprint(['', null, 'zkek']), 'zkek')
    assert.equal(providerKeyFingerprint([]), '')
  })
})

describe('decryptUserInfoWithCache', () => {
  it('second call with the same key does not invoke decrypt again', async () => {
    let calls = 0
    const run = async () => {
      calls += 1
      return { name: 'Ada', picture: null }
    }
    const args = { userId: 'u1', useAlias: false, fingerprint: 'fp', run }
    const a = await decryptUserInfoWithCache(args)
    const b = await decryptUserInfoWithCache(args)
    assert.equal(calls, 1)
    assert.equal(a, b)
    assert.equal(a.name, 'Ada')
  })

  it('overlapping calls share one in-flight promise', async () => {
    let calls = 0
    let release
    const gate = new Promise(resolve => { release = resolve })
    const run = async () => {
      calls += 1
      await gate
      return { name: 'Bea' }
    }
    const p1 = decryptUserInfoWithCache({ userId: 'u1', useAlias: false, fingerprint: 'fp', run })
    const p2 = decryptUserInfoWithCache({ userId: 'u1', useAlias: false, fingerprint: 'fp', run })
    release()
    const [a, b] = await Promise.all([p1, p2])
    assert.equal(calls, 1)
    assert.equal(a, b)
    assert.equal(a.name, 'Bea')
  })

  it('key fingerprint change misses cache', async () => {
    let calls = 0
    const run = async () => {
      calls += 1
      return { name: `n${calls}` }
    }
    const first = await decryptUserInfoWithCache({
      userId: 'u1', useAlias: false, fingerprint: 'fp-a', run,
    })
    const second = await decryptUserInfoWithCache({
      userId: 'u1', useAlias: false, fingerprint: 'fp-b', run,
    })
    assert.equal(calls, 2)
    assert.equal(first.name, 'n1')
    assert.equal(second.name, 'n2')
  })

  it('clearDecryptUserInfoCache drops results so the next call runs again', async () => {
    let calls = 0
    const run = async () => {
      calls += 1
      return { name: `n${calls}` }
    }
    await decryptUserInfoWithCache({ userId: 'u1', useAlias: false, fingerprint: 'fp', run })
    clearDecryptUserInfoCache()
    await decryptUserInfoWithCache({ userId: 'u1', useAlias: false, fingerprint: 'fp', run })
    assert.equal(calls, 2)
  })
})

describe('skipExpensive decrypt', () => {
  it('skip-path anonymous stays cached under the same fingerprint until clear', async () => {
    setSkipExpensiveDecrypt(true)
    let naclCalls = 0
    const run = async () => {
      if (shouldSkipNaclAfterPublicInfo({})) return { name: 'anon_u1xx' }
      naclCalls += 1
      return { name: 'Real' }
    }
    const args = { userId: 'u1', useAlias: false, fingerprint: 'fp', run }
    const skipped = await decryptUserInfoWithCache(args)
    setSkipExpensiveDecrypt(false)
    const stillCached = await decryptUserInfoWithCache(args)
    assert.equal(skipped.name, 'anon_u1xx')
    assert.equal(stillCached.name, 'anon_u1xx')
    assert.equal(naclCalls, 0)
    clearDecryptUserInfoCache()
    const retried = await decryptUserInfoWithCache(args)
    assert.equal(retried.name, 'Real')
    assert.equal(naclCalls, 1)
  })

  it('public info still wins; anonymous fallback does not call nacl stub', async () => {
    setSkipExpensiveDecrypt(true)
    assert.equal(getSkipExpensiveDecrypt(), true)
    assert.equal(shouldSkipNaclAfterPublicInfo({ name: 'Ada' }), false)
    assert.equal(shouldSkipNaclAfterPublicInfo({}), true)
    assert.equal(shouldSkipNaclAfterPublicInfo(null), true)

    let naclCalls = 0
    const publicHit = await decryptUserInfoWithCache({
      userId: 'pub',
      useAlias: false,
      fingerprint: '',
      run: async () => {
        const publicInfo = { name: 'Ada', picture: null }
        if (publicInfo?.name) return publicInfo
        if (shouldSkipNaclAfterPublicInfo(publicInfo)) return { name: 'anon_pub' }
        naclCalls += 1
        return { name: 'secret' }
      },
    })
    const skipped = await decryptUserInfoWithCache({
      userId: 'enc',
      useAlias: false,
      fingerprint: '',
      run: async () => {
        const publicInfo = {}
        if (publicInfo?.name) return publicInfo
        if (shouldSkipNaclAfterPublicInfo(publicInfo)) return { name: 'anon_encx' }
        naclCalls += 1
        return { name: 'secret' }
      },
    })
    assert.equal(publicHit.name, 'Ada')
    assert.equal(skipped.name, 'anon_encx')
    assert.equal(naclCalls, 0)
  })
})

describe('decrypt concurrency cap', () => {
  it('never exceeds 4 in-flight fake async decrypts', async () => {
    let current = 0
    let max = 0
    const jobs = Array.from({ length: 12 }, (_, i) =>
      decryptUserInfoWithCache({
        userId: `u${i}`,
        useAlias: false,
        fingerprint: 'fp',
        run: async () => {
          current += 1
          if (current > max) max = current
          assert.ok(
            activeDecryptCountForTests() <= DECRYPT_USER_INFO_CONCURRENCY,
            `slot count ${activeDecryptCountForTests()} exceeded cap`,
          )
          await delay(15)
          current -= 1
          return { name: `n${i}` }
        },
      }),
    )
    await Promise.all(jobs)
    assert.ok(max <= DECRYPT_USER_INFO_CONCURRENCY, `max in-flight ${max} exceeded cap`)
    assert.equal(max, DECRYPT_USER_INFO_CONCURRENCY)
  })
})

describe('enqueueDecryptUserIds', () => {
  it('runs high-lane ids before low-lane ids when queued in the same tick', async () => {
    const order = []
    const run = async (id) => { order.push(id) }
    enqueueDecryptUserIds(['high-1'], { owner: 'test', priority: 'high', run })
    enqueueDecryptUserIds(['low-1', 'low-2'], { owner: 'test', priority: 'low', run })
    await delay(80)
    assert.deepEqual(order, ['high-1', 'low-1', 'low-2'])
  })
})
