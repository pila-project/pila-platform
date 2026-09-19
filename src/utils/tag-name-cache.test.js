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
  seedTagNameCacheFromDisk,
  invalidateAll,
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

  it('has fr/pl/km parity with Thai for Minimum Grade', () => {
    assert.equal(
      getHardcodedTagTranslation(MINIMUM_GRADE_TAG_ID, 'fr'),
      'Niveau minimum',
    )
    assert.equal(
      getHardcodedTagTranslation(MINIMUM_GRADE_TAG_ID, 'pl'),
      'Minimalna ocena',
    )
    assert.equal(
      getHardcodedTagTranslation(MINIMUM_GRADE_TAG_ID, 'km'),
      'ថ្នាក់អប្បបរមា',
    )
  })

  it('ships the same locale keys for every hardcoded tag', async () => {
    const { TAG_NAME_TRANSLATIONS } = await import('./tag-name-translations.js')
    const required = ['th', 'fr', 'pl', 'km']
    for (const [id, locales] of Object.entries(TAG_NAME_TRANSLATIONS)) {
      for (const lang of required) {
        assert.equal(
          typeof locales[lang],
          'string',
          `${id} missing ${lang}`,
        )
        assert.ok(locales[lang].length > 0, `${id} empty ${lang}`)
      }
      assert.equal(locales.en, undefined, `${id} should not hardcode en`)
    }
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
    invalidateAll()
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

  it('does not poison id:th with English canonical fallback', async () => {
    let queries = 0
    let states = 0
    globalThis.Agent.state = async () => {
      states++
      return { name: 'Writing' }
    }
    globalThis.Agent.query = async () => {
      queries++
      return []
    }
    const name = await getTagName(writingId, 'th')
    assert.equal(name, 'Writing')
    assert.equal(tagNameCache.has(`${writingId}:th`), false)
    assert.equal(tagNameCache.get(`${writingId}:en`), 'Writing')
    assert.equal(tagNameCache.get(writingId), 'Writing')
    assert.equal(queries, 1)
    assert.equal(states, 1)

    const again = await getTagName(writingId, 'th')
    assert.equal(again, 'Writing')
    assert.equal(queries, 1)
    assert.equal(states, 1)
    assert.equal(tagNameCache.has(`${writingId}:th`), false)
  })
})

describe('seedTagNameCacheFromDisk (RR-23)', () => {
  const exactId = '44444444-4444-4444-4444-444444444444'
  const poisonId = '55555555-5555-5555-5555-555555555555'
  const thaiOnlyId = '66666666-6666-6666-6666-666666666666'
  const mixedId = '77777777-7777-7777-7777-777777777777'
  const retryId = '88888888-8888-8888-8888-888888888888'
  const TH_WRITING = 'การเขียน'

  beforeEach(() => {
    invalidateAll()
    globalThis.Agent = {
      state: async () => ({ name: 'Writing' }),
      query: async () => [],
    }
  })

  it('rehydrates exact Thai that differs from English so filters first-paint in th', () => {
    seedTagNameCacheFromDisk([
      [exactId, 'Writing'],
      [`${exactId}:en`, 'Writing'],
      [`${exactId}:th`, TH_WRITING],
    ])
    assert.equal(tagNameCache.get(`${exactId}:th`), TH_WRITING)
    assert.equal(getCachedTagName(exactId, 'th'), TH_WRITING)
  })

  it('skips English-under-th poison so getTagName still fetches', async () => {
    seedTagNameCacheFromDisk([
      [poisonId, 'Writing'],
      [`${poisonId}:en`, 'Writing'],
      [`${poisonId}:th`, 'Writing'],
    ])
    assert.equal(tagNameCache.has(`${poisonId}:th`), false)
    assert.equal(getCachedTagName(poisonId, 'th'), 'Writing')

    let queried = false
    globalThis.Agent.query = async () => {
      queried = true
      return []
    }
    const name = await getTagName(poisonId, 'th')
    assert.equal(name, 'Writing')
    assert.equal(queried, true)
    assert.equal(tagNameCache.has(`${poisonId}:th`), false)
  })

  it('restores Thai-only persist with no en/bare sibling', () => {
    seedTagNameCacheFromDisk([
      [`${thaiOnlyId}:th`, TH_WRITING],
    ])
    assert.equal(tagNameCache.get(`${thaiOnlyId}:th`), TH_WRITING)
    assert.equal(getCachedTagName(thaiOnlyId, 'th'), TH_WRITING)
  })

  it('skips empty/whitespace id:th', () => {
    seedTagNameCacheFromDisk([
      [exactId, 'Writing'],
      [`${exactId}:th`, '   '],
    ])
    assert.equal(tagNameCache.has(`${exactId}:th`), false)
  })

  it('restores th and fr in one seed when both differ from English', () => {
    seedTagNameCacheFromDisk([
      [mixedId, 'Writing'],
      [`${mixedId}:en`, 'Writing'],
      [`${mixedId}:th`, TH_WRITING],
      [`${mixedId}:fr`, 'Écriture'],
    ])
    assert.equal(tagNameCache.get(`${mixedId}:th`), TH_WRITING)
    assert.equal(tagNameCache.get(`${mixedId}:fr`), 'Écriture')
  })

  it('invalidateAll clears unresolved so a later getTagName can retry', async () => {
    let queries = 0
    globalThis.Agent.query = async () => {
      queries++
      return []
    }
    await getTagName(retryId, 'th')
    assert.equal(tagNameCache.has(`${retryId}:th`), false)
    assert.equal(queries, 1)

    await getTagName(retryId, 'th')
    assert.equal(queries, 1)

    invalidateAll()
    globalThis.Agent = {
      state: async () => ({ name: 'Writing' }),
      query: async () => {
        queries++
        return []
      },
    }
    await getTagName(retryId, 'th')
    assert.equal(queries, 2)
  })
})
