/**
 * Single-flight + result cache + concurrency cap for decryptUserInfo.
 * Cache key is (userId, useAlias, providerKeyFingerprint, source). Do not log the fingerprint.
 */

import { reactive } from 'vue'
import { isEmptyEncryptionSecret } from './publish-derived-public-key.js'

export const DECRYPT_USER_INFO_CONCURRENCY = 4
/** Failed (anonymous) decrypts are retried after this. Successful plaintext stays cached. */
export const NEGATIVE_DECRYPT_TTL_MS = 60000
const KEY_PAIR_MEMO_MAX = 4

const results = new Map()
const inflight = new Map()
/** code string -> Promise<keyPair>. Not logged. Cleared with the decrypt cache. */
const keyPairMemo = new Map()
/** Injected so this module does not import tweetnacl (node:test loads it directly). */
let deriveKeyPair = null
let anonymousInfos = new WeakSet()
export const decryptRevision = reactive({})
let skipExpensive = false
let teacherDecryptSuccessListener = null
let decryptCacheNow = () => Date.now()
let activeDecrypts = 0
const waiters = []

const highLane = []
const lowLane = []
const queuedJobKeys = new Set()
let pumpActive = false

export function providerKeyFingerprint(keys) {
  return (keys || []).filter(Boolean).join('\u001f')
}

export function normalizeUserInfoSource(source) {
  return source === 'roster' ? 'roster' : 'directory'
}

/** Directory (trainers, admins, role requests) may use public user-info. Roster may not. */
export function shouldUsePublicUserInfo(source) {
  return normalizeUserInfoSource(source) !== 'roster'
}

export function resolvePublicUserInfo(userInfo, source) {
  if (shouldUsePublicUserInfo(source) && userInfo?.name) return userInfo
  return null
}

function presentEncryptionKey(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  return value
}

/**
 * Keys that may open a name.
 * Directory may use the teacher key and the admin credential.
 * A student roster uses neither until the teacher key itself is present,
 * so the admin credential cannot reveal a class list while that key is empty.
 * Once the teacher key is present, both are tried.
 */
export function providerKeysForNameLookup(source, teacherKey, adminKey) {
  const teacher = presentEncryptionKey(teacherKey)
  const admin = presentEncryptionKey(adminKey)
  if (normalizeUserInfoSource(source) === 'roster' && !teacher) return []
  return [teacher, admin].filter((value, index, values) => value && values.indexOf(value) === index)
}

export function makeDecryptCacheKey(userId, useAlias, fingerprint, source) {
  return `${useAlias ? 'a' : 'n'}\u001f${fingerprint || ''}\u001f${normalizeUserInfoSource(source)}\u001f${userId || ''}`
}

export function markAnonymousInfo(info) {
  if (info && typeof info === 'object') anonymousInfos.add(info)
  return info
}

export function isAnonymousInfo(info) {
  return !!info && typeof info === 'object' && anonymousInfos.has(info)
}

/**
 * Fired when a roster/directory decrypt opens with the teacher code itself
 * (not the admin credential). The listener must not log the code.
 */
export function subscribeTeacherDecryptSuccess(listener) {
  teacherDecryptSuccessListener = typeof listener === 'function' ? listener : null
  return () => {
    if (teacherDecryptSuccessListener === listener) teacherDecryptSuccessListener = null
  }
}

export function notifyTeacherDecryptSuccess(code) {
  if (isEmptyEncryptionSecret(code)) return
  teacherDecryptSuccessListener?.(code)
}

/** App startup passes generateKeyPair. Tests pass a fake. Empty codes never call it. */
export function configureKeyPairDerivation(derive) {
  deriveKeyPair = typeof derive === 'function' ? derive : null
}

/**
 * SHA-256 + scalar mult once per code string (roster-sized).
 * Empty/whitespace never reaches the derivation function.
 */
export function memoizedKeyPair(code) {
  if (isEmptyEncryptionSecret(code)) {
    return Promise.reject(new Error('Refusing to derive a key from an empty encryption code'))
  }
  if (typeof deriveKeyPair !== 'function') {
    return Promise.reject(new Error('Key pair derivation is not configured'))
  }
  const hit = keyPairMemo.get(code)
  if (hit) {
    keyPairMemo.delete(code)
    keyPairMemo.set(code, hit)
    return hit
  }
  const derive = deriveKeyPair
  const pending = Promise.resolve()
    .then(() => derive(code))
    .catch((error) => {
      if (keyPairMemo.get(code) === pending) keyPairMemo.delete(code)
      throw error
    })
  keyPairMemo.set(code, pending)
  while (keyPairMemo.size > KEY_PAIR_MEMO_MAX) {
    const oldest = keyPairMemo.keys().next().value
    keyPairMemo.delete(oldest)
  }
  return pending
}

export function setSkipExpensiveDecrypt(value) {
  skipExpensive = !!value
}

export function getSkipExpensiveDecrypt() {
  return skipExpensive
}

/**
 * Skip nacl when skipExpensive is on.
 * Directory still returns a public name first (caller short-circuits).
 * Roster skips nacl even when a public name exists, so class lists stay anonymous without a key.
 */
export function shouldSkipNaclAfterPublicInfo(publicInfo, source) {
  if (shouldUsePublicUserInfo(source) && publicInfo?.name) return false
  return skipExpensive
}

export function clearDecryptUserInfoCache() {
  results.clear()
  inflight.clear()
  keyPairMemo.clear()
}

function rememberResult(key, value, now = decryptCacheNow()) {
  const expiresAt = isAnonymousInfo(value) ? now + NEGATIVE_DECRYPT_TTL_MS : null
  results.set(key, { value, expiresAt })
  return value
}

