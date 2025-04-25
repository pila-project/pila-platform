import { encrypt, generateKeyPair } from './encryption.js'
import naclUtil from 'tweetnacl-util'

export default async function createUser() {
  const userKeys = await generateKeyPair()
  const ephemeralKeys = await generateKeyPair()
  const myPublicKey = await Agent.state('user-info-public-keys').then(k => k.public)

  const id = await Agent.create({
    active: {
      credentials: [{
        user_cred_encrypted_name: naclUtil.encodeBase64(encrypt(
          ephemeralKeys.secretKey,
          userKeys.publicKey,
          naclUtil.decodeUTF8('New User ' + Date.now())
        )),
        owner_cred_encrypted_user_cred: naclUtil.encodeBase64(encrypt(
          ephemeralKeys.secretKey,
          naclUtil.decodeBase64(myPublicKey),
          userKeys.secretKey
        )),
        user_public_key: naclUtil.encodeBase64(userKeys.publicKey),
        public_key: naclUtil.encodeBase64(ephemeralKeys.publicKey)
      }]
    }
  })
  await Agent.synced()
  return id
}