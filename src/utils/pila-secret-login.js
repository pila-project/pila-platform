/**
 * Teacher-created 8-char secret login — same protocol as login.pilaproject.org
 * `secureSecretKeyLogin`, completed through the app `/auth/` bounce.
 */
import { v5 as uuidv5 } from 'uuid'
import { encodeBase64, decodeBase64, decodeUTF8 } from 'tweetnacl-util'
import BrowserAgent from '@knowlearning/agents/browser.js'
import { generateKeyPair, encrypt, decrypt } from '@/utils/encryption.js'
import { isCompleteLoginCode } from '@/utils/login-code-symbols.js'

const CREDENTIAL_NAMESPACE = '1b4555f2-a89c-4633-834a-a064c195ab22'
const PILA_IDP_PROVIDER = 'login.pilaproject.org'

// Same core-auth wrapping key as @knowlearning/agents and login.pilaproject.org
const CORE_AUTH_SERVICE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA59Uz6jvBJF3B8/7xMqGo
XkIhLFvTCHuFIGuCNNZGCJUnSk2ne6Jp1ehUIarliJwzrvfr2HMe0PvzAJyZqQIs
uz0Lt867TTojCAKJunxbcrwEhzvz0FNjNu1wpgkSHFvd1uTvRSZqauqUmG0HqC17
HSmBaXivB49B/pviowVJc+mUJJ9MROtOiL4JN5niHnLbt6QVi6NITAJkOwtoRhck
5j0KLvfrq18R8QrfDOq3v5hWlrA6j1wPvTW1mzFk8MrOZw935mMDdMivFAm/DltM
NT5I3YnLZpcl1e/fydC+B6zSz2nZfLb2iDBbADDVj2+i9JUEFomg6ng1DjHUGMYc
ZQIDAQAB
-----END PUBLIC KEY-----
`

function getAgent() {
  if (typeof window !== 'undefined' && window.Agent) return window.Agent
  return BrowserAgent
}

export async function loginWithPilaSecret(secret) {
  if (!isCompleteLoginCode(secret)) {
    throw new Error('Invalid secret')
  }
  const oauthCode = await createSecretOauthCode(secret)
  const state = Math.random().toString(36).substring(2)
  window.localStorage.setItem(state, `${window.location.origin}/`)
  const token = await encryptString(CORE_AUTH_SERVICE_PUBLIC_KEY, JSON.stringify({
    code: oauthCode,
    provider: PILA_IDP_PROVIDER,
    domain: window.location.host,
  }))
  window.location.href = `/auth/${state}/${token}`
}

async function createSecretOauthCode(secret) {
  const agent = getAgent()
  const { serverPublicKey } = await agent.environment()
  if (!serverPublicKey) throw new Error('Invalid secret')

  const keyPair = await generateKeyPair(secret)
  const credentialId = uuidv5(
    encodeBase64(keyPair.publicKey),
    CREDENTIAL_NAMESPACE
  )
  const { encryptedUserInfo, providerPublicKey } = await agent.state(credentialId)
  if (!encryptedUserInfo || !providerPublicKey) {
    throw new Error('Invalid secret')
  }

  let inner
  try {
    inner = decrypt(
      keyPair.secretKey,
      decodeBase64(providerPublicKey),
      decodeBase64(encryptedUserInfo)
    )
  } catch {
    throw new Error('Invalid secret')
  }

  const userEncryptedInfo = encodeBase64(encrypt(
    keyPair.secretKey,
    decodeBase64(serverPublicKey),
    decodeUTF8(JSON.stringify({
      created: Date.now(),
      providerEncryptedInfo: encodeBase64(inner),
    }))
  ))

  return encryptString(CORE_AUTH_SERVICE_PUBLIC_KEY, JSON.stringify({
    userPublicKey: encodeBase64(keyPair.publicKey),
    userEncryptedInfo,
  }))
}

async function encryptString(publicKeyPem, plainText) {
  const publicKey = await crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(publicKeyPem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  )

  const symmetricKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )

  const encodedPlainText = new TextEncoder().encode(plainText)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    symmetricKey,
    encodedPlainText
  )

  const exportedSymmetricKey = await crypto.subtle.exportKey('raw', symmetricKey)
  const encryptedSymmetricKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    exportedSymmetricKey
  )

  return [
    encodeURIComponent(btoa(String.fromCharCode(...new Uint8Array(iv)))),
    encodeURIComponent(btoa(String.fromCharCode(...new Uint8Array(encryptedData)))),
    encodeURIComponent(btoa(String.fromCharCode(...new Uint8Array(encryptedSymmetricKey)))),
  ].join(',')
}

function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
  const binary = atob(b64)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i)
  }
  return array.buffer
}