function cachedResult(key, now = decryptCacheNow()) {
  const entry = results.get(key)
  if (!entry) return undefined
  if (entry.expiresAt != null && now >= entry.expiresAt) {
    results.delete(key)
    return undefined
  }
  return entry.value
}

function cacheKeyUserId(key) {
  const parts = String(key).split('\u001f')
  return parts[parts.length - 1] || ''
}

/** Drop one student's cached plaintext so open name components decrypt again. */
export function invalidateDecryptUserInfo(userId) {
  if (!userId) return
  for (const key of results.keys()) {
    if (cacheKeyUserId(key) === userId) results.delete(key)
  }
  for (const key of inflight.keys()) {
    if (cacheKeyUserId(key) === userId) inflight.delete(key)
  }
  decryptRevision[userId] = (decryptRevision[userId] || 0) + 1
}

export function decryptUserRevision(userId) {
  return decryptRevision[userId] || 0
}

export async function decryptUserInfoWithCache({ userId, useAlias, fingerprint, source, run }) {
  const key = makeDecryptCacheKey(userId, useAlias, fingerprint, source)
  if (results.has(key)) {
    const cached = cachedResult(key)
    if (cached !== undefined) return cached
  }
  if (inflight.has(key)) return inflight.get(key)

  const promise = (async () => {
    await acquireDecryptSlot()
    try {
      const value = await run()
      // A clear/invalidate during run must not put the stale value back.
      if (inflight.get(key) === promise) rememberResult(key, value)
      return value
    } finally {
      releaseDecryptSlot()
    }
  })()

  inflight.set(key, promise)
  try {
    return await promise
  } finally {
    if (inflight.get(key) === promise) inflight.delete(key)
  }
}

export async function withDecryptConcurrency(fn) {
  await acquireDecryptSlot()
  try {
    return await fn()
  } finally {
    releaseDecryptSlot()
  }
}

async function acquireDecryptSlot() {
  if (activeDecrypts < DECRYPT_USER_INFO_CONCURRENCY) {
    activeDecrypts += 1
    return
  }
  await new Promise(resolve => {
    waiters.push(resolve)
  })
  activeDecrypts += 1
}

function releaseDecryptSlot() {
  activeDecrypts = Math.max(0, activeDecrypts - 1)
  const next = waiters.shift()
  if (next) next()
}

export function yieldToMain() {
  if (typeof requestIdleCallback === 'function') {
    return new Promise(resolve => {
      requestIdleCallback(() => resolve(), { timeout: 50 })
    })
  }
  return new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Visible-page-first decrypt queue. High lane first, then low.
 * Starts at most DECRYPT_USER_INFO_CONCURRENCY jobs and yields between starts.
 */
export function enqueueDecryptUserIds(ids, { priority = 'low', run, owner = 'default' } = {}) {
  if (typeof run !== 'function') return
  const lane = priority === 'high' ? highLane : lowLane
  for (const id of ids || []) {
    if (!id) continue
    const jobKey = `${owner}::${id}`
    if (queuedJobKeys.has(jobKey)) {
      if (priority === 'high') promoteDecryptJob(jobKey)
      continue
    }
    queuedJobKeys.add(jobKey)
    lane.push({ id, run, jobKey })
  }
  void pumpDecryptQueue()
}

export function clearDecryptQueue(owner) {
  const prefix = `${owner}::`
  const keep = job => !String(job.jobKey).startsWith(prefix)
  for (const job of highLane) {
    if (!keep(job)) queuedJobKeys.delete(job.jobKey)
  }
  for (const job of lowLane) {
    if (!keep(job)) queuedJobKeys.delete(job.jobKey)
  }
  const nextHigh = highLane.filter(keep)
  const nextLow = lowLane.filter(keep)
  highLane.length = 0
  lowLane.length = 0
  highLane.push(...nextHigh)
  lowLane.push(...nextLow)
}

function promoteDecryptJob(jobKey) {
  const idx = lowLane.findIndex(job => job.jobKey === jobKey)
  if (idx === -1) return
  const [job] = lowLane.splice(idx, 1)
  highLane.push(job)
}

async function pumpDecryptQueue() {
  if (pumpActive) return
  pumpActive = true
  const running = new Set()
  try {
    while (highLane.length || lowLane.length || running.size) {
      while (
        running.size < DECRYPT_USER_INFO_CONCURRENCY &&
        (highLane.length || lowLane.length)
      ) {
        const job = highLane.length ? highLane.shift() : lowLane.shift()
        queuedJobKeys.delete(job.jobKey)
        const p = Promise.resolve()
          .then(() => job.run(job.id))
          .catch(() => {})
          .finally(() => { running.delete(p) })
        running.add(p)
        await yieldToMain()
      }
      if (running.size) await Promise.race(running)
    }
  } finally {
    pumpActive = false
    if (highLane.length || lowLane.length) void pumpDecryptQueue()
  }
}

/** Test-only: reset module globals between node:test cases. */
export function resetDecryptUserInfoCacheForTests() {
  results.clear()
  inflight.clear()
  keyPairMemo.clear()
  anonymousInfos = new WeakSet()
  teacherDecryptSuccessListener = null
  decryptCacheNow = () => Date.now()
  for (const key of Object.keys(decryptRevision)) delete decryptRevision[key]
  skipExpensive = false
  activeDecrypts = 0
  waiters.length = 0
  highLane.length = 0
  lowLane.length = 0
  queuedJobKeys.clear()
  pumpActive = false
}

export function decryptCacheSizeForTests() {
  return results.size
}

export function setDecryptCacheNowForTests(fn) {
  decryptCacheNow = typeof fn === 'function' ? fn : () => Date.now()
}

export function activeDecryptCountForTests() {
  return activeDecrypts
}
