import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from 'tweetnacl-util'
import {
  decrypt,
  decryptSymmetric,
  encrypt,
  encryptSymmetric,
  generateKeyPair
} from './encryption.js'

export const TEACHER_LOGIN_CREDENTIAL_SCOPE = 'teacher-login-credentials:v1'
export const TEACHER_LOGIN_CREDENTIAL_VERSION = 1
export const ADMIN_CREDENTIAL_SECRET_STORAGE_PREFIX = 'zkek-a-'

// The matching secret is intentionally not stored in this repository. Only someone
// with that secret can decrypt the super-admin copy of a credential record.
export const SUPER_ADMIN_CREDENTIAL_PUBLIC_KEY = 'AANrjTHJIF3cD/+fbZWIhKGLD7a13qY2uLklHinEGSI='

export function adminCredentialSecretStorageKey(adminId) {
  if (!adminId) throw new Error('An admin user id is required.')
  return `${ADMIN_CREDENTIAL_SECRET_STORAGE_PREFIX}${adminId}`
}

export function getStoredAdminCredentialSecret(adminId, storage = globalThis.localStorage) {
  return storage?.getItem(adminCredentialSecretStorageKey(adminId)) || ''
}

export function storeAdminCredentialSecret(adminId, secret, storage = globalThis.localStorage) {
  if (!secret) throw new Error('An admin encryption key is required.')
  storage?.setItem(adminCredentialSecretStorageKey(adminId), secret)
}

export async function createTeacherLoginCredentialRecord(
  credentials,
  adminSecret,
  {
    superAdminPublicKey = SUPER_ADMIN_CREDENTIAL_PUBLIC_KEY,
    createdAt = new Date().toISOString()
  } = {}
) {
  const payload = serializeCredentials(credentials)
  if (!adminSecret) throw new Error('An admin encryption key is required.')

  const [adminKeyPair, ephemeralKeyPair] = await Promise.all([
    generateKeyPair(adminSecret),
    generateKeyPair()
  ])

  return {
    version: TEACHER_LOGIN_CREDENTIAL_VERSION,
    createdAt,
    adminEncryptedCredentials: encryptSymmetric(adminKeyPair.secretKey, payload),
    superAdminEncryptedCredentials: {
      senderPublicKey: encodeBase64(ephemeralKeyPair.publicKey),
      ciphertext: encodeBase64(encrypt(
        ephemeralKeyPair.secretKey,
        decodeBase64(superAdminPublicKey),
        decodeUTF8(payload)
      ))
    }
  }
}

export async function decryptTeacherLoginCredentialRecord(record, secret) {
  if (!secret) throw new Error('Enter an encryption key.')
  validateRecord(record)

  const keyPair = await generateKeyPair(secret)

  try {
    return {
      credentials: parseCredentials(decryptSymmetric(
        keyPair.secretKey,
        record.adminEncryptedCredentials
      )),
      keyType: 'admin'
    }
  } catch (_adminError) {
    try {
      const { senderPublicKey, ciphertext } = record.superAdminEncryptedCredentials
      return {
        credentials: parseCredentials(encodeUTF8(decrypt(
          keyPair.secretKey,
          decodeBase64(senderPublicKey),
          decodeBase64(ciphertext)
        ))),
        keyType: 'super-admin'
      }
    } catch (_superAdminError) {
      throw new Error('That key cannot decrypt these teacher credentials.')
    }
  }
}

export async function writeTeacherLoginCredentialRecord(agent, teacherId, record) {
  if (!teacherId) throw new Error('A teacher user id is required.')
  validateRecord(record)

  const credentialState = await agent.state(TEACHER_LOGIN_CREDENTIAL_SCOPE)
  credentialState[teacherId] = record
  await agent.synced()
}

export async function readTeacherLoginCredentialRecord(agent, teacherId, owner) {
  if (!teacherId) return null
  const credentialState = await agent.state(TEACHER_LOGIN_CREDENTIAL_SCOPE, owner)
  return credentialState[teacherId] || null
}

function serializeCredentials(credentials) {
  validateCredentials(credentials)
  return JSON.stringify({
    loginCode: credentials.loginCode,
    name: credentials.name
  })
}

function parseCredentials(serialized) {
  const credentials = JSON.parse(serialized)
  validateCredentials(credentials)
  return credentials
}

function validateCredentials(credentials) {
  if (
    !credentials
    || typeof credentials.loginCode !== 'string'
    || !credentials.loginCode
    || typeof credentials.name !== 'string'
    || !credentials.name
  ) {
    throw new Error('Teacher credentials must include a login code and name.')
  }
}

function validateRecord(record) {
  if (
    !record
    || record.version !== TEACHER_LOGIN_CREDENTIAL_VERSION
    || typeof record.adminEncryptedCredentials !== 'string'
    || typeof record.superAdminEncryptedCredentials?.senderPublicKey !== 'string'
    || typeof record.superAdminEncryptedCredentials?.ciphertext !== 'string'
  ) {
    throw new Error('This teacher credential record is invalid or unsupported.')
  }
}
