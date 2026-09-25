import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  nameCache,
  nameCacheKey,
  getCachedContentName,
  hasCachedContentNameForLang,
  getContentName,
  invalidateNames,
  seedNameCacheFromDisk,
  prefetchContentNames,
} from './content-cache.js'

const growthId = '78fadb08-2a81-4919-93bd-b0fa7c252a29'
const schoolyardId = '476f1870-951a-4fa3-a9c2-4c37ea995eae'
const TH_GROWTH = 'โจทย์ออกแบบการเติบโตของชุมชน'
const EN_GROWTH = 'Community Growth Design Challenge'
const EN_SCHOOLYARD = 'Investigating Schoolyard Flooding'

beforeEach(() => {
  invalidateNames()
  globalThis.Agent = {
    state: async () => ({ name: EN_GROWTH }),
    query: async () => [],
  }
})

describe('getContentName Thai resolution (UIUX-212)', () => {
  it('stores exact translate-item Thai under id:th and not under the bare id', async () => {
    globalThis.Agent.state = async () => ({ name: EN_GROWTH })
    globalThis.Agent.query = async (type, args, domain) => {
      assert.equal(type, 'translate-item')
      assert.deepEqual(args, [growthId, ['th']])
      assert.equal(domain, 'translations.pilaproject.org')
      return [{
        is_fallback: false,
        path: [growthId, 'name'],
        value: TH_GROWTH,
      }]
    }
    const name = await getContentName(growthId, 'th')
    assert.equal(name, TH_GROWTH)
    assert.equal(nameCache.get(nameCacheKey(growthId, 'th')), TH_GROWTH)
    assert.equal(hasCachedContentNameForLang(growthId, 'th'), true)
    assert.equal(nameCache.has(growthId), false)
    assert.equal(getCachedContentName(growthId, 'th'), TH_GROWTH)
  })

  it('does not treat a plain English state.name as Thai-exact (no id:th poison)', async () => {
    globalThis.Agent.state = async () => ({ name: EN_SCHOOLYARD })
    globalThis.Agent.query = async () => []
    const name = await getContentName(schoolyardId, 'th')
    assert.equal(name, EN_SCHOOLYARD)
    assert.equal(hasCachedContentNameForLang(schoolyardId, 'th'), false)
    assert.equal(nameCache.get(nameCacheKey(schoolyardId, 'th')), undefined)
    assert.equal(nameCache.get(nameCacheKey(schoolyardId, 'en')), EN_SCHOOLYARD)
    assert.equal(getCachedContentName(schoolyardId, 'th'), EN_SCHOOLYARD)
  })
})

describe('seedNameCacheFromDisk (UIUX-212)', () => {
  it('rehydrates exact Thai that differs from English so assignment cards first-paint in th', () => {
    seedNameCacheFromDisk([
      [growthId, EN_GROWTH],
      [`${growthId}:en`, EN_GROWTH],
      [`${growthId}:th`, TH_GROWTH],
    ])
    assert.equal(hasCachedContentNameForLang(growthId, 'th'), true)
    assert.equal(getCachedContentName(growthId, 'th'), TH_GROWTH)
  })

  it('skips English-under-th poison from older builds', () => {
    seedNameCacheFromDisk([
      [schoolyardId, EN_SCHOOLYARD],
      [`${schoolyardId}:en`, EN_SCHOOLYARD],
      [`${schoolyardId}:th`, EN_SCHOOLYARD],
    ])
    assert.equal(hasCachedContentNameForLang(schoolyardId, 'th'), false)
    assert.equal(getCachedContentName(schoolyardId, 'th'), EN_SCHOOLYARD)
  })

  it('re-resolves an id:th disk value that has no English sibling', async () => {
    seedNameCacheFromDisk([[`${growthId}:th`, EN_GROWTH]])
    let queries = 0
    globalThis.Agent.state = async () => ({ name: EN_GROWTH })
    globalThis.Agent.query = async () => {
      queries += 1
      return [{ is_fallback: false, path: [growthId, 'name'], value: TH_GROWTH }]
    }
    const name = await getContentName(growthId, 'th')
    assert.equal(name, TH_GROWTH)
    assert.equal(queries, 1)
    assert.equal(nameCache.get(nameCacheKey(growthId, 'en')), EN_GROWTH)

    invalidateNames()
    seedNameCacheFromDisk([
      [growthId, EN_GROWTH],
      [`${growthId}:en`, EN_GROWTH],
      [`${growthId}:th`, TH_GROWTH],
    ])
    queries = 0
    const again = await getContentName(growthId, 'th')
    assert.equal(again, TH_GROWTH)
    assert.equal(queries, 0)
  })

  it('catalog name fill re-resolves an unverified Thai title', async () => {
    seedNameCacheFromDisk([[`${growthId}:th`, EN_GROWTH]])
    let queries = 0
    globalThis.Agent.state = async () => ({ name: EN_GROWTH })
    globalThis.Agent.query = async () => {
      queries += 1
      return [{ is_fallback: false, path: [growthId, 'name'], value: TH_GROWTH }]
    }
    await prefetchContentNames([growthId], 'th')
    assert.equal(queries, 1)
    assert.equal(getCachedContentName(growthId, 'th'), TH_GROWTH)
  })
})
