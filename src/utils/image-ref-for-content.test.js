import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import getImageFromContent from './image-ref-for-content.js'
import {
  getContentMetadata,
  getContentImage,
  imageCache,
  metadataCache,
  invalidateAll,
  loadExploreCache,
  persistExploreCache,
} from './content-cache.js'
import { localCache } from './local-cache.js'

const ITEM_ID = '476f1870-951a-4fa3-a9c2-4c37ea995eae'
const COVER_ID = '78fadb08-2a81-4919-93bd-b0fa7c252a29'

function mockAgent({
  state = {},
  metadata = {},
  downloadUrl,
  downloadThrow,
  stateThrow,
} = {}) {
  globalThis.Agent = {
    environment: async () => ({ auth: { user: null } }),
    state: async () => {
      if (stateThrow) throw new Error('state failed')
      return state
    },
    metadata: async () => metadata,
    download: (id) => {
      if (downloadThrow) throw new Error('download failed')
      return {
        url: async () => {
          if (downloadUrl === 'throw') throw new Error('url failed')
          return downloadUrl ?? `https://cdn.example/${id}`
        },
      }
    },
  }
}

describe('getImageFromContent (UIUX-249)', () => {
  beforeEach(() => {
    mockAgent()
  })

  it('returns karel art without calling Agent', async () => {
    let called = false
    globalThis.Agent = {
      state: async () => { called = true; return {} },
      metadata: async () => { called = true; return {} },
      download: () => { called = true; return { url: async () => '/nope' } },
    }
    const url = await getImageFromContent('study-karel-map-2')
    assert.equal(url, '/karel_new.png')
    assert.equal(called, false)
  })

  it('does not throw when Agent.state is null', async () => {
    mockAgent({ state: null, metadata: { domain: 'datawise.accingo.co' } })
    const url = await getImageFromContent(ITEM_ID)
    assert.equal(url, '/datawise-logo.png')
  })

  it('does not throw when Agent.state throws; uses domain fallback', async () => {
    mockAgent({
      stateThrow: true,
      metadata: { domain: 'customize-candli.pilaproject.org' },
    })
    const url = await getImageFromContent(ITEM_ID)
    assert.equal(url, '/candli-logo.svg')
  })

  it('download throw still returns a string URL (datawise domain)', async () => {
    mockAgent({
      state: { image: COVER_ID },
      downloadThrow: true,
      metadata: { domain: 'datawise.accingo.co' },
    })
    const url = await getImageFromContent(ITEM_ID)
    assert.equal(typeof url, 'string')
    assert.ok(url.length > 0)
    assert.equal(url, '/datawise-logo.png')
  })

  it('download url() throw still returns candli logo for embed domain', async () => {
    mockAgent({
      state: { image: COVER_ID },
      downloadUrl: 'throw',
      metadata: { domain: 'embed.knowlearning.systems' },
    })
    const url = await getImageFromContent(ITEM_ID)
    assert.equal(url, '/candli-logo.svg')
  })

  it('uses candli logo for pila.cand.li when there is no cover', async () => {
    mockAgent({
      state: {},
      metadata: { domain: 'pila.cand.li' },
    })
    const url = await getImageFromContent(ITEM_ID)
    assert.equal(url, '/candli-logo.svg')
  })

  it('falls through to /logo-green.svg when download throws and domain is unknown', async () => {
    mockAgent({
      state: { image: COVER_ID },
      downloadThrow: true,
      metadata: { domain: 'example.org' },
    })
    const url = await getImageFromContent(ITEM_ID)
    assert.equal(url, '/logo-green.svg')
  })

  it('sequence type wins over domain logo', async () => {
    mockAgent({
      state: {},
      metadata: {
        active_type: 'application/json;type=sequence',
        domain: 'datawise.accingo.co',
      },
    })
    const url = await getImageFromContent(ITEM_ID)
    assert.equal(url, '/pila_sequence.png')
  })

  it('successful cover download wins over domain logo', async () => {
    mockAgent({
      state: { image: COVER_ID },
      downloadUrl: 'https://cdn.example/cover.png',
      metadata: { domain: 'datawise.accingo.co' },
    })
    const url = await getImageFromContent(ITEM_ID)
    assert.equal(url, 'https://cdn.example/cover.png')
  })

  it('returns a string when Agent.state and Agent.metadata both throw', async () => {
    globalThis.Agent = {
      state: async () => { throw new Error('state') },
      metadata: async () => { throw new Error('meta') },
      download: () => { throw new Error('download') },
    }
    const url = await getImageFromContent(ITEM_ID)
    assert.equal(typeof url, 'string')
    assert.equal(url, '/logo-green.svg')
  })
})

describe('content image cache (UIUX-249)', () => {
  const origGet = localCache.get
  const origSet = localCache.set

  beforeEach(() => {
    invalidateAll()
    mockAgent({
      metadata: {
        active_type: 'application/json;type=item',
        owner: 'x',
        created: 1,
        updated: 2,
        domain: 'datawise.accingo.co',
      },
    })
  })

  afterEach(() => {
    localCache.get = origGet
    localCache.set = origSet
    invalidateAll()
  })

  it('keeps domain on the metadata cache entry', async () => {
    const meta = await getContentMetadata(ITEM_ID)
    assert.equal(meta.domain, 'datawise.accingo.co')
    assert.equal(metadataCache.get(ITEM_ID).domain, 'datawise.accingo.co')
  })

  it('skips empty imageCache values and refetches', async () => {
    imageCache.set(ITEM_ID, '')
    mockAgent({
      state: {},
      metadata: { domain: 'customize-candli.pilaproject.org' },
    })
    const url = await getContentImage(ITEM_ID)
    assert.equal(url, '/candli-logo.svg')
    assert.equal(imageCache.get(ITEM_ID), '/candli-logo.svg')
  })

  it('ignores blob: and empty maps.images on hydrate', async () => {
    localCache.get = async () => ({
      maps: {
        images: [
          ['dead', 'blob:http://localhost/dead'],
          ['empty', ''],
          ['ok', '/candli-logo.svg'],
        ],
      },
    })
    await loadExploreCache('user-1')
    assert.equal(imageCache.has('dead'), false)
    assert.equal(imageCache.has('empty'), false)
    assert.equal(imageCache.get('ok'), '/candli-logo.svg')
  })

  it('does not persist blob: image URLs into Explore maps', async () => {
    let stored
    localCache.get = async () => null
    localCache.set = async (_userId, _ns, _key, data) => { stored = data }
    imageCache.set('blob-id', 'blob:http://localhost/abc')
    imageCache.set('ok-id', '/karel_new.png')
    persistExploreCache('user-1', {
      taggedContent: null,
      myContent: null,
      tagCategories: null,
      leafToCategory: null,
    })
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.ok(stored?.maps?.images)
    assert.deepEqual(stored.maps.images, [['ok-id', '/karel_new.png']])
  })
})
