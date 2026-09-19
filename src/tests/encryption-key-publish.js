import { encodeBase64 } from 'tweetnacl-util'
import { generateKeyPair as generateKeyPairLegacy } from '../encryption.js'
import { generateKeyPair } from '../utils/encryption.js'
import {
  isEmptyEncryptionSecret,
  publishDerivedPublicKey
} from '../utils/publish-derived-public-key.js'
import { saveProviderSecret } from '../user-utils.js'

function mockAgent(publicKeys = {}) {
  const calls = []
  return {
    calls,
    publicKeys,
    state: async (scope) => {
      calls.push(scope)
      return publicKeys
    }
  }
}

export default function encryptionKeyPublishTests() {
  describe('RR-18 encryption key publish guards', function () {
    it('derives a deterministic keypair from a non-empty secret (real mint)', async function () {
      const a = await generateKeyPair('teacher-secret')
      const b = await generateKeyPair('teacher-secret')
      expect(encodeBase64(a.publicKey)).to.equal(encodeBase64(b.publicKey))
      expect(encodeBase64(a.secretKey)).to.equal(encodeBase64(b.secretKey))
    })

    it('still mints an ephemeral pair when generateKeyPair is called with no argument', async function () {
      const pair = await generateKeyPair()
      expect(pair.publicKey).to.be.instanceOf(Uint8Array)
      expect(pair.secretKey).to.be.instanceOf(Uint8Array)
      expect(pair.publicKey.length).to.equal(32)
      expect(pair.secretKey.length).to.equal(32)

      const other = await generateKeyPair()
      expect(encodeBase64(pair.publicKey)).to.not.equal(encodeBase64(other.publicKey))
    })

    it('legacy generateKeyPair() still mints an ephemeral pair', async function () {
      const pair = await generateKeyPairLegacy()
      expect(pair.publicKey.length).to.equal(32)
      expect(pair.secretKey.length).to.equal(32)
    })

    it('treats non-strings, empty, and whitespace-only as empty secrets', function () {
      expect(isEmptyEncryptionSecret('')).to.equal(true)
      expect(isEmptyEncryptionSecret('   ')).to.equal(true)
      expect(isEmptyEncryptionSecret('\n\t')).to.equal(true)
      expect(isEmptyEncryptionSecret(null)).to.equal(true)
      expect(isEmptyEncryptionSecret(undefined)).to.equal(true)
      expect(isEmptyEncryptionSecret('secret')).to.equal(false)
      expect(isEmptyEncryptionSecret(' secret ')).to.equal(false)
    })

    it('does not publish when the secret is empty or whitespace', async function () {
      const agent = mockAgent({ public: 'prior-key' })

      expect(await publishDerivedPublicKey('', agent)).to.equal(false)
      expect(await publishDerivedPublicKey('   ', agent)).to.equal(false)
      expect(await publishDerivedPublicKey(null, agent)).to.equal(false)
      expect(await publishDerivedPublicKey(undefined, agent)).to.equal(false)

      expect(agent.calls).to.deep.equal([])
      expect(agent.publicKeys.public).to.equal('prior-key')
    })

    it('publishes a derived public key for a real non-empty secret', async function () {
      const agent = mockAgent({})
      const secret = 'teacher-secret'
      const { publicKey } = await generateKeyPair(secret)

      expect(await publishDerivedPublicKey(secret, agent)).to.equal(true)
      expect(agent.calls).to.deep.equal(['user-info-public-keys'])
      expect(agent.publicKeys.public).to.equal(encodeBase64(publicKey))
    })

    it('saveProviderSecret no-ops on empty and does not wipe or publish', async function () {
      const originalAgent = globalThis.Agent
      const originalStorage = globalThis.localStorage
      const store = new Map([['zkek-teacher-a', 'existing-secret']])
      const publicKeys = { public: 'prior-key' }

      globalThis.Agent = mockAgent(publicKeys)
      globalThis.localStorage = {
        getItem: key => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(key, value) }
      }

      try {
        await saveProviderSecret('teacher-a', '')
        await saveProviderSecret('teacher-a', '   ')
        await saveProviderSecret('teacher-a', null)
        expect(store.get('zkek-teacher-a')).to.equal('existing-secret')
        expect(publicKeys.public).to.equal('prior-key')
        expect(globalThis.Agent.calls).to.deep.equal([])
      } finally {
        globalThis.Agent = originalAgent
        globalThis.localStorage = originalStorage
      }
    })
  })
}
