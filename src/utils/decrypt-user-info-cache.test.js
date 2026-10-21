import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  DECRYPT_USER_INFO_CONCURRENCY,
  activeDecryptCountForTests,
  clearDecryptUserInfoCache,
  configureKeyPairDerivation,
  decryptUserInfoWithCache,
  decryptUserRevision,
  invalidateDecryptUserInfo,
  enqueueDecryptUserIds,
  getSkipExpensiveDecrypt,
  isAnonymousInfo,
  makeDecryptCacheKey,
  markAnonymousInfo,
  memoizedKeyPair,
  NEGATIVE_DECRYPT_TTL_MS,
  notifyTeacherDecryptSuccess,
  normalizeUserInfoSource,
  providerKeyFingerprint,
  providerKeysForNameLookup,
  resetDecryptUserInfoCacheForTests,
  resolvePublicUserInfo,
  setDecryptCacheNowForTests,
  setSkipExpensiveDecrypt,
  subscribeTeacherDecryptSuccess,
  shouldSkipNaclAfterPublicInfo,
  shouldUsePublicUserInfo,
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

  it('invalidateDecryptUserInfo drops one user and bumps that revision', async () => {
    await decryptUserInfoWithCache({
      userId: 'u1',
      useAlias: false,
      fingerprint: 'fp',
      run: async () => ({ name: 'Ada' }),
    })
    await decryptUserInfoWithCache({
      userId: 'u2',
      useAlias: false,
      fingerprint: 'fp',
      run: async () => ({ name: 'Bea' }),
    })
    invalidateDecryptUserInfo('u1')
    assert.equal(decryptUserRevision('u1'), 1)
    assert.equal(decryptUserRevision('u2'), 0)
    let calls = 0
    const again = await decryptUserInfoWithCache({
      userId: 'u1',
      useAlias: false,
      fingerprint: 'fp',
      run: async () => {
        calls += 1
        return { name: 'Ada 2' }
      },
    })
    assert.equal(calls, 1)
    assert.equal(again.name, 'Ada 2')
    const kept = await decryptUserInfoWithCache({
      userId: 'u2',
      useAlias: false,
      fingerprint: 'fp',
      run: async () => ({ name: 'should-not-run' }),
    })
    assert.equal(kept.name, 'Bea')
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
  // The flag itself still skips nacl when set. Callers must set it only for
  // key status 'missing'. A probe result of 'invalid' used to set it and hid
  // every roster row; that is no longer the case (see useEncryptionKey.test.js).
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

describe('user-info source', () => {
  it('normalizeUserInfoSource treats only exact roster as roster', () => {
    assert.equal(normalizeUserInfoSource(), 'directory')
    assert.equal(normalizeUserInfoSource(undefined), 'directory')
    assert.equal(normalizeUserInfoSource(null), 'directory')
    assert.equal(normalizeUserInfoSource('directory'), 'directory')
    assert.equal(normalizeUserInfoSource('roster'), 'roster')
    assert.equal(normalizeUserInfoSource('Roster'), 'directory')
    assert.equal(normalizeUserInfoSource('other'), 'directory')
  })

  it('shouldUsePublicUserInfo is true for directory only', () => {
    assert.equal(shouldUsePublicUserInfo('directory'), true)
    assert.equal(shouldUsePublicUserInfo(), true)
    assert.equal(shouldUsePublicUserInfo('roster'), false)
  })

  it('resolvePublicUserInfo returns public name for directory only', () => {
    const info = { name: 'Ada', picture: 'x' }
    assert.equal(resolvePublicUserInfo(info, 'directory'), info)
    assert.equal(resolvePublicUserInfo(info), info)
    assert.equal(resolvePublicUserInfo(info, 'roster'), null)
    assert.equal(resolvePublicUserInfo({}, 'directory'), null)
    assert.equal(resolvePublicUserInfo(null, 'directory'), null)
  })

  it('roster ignores the admin credential until the teacher key is present', () => {
    assert.deepEqual(providerKeysForNameLookup('roster', '', 'admin-secret'), [])
    assert.deepEqual(providerKeysForNameLookup('roster', '   ', 'admin-secret'), [])
    assert.deepEqual(providerKeysForNameLookup('roster', null, 'admin-secret'), [])
    assert.deepEqual(
      providerKeysForNameLookup('roster', 'teacher-key', 'admin-secret'),
      ['teacher-key', 'admin-secret']
    )
    assert.deepEqual(providerKeysForNameLookup('roster', 'teacher-key', ''), ['teacher-key'])
    assert.deepEqual(providerKeysForNameLookup('roster', 'same', 'same'), ['same'])
  })

  it('directory still uses a public profile and the admin credential with no teacher key', () => {
    assert.deepEqual(
      providerKeysForNameLookup('directory', '', 'admin-secret'),
      ['admin-secret']
    )
    assert.deepEqual(providerKeysForNameLookup(undefined, '', 'admin-secret'), ['admin-secret'])
    assert.deepEqual(providerKeysForNameLookup('directory', 'teacher-key', ''), ['teacher-key'])
  })

  it('roster skipExpensive anonymizes even with a public name', () => {
    setSkipExpensiveDecrypt(true)
    assert.equal(shouldSkipNaclAfterPublicInfo({ name: 'Ada' }, 'directory'), false)
    assert.equal(shouldSkipNaclAfterPublicInfo({ name: 'Ada' }, 'roster'), true)
    assert.equal(shouldSkipNaclAfterPublicInfo({}, 'roster'), true)
    assert.equal(shouldSkipNaclAfterPublicInfo({}, 'directory'), true)
    setSkipExpensiveDecrypt(false)
    assert.equal(shouldSkipNaclAfterPublicInfo({ name: 'Ada' }, 'roster'), false)
  })

  it('cache key last segment stays userId so invalidate still matches', () => {
    const key = makeDecryptCacheKey('u1', false, 'zkek\u001fadmin', 'roster')
    assert.equal(key.endsWith('\u001fu1'), true)
    assert.ok(key.includes('\u001froster\u001f'))
  })

  it('directory and roster cache keys do not share a hit', async () => {
    let calls = 0
    const dir = await decryptUserInfoWithCache({
      userId: 'u1',
      useAlias: false,
      fingerprint: 'fp',
      source: 'directory',
      run: async () => {
        calls += 1
        return { name: 'Public Ada' }
      },
    })
    const roster = await decryptUserInfoWithCache({
      userId: 'u1',
      useAlias: false,
      fingerprint: 'fp',
      source: 'roster',
      run: async () => {
        calls += 1
        return { name: 'anon_u1xx' }
      },
    })
    assert.equal(calls, 2)
    assert.equal(dir.name, 'Public Ada')
    assert.equal(roster.name, 'anon_u1xx')
    const dirAgain = await decryptUserInfoWithCache({
      userId: 'u1',
      useAlias: false,
      fingerprint: 'fp',
      source: 'directory',
      run: async () => {
        calls += 1
        return { name: 'should-not-run' }
      },
    })
    assert.equal(calls, 2)
    assert.equal(dirAgain.name, 'Public Ada')
  })

  it('omitted source shares the directory cache', async () => {
    let calls = 0
    const run = async () => {
      calls += 1
      return { name: 'Ada' }
    }
    await decryptUserInfoWithCache({ userId: 'u1', useAlias: false, fingerprint: 'fp', run })
    await decryptUserInfoWithCache({
      userId: 'u1', useAlias: false, fingerprint: 'fp', source: 'directory', run,
    })
    assert.equal(calls, 1)
  })

  it('invalidateDecryptUserInfo drops both roster and directory keys', async () => {
    await decryptUserInfoWithCache({
      userId: 'u1', useAlias: false, fingerprint: 'fp', source: 'directory',
      run: async () => ({ name: 'Ada' }),
    })
    await decryptUserInfoWithCache({
      userId: 'u1', useAlias: false, fingerprint: 'fp', source: 'roster',
      run: async () => ({ name: 'anon' }),
    })
    invalidateDecryptUserInfo('u1')
    let calls = 0
    await decryptUserInfoWithCache({
      userId: 'u1', useAlias: false, fingerprint: 'fp', source: 'directory',
      run: async () => { calls += 1; return { name: 'Ada 2' } },
    })
    await decryptUserInfoWithCache({
      userId: 'u1', useAlias: false, fingerprint: 'fp', source: 'roster',
      run: async () => { calls += 1; return { name: 'anon 2' } },
    })
    assert.equal(calls, 2)
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

describe('anonymous decrypt TTL', () => {
  it('marks anonymous results and expires only those', async () => {
    const anon = markAnonymousInfo({ name: 'Anonymous_abcd', picture: null })
    assert.equal(isAnonymousInfo(anon), true)
    assert.equal(isAnonymousInfo({ name: 'Anonymous_abcd', picture: null }), false)
    assert.equal(isAnonymousInfo(null), false)

    let now = 1_000_000
    setDecryptCacheNowForTests(() => now)
    let calls = 0
    const run = async () => {
      calls += 1
      return calls === 1 ? anon : { name: 'Nok' }
    }
    const args = { userId: 'u1', useAlias: false, fingerprint: 'fp', run }
    const first = await decryptUserInfoWithCache(args)
    const cached = await decryptUserInfoWithCache(args)
    assert.equal(calls, 1)
    assert.equal(first, cached)
    assert.equal(isAnonymousInfo(cached), true)

    now += NEGATIVE_DECRYPT_TTL_MS - 1
    const still = await decryptUserInfoWithCache(args)
    assert.equal(calls, 1)
    assert.equal(still, anon)

    now += 1
    const retried = await decryptUserInfoWithCache(args)
    assert.equal(calls, 2)
    assert.equal(retried.name, 'Nok')
    assert.equal(isAnonymousInfo(retried), false)

    const kept = await decryptUserInfoWithCache(args)
    assert.equal(calls, 2)
    assert.equal(kept.name, 'Nok')
    now += NEGATIVE_DECRYPT_TTL_MS * 10
    const stillKept = await decryptUserInfoWithCache(args)
    assert.equal(calls, 2)
    assert.equal(stillKept.name, 'Nok')
  })
})

describe('memoizedKeyPair', () => {
  beforeEach(() => {
    let n = 0
    configureKeyPairDerivation(async (code) => ({ code, n: ++n }))
  })

  it('reuses a code and drops the memo when the decrypt cache clears', async () => {
    const first = memoizedKeyPair('same-code')
    const second = memoizedKeyPair('same-code')
    assert.equal(first, second)
    const pair = await first
    assert.equal(pair.code, 'same-code')
    clearDecryptUserInfoCache()
    const third = memoizedKeyPair('same-code')
    assert.notEqual(third, first)
    const againPair = await third
    assert.notEqual(againPair.n, pair.n)
  })

  it('keeps at most four codes', async () => {
    const oldest = memoizedKeyPair('code-0')
    memoizedKeyPair('code-1')
    memoizedKeyPair('code-2')
    memoizedKeyPair('code-3')
    const newest = memoizedKeyPair('code-4')
    const again = memoizedKeyPair('code-0')
    assert.notEqual(again, oldest)
    assert.equal(memoizedKeyPair('code-4'), newest)
  })

  it('does not derive a key from an empty or whitespace code', async () => {
    await assert.rejects(() => memoizedKeyPair(''), /empty/)
    await assert.rejects(() => memoizedKeyPair('   '), /empty/)
    await assert.rejects(() => memoizedKeyPair(null), /empty/)
  })
})

describe('teacher decrypt success', () => {
  it('notifies the current listener and ignores an empty code', () => {
    const seen = []
    const stop = subscribeTeacherDecryptSuccess((code) => { seen.push(code) })
    notifyTeacherDecryptSuccess('teacher-code')
    notifyTeacherDecryptSuccess('')
    notifyTeacherDecryptSuccess('   ')
    stop()
    notifyTeacherDecryptSuccess('after-stop')
    assert.deepEqual(seen, ['teacher-code'])
  })
})
