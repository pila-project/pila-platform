import { encodeBase64 } from 'tweetnacl-util'
import { generateKeyPair } from '../encryption.js'
import { loginCodeDocument } from '../login-code-document.js'
import {
  TEACHER_LOGIN_CREDENTIAL_SCOPE,
  adminCredentialSecretStorageKey,
  createTeacherLoginCredentialRecord,
  decryptTeacherLoginCredentialRecord,
  getStoredAdminCredentialSecret,
  readTeacherLoginCredentialRecord,
  storeAdminCredentialSecret,
  writeTeacherLoginCredentialRecord
} from '../teacher-login-credentials.js'

export default function teacherLoginCredentialTests() {
  describe('Teacher login credentials', function () {
    const credentials = { name: 'Teacher Example', loginCode: 'abcdefgh' }
    const adminSecret = 'admin test key'
    const superAdminSecret = 'super admin test key'
    let record

    before(async function () {
      const { publicKey } = await generateKeyPair(superAdminSecret)
      record = await createTeacherLoginCredentialRecord(credentials, adminSecret, {
        superAdminPublicKey: encodeBase64(publicKey),
        createdAt: '2026-07-20T00:00:00.000Z'
      })
    })

    it('stores two encrypted copies without plaintext credentials', function () {
      expect(record.version).to.equal(1)
      expect(record.createdAt).to.equal('2026-07-20T00:00:00.000Z')
      expect(record.adminEncryptedCredentials).to.be.a('string')
      expect(record.superAdminEncryptedCredentials.senderPublicKey).to.be.a('string')
      expect(record.superAdminEncryptedCredentials.ciphertext).to.be.a('string')
      expect(JSON.stringify(record)).not.to.include(credentials.name)
      expect(JSON.stringify(record)).not.to.include(credentials.loginCode)
    })

    it('decrypts with the admin key', async function () {
      expect(await decryptTeacherLoginCredentialRecord(record, adminSecret))
        .to.deep.equal({ credentials, keyType: 'admin' })
    })

    it('decrypts with the super-admin key', async function () {
      expect(await decryptTeacherLoginCredentialRecord(record, superAdminSecret))
        .to.deep.equal({ credentials, keyType: 'super-admin' })
    })

    it('rejects an invalid key', async function () {
      let error
      try {
        await decryptTeacherLoginCredentialRecord(record, 'wrong key')
      } catch (caughtError) {
        error = caughtError
      }
      expect(error?.message).to.equal('That key cannot decrypt these teacher credentials.')
    })

    it('keeps the admin key in its distinct local storage entry', function () {
      const values = new Map()
      const storage = {
        getItem: key => values.get(key) || null,
        setItem: (key, value) => values.set(key, value)
      }

      storeAdminCredentialSecret('admin-a', adminSecret, storage)

      expect(adminCredentialSecretStorageKey('admin-a')).to.equal('zkek-a-admin-a')
      expect(getStoredAdminCredentialSecret('admin-a', storage)).to.equal(adminSecret)
    })

    it('writes and reads records from the versioned credential scope', async function () {
      const states = { [TEACHER_LOGIN_CREDENTIAL_SCOPE]: {} }
      const calls = []
      const agent = {
        state: async (scope, owner) => {
          calls.push({ scope, owner })
          return states[scope]
        },
        synced: async () => calls.push({ synced: true })
      }

      await writeTeacherLoginCredentialRecord(agent, 'teacher-a', record)
      const loaded = await readTeacherLoginCredentialRecord(agent, 'teacher-a', 'admin-a')

      expect(loaded).to.equal(record)
      expect(states[TEACHER_LOGIN_CREDENTIAL_SCOPE]['teacher-a']).to.equal(record)
      expect(calls).to.deep.equal([
        { scope: TEACHER_LOGIN_CREDENTIAL_SCOPE, owner: undefined },
        { synced: true },
        { scope: TEACHER_LOGIN_CREDENTIAL_SCOPE, owner: 'admin-a' }
      ])
    })

    it('escapes teacher names in saved login-code documents', async function () {
      const html = await loginCodeDocument({
        name: '<script>alert(1)</script>',
        loginCode: credentials.loginCode
      })

      expect(html).not.to.include('<script>alert(1)</script>')
      expect(html).to.include('&lt;script&gt;alert(1)&lt;/script&gt;')
    })
  })
}
