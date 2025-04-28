<script setup>
  import { ref, reactive } from 'vue'
  import { useStore } from 'vuex'
  import { encrypt, decrypt, generateKeyPair } from '../encryption.js'
  import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util'
  import QRCode from './qrcode.vue'

  let decryptedUserInfo, qrCodePayload, studentSecretKey, teacherKeys, decryptionError

  const store = useStore()

  const props = defineProps({ id: String })
  const emit = defineEmits(['close'])

  const open = ref(true)

  const userInfo = reactive(await Agent.state(props.id))
  const teacherOwnedUserAccount = !!userInfo.credentials

  if (teacherOwnedUserAccount) {
    const key = localStorage.getItem(`zkek-${store.state.user}`)
    teacherKeys = await generateKeyPair(key)
    const ephemeralPublicKey = decodeBase64(userInfo.credentials[0].public_key)

    try {
      studentSecretKey = decrypt(
        teacherKeys.secretKey,
        ephemeralPublicKey,
        decodeBase64(userInfo.credentials[0].owner_cred_encrypted_user_cred)
      )

      qrCodePayload = {
        user: props.id,
        cred: encodeBase64(studentSecretKey)
      }
    }
    catch (error) {
      console.log('decryption error', error)
      decryptionError = true
    }
  }

  function cancel() {
    open.value = false
  }

  async function save() {
    if (teacherOwnedUserAccount) {
      const ephemeralKeys = await generateKeyPair()

      if (decryptionError) {
        const { secretKey, publicKey } = await generateKeyPair()
        studentSecretKey = secretKey
        userInfo.credentials[0].user_public_key = encodeBase64(publicKey)
      }

      userInfo.credentials[0].owner_cred_encrypted_user_cred = encodeBase64(encrypt(
        ephemeralKeys.secretKey,
        teacherKeys.publicKey,
        studentSecretKey
      ))

      userInfo.credentials[0].user_cred_encrypted_info = encodeBase64(encrypt(
        studentSecretKey,
        ephemeralKeys.publicKey,
        decodeUTF8(JSON.stringify(userInfo))
      ))

      userInfo.credentials[0].public_key = encodeBase64(ephemeralKeys.publicKey)

      decryptedUserInfo = JSON.parse(encodeUTF8(decrypt(
        studentSecretKey,
        ephemeralPublicKey,
        decodeBase64(userInfo.credentials[0].user_cred_encrypted_info)
      )))
    }
    open.value = false
  }

  function t(slug) {
    return store.getters.t(slug)
  }
</script>

<template>
  <div>
    <div v-if="teacherOwnedUserAccount">
      <p v-if="decryptionError">
        Your current encryption key could not decrypt the user's name.
        Please input your original encryption key or you will need to set new names.
      </p>
      <br>
      <QRCode
        v-if="qrCodePayload"
        :data="qrCodePayload"
      />
      <div v-if="decryptedUserInfo">{{decryptedUserInfo.name}}</div>
    </div>
  </div>
</template>