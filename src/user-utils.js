import { v4 as uuid, v5 as uuidv5 } from 'uuid'
import { encodeBase64, decodeBase64, decodeUTF8 } from 'tweetnacl-util'
import { encrypt, generateKeyPair, encryptSymmetric } from './encryption.js'

const BASE64_PUBLIC_KEY_NAMESPACE = '1b4555f2-a89c-4633-834a-a064c195ab22'

window.createUser = createUser

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

  userData.providerEncryptedKey = encryptSymmetric(providerKeyPair.secretKey, userSecret)

  credentialData.user ??= userId
  credentialData.providerPublicKey = encodeBase64(providerKeyPair.publicKey)
  credentialData.encryptedUserInfo = encodeBase64(encrypt(
    providerKeyPair.secretKey,
    userKeyPair.publicKey,
    encrypt(
      providerKeyPair.secretKey,
      decodeBase64(serverPublicKey),
      decodeUTF8(JSON.stringify({
        user: userId,
        info
      }))
    )
  ))

  await Agent.synced()

  return userId
}
