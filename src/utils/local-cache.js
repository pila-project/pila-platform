import { ref } from 'vue'

const DB_NAME = 'pila-cache'
const STORE_NAME = 'cache'
const DEFAULT_TTL = 24 * 60 * 60 * 1000 // 24 hours

// Global revalidation counter — positive means background fetch in progress
const _revalidatingCount = ref(0)
export const isRevalidating = ref(false)

export function beginRevalidation() {
  _revalidatingCount.value++
  isRevalidating.value = true
}

export function endRevalidation() {
  _revalidatingCount.value = Math.max(0, _revalidatingCount.value - 1)
  if (_revalidatingCount.value === 0) isRevalidating.value = false
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, mode) {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function makeKey(userId, namespace, key) {
  return `${userId}:${namespace}:${key}`
}

export const localCache = {
  async get(userId, namespace, key, ttlMs = DEFAULT_TTL) {
    try {
      const db = await openDB()
      const entry = await idbRequest(tx(db, 'readonly').get(makeKey(userId, namespace, key)))
      db.close()
      if (!entry) return null
      if (Date.now() - entry.timestamp > ttlMs) return null
      return entry.data
    } catch {
      return null
    }
  },

  async set(userId, namespace, key, data) {
    try {
      const db = await openDB()
      await idbRequest(tx(db, 'readwrite').put({ data, timestamp: Date.now() }, makeKey(userId, namespace, key)))
      db.close()
    } catch { /* swallow — cache is best-effort */ }
  },

  async clearUser(userId) {
    try {
      const db = await openDB()
      const store = tx(db, 'readwrite')
      const allKeys = await idbRequest(store.getAllKeys())
      const prefix = `${userId}:`
      await Promise.all(
        allKeys
          .filter(k => k.startsWith(prefix))
          .map(k => idbRequest(store.delete(k)))
      )
      db.close()
    } catch { /* swallow */ }
  },

  async clearAll() {
    try {
      const db = await openDB()
      await idbRequest(tx(db, 'readwrite').clear())
      db.close()
    } catch { /* swallow */ }
  },
}
