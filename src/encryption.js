import nacl from 'tweetnacl'

const { box, randomBytes } = nacl

export const generateKeyPair = key => {
  if (key) {
    const keyBuffer = new TextEncoder().encode(key)
    const padding = new Uint8Array(32).fill(0)
    const paddedBuffer = new Uint8Array([...keyBuffer, ...padding]).subarray(0, 32)
    return nacl.sign.keyPair.fromSeed(paddedBuffer)
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
  const encryptedMessageBuffer = encryptedMessageBufferWithNonce.slice(box.nonceLength, encryptedMessageBufferWithNonce.length)
  const decrypted = box.open(encryptedMessageBuffer, nonce, theirPublicKey, mySecretKey)

  if (!decrypted) throw new Error('Could not decrypt message')

  return decrypted
}
