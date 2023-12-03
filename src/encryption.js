import { box, randomBytes } from 'tweetnacl'
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util'

export const generateKeyPair = key => {
  if (key) {
    const keyBuffer = new TextEncoder().encode(key)
    const padding = new Uint8Array(32).fill(0)
    const paddedBuffer = new Uint8Array([...keyBuffer, ...padding]).subarray(0, 32)
    return box.keyPair.fromSecretKey(paddedBuffer)
  }
  else return box.keyPair()
}

export const encrypt = (mySecretKey, theirPublicKey, messageBuffer) => {
  const nonce = randomBytes(box.nonceLength)
  const encrypted = box(messageBuffer, nonce, theirPublicKey, mySecretKey)

  const fullMessage = new Uint8Array(nonce.length + encrypted.length)
  fullMessage.set(nonce)
  fullMessage.set(encrypted, nonce.length)

  return fullMessage
}

export const decrypt = (mySecretKey, theirPublicKey, encryptedMessageBufferWithNonce) => {
  const nonce = encryptedMessageBufferWithNonce.slice(0, box.nonceLength)
  const encryptedMessageBuffer = encryptedMessageBufferWithNonce.slice(box.nonceLength)
  const decrypted = box.open(encryptedMessageBuffer, nonce, theirPublicKey, mySecretKey)

  if (!decrypted) throw new Error('Could not decrypt message')

  return decrypted
}


const { publicKey: myPublicKey, secretKey: mySecretKey } = generateKeyPair()
const { publicKey: theirPublicKey, secretKey: theirSecretKey } = generateKeyPair('some-super-secret-key')

const original = JSON.stringify({ hello: 'world!' })

const encryptedInfo = encodeBase64(
  encrypt(
    mySecretKey,
    theirPublicKey,
    decodeUTF8(original)
  )
)

const decryptedInfo = encodeUTF8(
  decrypt(
    theirSecretKey,
    myPublicKey,
    decodeBase64(encryptedInfo)
  )
)
