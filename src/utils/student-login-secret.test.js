import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  namedStudentLoginSecret,
  resolveStudentLoginSecret,
} from './student-login-secret.js'

describe('namedStudentLoginSecret', () => {
  it('returns a trimmed named-map secret', () => {
    assert.equal(namedStudentLoginSecret('  fjwxvcws  '), 'fjwxvcws')
  })

  it('treats missing named-map secret as empty', () => {
    assert.equal(namedStudentLoginSecret(undefined), '')
    assert.equal(namedStudentLoginSecret(null), '')
    assert.equal(namedStudentLoginSecret(''), '')
    assert.equal(namedStudentLoginSecret('   '), '')
  })
})

describe('resolveStudentLoginSecret', () => {
  it('uses users[id].secret without decrypting (new students)', async () => {
    let decryptCalls = 0
    const secret = await resolveStudentLoginSecret(
      'fjwxvcws',
      'student-id',
      async () => {
        decryptCalls += 1
        return 'should-not-run'
      },
    )
    assert.equal(secret, 'fjwxvcws')
    assert.equal(decryptCalls, 0)
  })

  it('decrypts providerEncryptedKey when .secret is missing (Option A)', async () => {
    const secret = await resolveStudentLoginSecret(
      '',
      'student-id',
      async userId => {
        assert.equal(userId, 'student-id')
        return 'abcdefgh'
      },
    )
    assert.equal(secret, 'abcdefgh')
  })

  it('does not invent a /join fallback when decrypt fails', async () => {
    const secret = await resolveStudentLoginSecret(
      undefined,
      'student-id',
      async () => {
        throw new Error('no key')
      },
    )
    assert.equal(secret, '')
  })

  it('returns empty when there is no user id to decrypt', async () => {
    const secret = await resolveStudentLoginSecret('', '', async () => 'abcdefgh')
    assert.equal(secret, '')
  })
})
