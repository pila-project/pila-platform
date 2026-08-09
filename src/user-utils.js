import { v4 as uuid, v5 as uuidv5 } from 'uuid'
import { encodeBase64, decodeBase64, decodeUTF8 } from 'tweetnacl-util'
import { encrypt, generateKeyPair, encryptSymmetric } from './encryption.js'

const BASE64_PUBLIC_KEY_NAMESPACE = '1b4555f2-a89c-4633-834a-a064c195ab22'
const CODE_CHARACTER_SET = 'abcdefghijklmnopqrstuvwxy'

export function randomUserSecret(length = 8) {
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return [...arr].map(i => CODE_CHARACTER_SET[i % CODE_CHARACTER_SET.length]).join('')
}

export async function saveProviderSecret(user, providerSecret) {
  localStorage.setItem(`zkek-${user}`, providerSecret)
  const publicKeys = await Agent.state('user-info-public-keys')
  const { publicKey } = await generateKeyPair(providerSecret)
  publicKeys.public = encodeBase64(publicKey)
}

export async function createUser(userSecret, providerSecret, info) {
  const { serverPublicKey } = await Agent.environment()
  const userKeyPair = await generateKeyPair(userSecret)
  const providerKeyPair = await generateKeyPair(providerSecret)

  const credentialId = uuidv5(
    encodeBase64(userKeyPair.publicKey),
    BASE64_PUBLIC_KEY_NAMESPACE
  )

  const credentialData = await Agent.state(credentialId)
  const userId = credentialData.user ??= uuid()
  const userData = await Agent.state(userId)

  const userInfo = JSON.stringify({
    user: userId,
    info
  })

  userData.providerEncryptedKey = encryptSymmetric(providerKeyPair.secretKey, userSecret)
  userData.providerEncryptedInfo = encryptSymmetric(providerKeyPair.secretKey, userInfo)
  userData.publicKey = encodeBase64(userKeyPair.publicKey)

  credentialData.user ??= userId
  credentialData.providerPublicKey = encodeBase64(providerKeyPair.publicKey)
  credentialData.encryptedUserInfo = encodeBase64(encrypt(
    providerKeyPair.secretKey,
    userKeyPair.publicKey,
    encrypt(
      providerKeyPair.secretKey,
      decodeBase64(serverPublicKey),
      decodeUTF8(userInfo)
    )
  ))

  await Agent.synced()

  return userId
}
