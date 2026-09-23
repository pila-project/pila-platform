import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  nameCacheVersion,
  metadataCacheVersion,
  getContentName,
  getContentMetadata,
  prefetchBatch,
  prefetchContentNames,
  prefetchPageDetails,
  withCacheVersionBatch,
  invalidateAll,
  nameCache,
} from './content-cache.js'
import { EXPLORE_FILL_CONCURRENCY } from './explore-catalog-fill.js'

const ids = Array.from({ length: 12 }, (_, i) => (
  `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
))

function flushMicrotasks() {
  return new Promise(resolve => { queueMicrotask(resolve) })
}

beforeEach(async () => {
  invalidateAll()
  nameCache.clear()
  await flushMicrotasks()
})

afterEach(() => {
  invalidateAll()
})

function trackActiveIds() {
  const depth = new Map()
  let active = 0
  let maxActive = 0
  return {
    async enter(id) {
      const next = (depth.get(id) || 0) + 1
      depth.set(id, next)
      if (next === 1) {
        active += 1
        maxActive = Math.max(maxActive, active)
      }
      await new Promise(resolve => { setTimeout(resolve, 12) })
      const left = depth.get(id) - 1
      depth.set(id, left)
      if (left === 0) active -= 1
    },
    max() { return maxActive },
  }
}

describe('cache version bumps', () => {
  it('coalesces parallel name arrivals to one nameCacheVersion bump', async () => {
    let release
    const gate = new Promise(resolve => { release = resolve })
    globalThis.Agent = {
      state: async () => {
        await gate
        return { name: 'Named' }
      },
      query: async () => [],
      metadata: async () => ({ active_type: 'x' }),
    }
    const before = nameCacheVersion.value
    const pending = Promise.all(ids.slice(0, 4).map(id => getContentName(id, 'en')))
    release()
    await pending
    await flushMicrotasks()
    assert.equal(nameCacheVersion.value, before + 1)
  })

  it('bumps once at the end of a name batch, not once per id', async () => {
    let fetches = 0
    globalThis.Agent = {
      state: async () => {
        fetches += 1
        return { name: 'Named' }
      },
      query: async () => [],
    }
    const before = nameCacheVersion.value
    let mid = before
    await withCacheVersionBatch(async () => {
      await prefetchContentNames(ids, 'en')
      mid = nameCacheVersion.value
    })
    // Nested: inner batch does not flush while the outer hold is open.
    assert.equal(mid, before)
    assert.equal(nameCacheVersion.value, before + 1)
    assert.equal(fetches, ids.length)
  })

  it('bumps metadata once for a batch of getContentMetadata calls', async () => {
    globalThis.Agent = {
      metadata: async () => ({
        active_type: 'application/json',
        owner: 'u',
        created: '2020-01-01',
        updated: '2020-01-02',
        domain: 'pila',
      }),
    }
    const before = metadataCacheVersion.value
    await withCacheVersionBatch(async () => {
      await Promise.all(ids.map(id => getContentMetadata(id)))
      assert.equal(metadataCacheVersion.value, before)
    })
    assert.equal(metadataCacheVersion.value, before + 1)
  })
})

describe('catalog prefetch does not pull images', () => {
  it('prefetchContentNames does not download images, metadata, or per-id tags', async () => {
    let downloads = 0
    let metadataCalls = 0
    let tagQueries = 0
    globalThis.Agent = {
      state: async () => ({ name: 'Named', image: '11111111-1111-4111-8111-111111111111' }),
      query: async (name) => {
        if (name === 'taggings-for-target') tagQueries += 1
        return []
      },
      metadata: async () => {
        metadataCalls += 1
        return {}
      },
      download: () => {
        downloads += 1
        return { url: async () => 'https://cdn.example/x' }
      },
    }
    await prefetchContentNames(ids.slice(0, 3), 'en')
    assert.equal(downloads, 0)
    assert.equal(metadataCalls, 0)
    assert.equal(tagQueries, 0)
    for (const id of ids.slice(0, 3)) {
      assert.equal(nameCache.get(`${id}:en`), 'Named')
    }
  })

  it('prefetchBatch defaults to no images and caps in-flight ids', async () => {
    let downloads = 0
    const active = trackActiveIds()
    globalThis.Agent = {
      state: async (id) => {
        await active.enter(id)
        return { name: 'Named' }
      },
      metadata: async (id) => {
        await active.enter(id)
        return { active_type: 'x', owner: 'u', created: 1, updated: 1, domain: 'p' }
      },
      query: async () => [],
      download: () => {
        downloads += 1
        return { url: async () => '/logo-green.svg' }
      },
    }
    await prefetchBatch(ids, 'en', 'PILA Tag Hierarchy', null)
    assert.equal(downloads, 0)
    assert.ok(active.max() <= 6, `in flight peaked at ${active.max()}`)
    assert.ok(active.max() > 1, 'pool should overlap')
  })

  it('prefetchPageDetails is the path that loads images, still capped', async () => {
    let downloads = 0
    const active = trackActiveIds()
    globalThis.Agent = {
      state: async (id) => {
        await active.enter(id)
        return { name: 'Named', image: '22222222-2222-4222-8222-222222222222' }
      },
      metadata: async (id) => {
        await active.enter(id)
        return { active_type: 'x', owner: 'u', created: 1, updated: 1, domain: 'p' }
      },
      query: async () => [],
      download: () => {
        downloads += 1
        return { url: async () => '/logo-green.svg' }
      },
    }
    const page = ids.slice(0, 4)
    await prefetchPageDetails(page, 'en', 'PILA Tag Hierarchy', new Map())
    assert.equal(downloads, page.length)
    assert.ok(active.max() <= 6, `in flight peaked at ${active.max()}`)
  })
})

describe('name fill cancel and a second browser', () => {
  it('does not fetch the rest of a list after shouldContinue flips', async () => {
    let calls = 0
    let release
    const gate = new Promise(resolve => { release = resolve })
    globalThis.Agent = {
      state: async () => {
        calls += 1
        await gate
        return { name: 'Named' }
      },
      query: async () => [],
    }
    let go = true
    const pending = prefetchContentNames(ids, 'en', { shouldContinue: () => go })
    await flushMicrotasks()
    await flushMicrotasks()
    go = false
    release()
    await pending
    assert.ok(calls <= EXPLORE_FILL_CONCURRENCY, `started ${calls} name fetches`)
    assert.ok(calls > 0, 'the in-flight cap should have started')
  })

  it('a second overlapping name fill does not fetch an id twice', async () => {
    const seen = []
    globalThis.Agent = {
      state: async (id) => {
        seen.push(id)
        await new Promise(resolve => { setTimeout(resolve, 5) })
        return { name: 'Named' }
      },
      query: async () => [],
    }
    await Promise.all([
      prefetchContentNames(ids, 'en'),
      prefetchContentNames(ids, 'en'),
    ])
    assert.equal(seen.length, ids.length)
  })
})
