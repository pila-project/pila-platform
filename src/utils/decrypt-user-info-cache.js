/**
 * Single-flight + result cache + concurrency cap for decryptUserInfo.
 * Cache key is (userId, useAlias, providerKeyFingerprint). Do not log the fingerprint.
 */

import { reactive } from 'vue'

export const DECRYPT_USER_INFO_CONCURRENCY = 4

const results = new Map()
const inflight = new Map()
export const decryptRevision = reactive({})
let skipExpensive = false
let activeDecrypts = 0
const waiters = []

const highLane = []
const lowLane = []
const queuedJobKeys = new Set()
let pumpActive = false

export function providerKeyFingerprint(keys) {
  return (keys || []).filter(Boolean).join('\u001f')
}

export function makeDecryptCacheKey(userId, useAlias, fingerprint) {
  return `${useAlias ? 'a' : 'n'}\u001f${fingerprint || ''}\u001f${userId || ''}`
}

export function setSkipExpensiveDecrypt(value) {
  skipExpensive = !!value
}

export function getSkipExpensiveDecrypt() {
  return skipExpensive
}

/** Public user-info still wins; skip nacl only when there is no public name. */
export function shouldSkipNaclAfterPublicInfo(publicInfo) {
  if (publicInfo?.name) return false
  return skipExpensive
}

export function clearDecryptUserInfoCache() {
  results.clear()
  inflight.clear()
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

export async function decryptUserInfoWithCache({ userId, useAlias, fingerprint, run }) {
  const key = makeDecryptCacheKey(userId, useAlias, fingerprint)
  if (results.has(key)) return results.get(key)
  if (inflight.has(key)) return inflight.get(key)

  const promise = (async () => {
    await acquireDecryptSlot()
    try {
      const value = await run()
      results.set(key, value)
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

export function activeDecryptCountForTests() {
  return activeDecrypts
}
