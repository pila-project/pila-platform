import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertNonEmptyProviderSecret,
  matchingEncryptionCode,
} from './publish-derived-public-key.js'

describe('empty provider secret', () => {
  // createUser / resetUserSecret (src/utils/user-utils.js and src/user-utils.js)
  // call this before Agent or generateKeyPair. Those modules import tweetnacl,
  // which node:test cannot load, so the guard is tested here.
  // RR-18: generateKeyPair('') mints a random key.
  for (const secret of ['', '   ', null, undefined]) {
    it(`assertNonEmptyProviderSecret rejects ${JSON.stringify(secret)}`, () => {
      assert.throws(
        () => assertNonEmptyProviderSecret(secret),
        /empty provider secret/,
      )
    })
  }

  it('accepts a code that is only spaces around real characters', () => {
    assert.doesNotThrow(() => assertNonEmptyProviderSecret(' Code '))
  })
})

describe('matchingEncryptionCode', () => {
  it('returns the code only when localStorage and memory hold the same non-empty value', () => {
    assert.equal(matchingEncryptionCode('Code', 'Code'), 'Code')
    assert.equal(matchingEncryptionCode('Code ', 'Code '), 'Code ')
    assert.equal(matchingEncryptionCode('Code', 'code'), '')
    assert.equal(matchingEncryptionCode('', ''), '')
    assert.equal(matchingEncryptionCode('   ', '   '), '')
    assert.equal(matchingEncryptionCode('Code', ''), '')
    assert.equal(matchingEncryptionCode(null, 'Code'), '')
  })
})
