import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  getHardcodedTagTranslation,
  MINIMUM_GRADE_TAG_ID,
} from './tag-name-translations.js'
import {
  tagNameCacheKey,
  getCachedTagName,
  setCachedTagName,
  getTagName,
  tagNameCache,
} from './content-cache.js'

function clearTagKeys(id) {
  for (const key of [...tagNameCache.keys()]) {
    if (key === id || String(key).startsWith(`${id}:`)) tagNameCache.delete(key)
  }
}

describe('tag name translations', () => {
  it('returns hardcoded Thai for Minimum Grade', () => {
    assert.equal(
      getHardcodedTagTranslation(MINIMUM_GRADE_TAG_ID, 'th'),
      'เกรดขั้นต่ำ',
    )
    assert.equal(getHardcodedTagTranslation(MINIMUM_GRADE_TAG_ID, 'en'), undefined)
  })
})

describe('tag name cache keys', () => {
  const id = '11111111-1111-1111-1111-111111111111'

  beforeEach(() => {
    clearTagKeys(id)
  })

  it('uses id:lang keys and falls back to legacy bare id', () => {
    assert.equal(tagNameCacheKey(id, 'th'), `${id}:th`)
    assert.equal(tagNameCacheKey(id), `${id}:en`)

    tagNameCache.set(id, 'Minimum Grade')
    assert.equal(getCachedTagName(id, 'th'), 'Minimum Grade')

    setCachedTagName(id, 'เกรดขั้นต่ำ', 'th')
    assert.equal(getCachedTagName(id, 'th'), 'เกรดขั้นต่ำ')
    assert.equal(tagNameCache.get(id), 'Minimum Grade')
    assert.equal(getCachedTagName(id, 'en'), 'Minimum Grade')
  })
})

describe('getTagName resolution', () => {
  const writingId = '22222222-2222-2222-2222-222222222222'
  const mappedId = '33333333-3333-3333-3333-333333333333'

  beforeEach(() => {
    clearTagKeys(writingId)
    clearTagKeys(mappedId)
    clearTagKeys(MINIMUM_GRADE_TAG_ID)
    globalThis.Agent = {
      state: async () => ({ name: 'Writing' }),
      query: async () => [],
    }
  })

  it('uses the hardcoded map for Thai and does not store Thai under the bare id', async () => {
    let queried = false
    globalThis.Agent.query = async () => {
      queried = true
      return []
    }
    const name = await getTagName(MINIMUM_GRADE_TAG_ID, 'th')
    assert.equal(name, 'เกรดขั้นต่ำ')
    assert.equal(queried, false)
    assert.equal(tagNameCache.get(`${MINIMUM_GRADE_TAG_ID}:th`), 'เกรดขั้นต่ำ')
    assert.equal(tagNameCache.has(MINIMUM_GRADE_TAG_ID), false)
  })

  it('uses translate-item name path and keeps Thai off the bare id', async () => {
    globalThis.Agent.state = async () => ({ name: 'Writing' })
    globalThis.Agent.query = async (type, args, domain) => {
      assert.equal(type, 'translate-item')
      assert.deepEqual(args, [writingId, ['th']])
      assert.equal(domain, 'translations.pilaproject.org')
      return [{ is_fallback: false, path: ['item', 'name'], value: 'การเขียน' }]
    }
    const name = await getTagName(writingId, 'th')
    assert.equal(name, 'การเขียน')
    assert.equal(tagNameCache.get(`${writingId}:th`), 'การเขียน')
    assert.equal(tagNameCache.has(writingId), false)
  })

  it('caches English canonical under the lang key and bare id', async () => {
    globalThis.Agent.state = async () => ({ name: 'Writing' })
    globalThis.Agent.query = async () => []
    const name = await getTagName(writingId, 'en')
    assert.equal(name, 'Writing')
    assert.equal(tagNameCache.get(`${writingId}:en`), 'Writing')
    assert.equal(tagNameCache.get(writingId), 'Writing')
  })

  it('uses exact lang-map names from Agent.state before translate-item', async () => {
    let queried = false
    globalThis.Agent.state = async () => ({ name: { en: 'Grade', th: 'เกรด' } })
    globalThis.Agent.query = async () => {
      queried = true
      return []
    }
    const name = await getTagName(mappedId, 'th')
    assert.equal(name, 'เกรด')
    assert.equal(queried, false)
    assert.equal(tagNameCache.has(mappedId), false)
  })
})
