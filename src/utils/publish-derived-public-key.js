import * as encryption from './encryption.js'
import naclUtil from 'tweetnacl-util'

export function isEmptyEncryptionSecret(val) {
  return typeof val !== 'string' || !val.trim()
}

/** Publish a password-derived teacher public key. Empty/whitespace is a no-op (must not mint a random pair). */
export async function publishDerivedPublicKey(secret, agent = globalThis.Agent) {
  if (isEmptyEncryptionSecret(secret)) return false
  const publicKeys = await agent.state('user-info-public-keys')
  const { publicKey: publicKeyBuffer } = await encryption.generateKeyPair(secret)
  publicKeys.public = naclUtil.encodeBase64(publicKeyBuffer)
  return true
}
