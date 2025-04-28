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

      decryptedUserInfo = JSON.parse(encodeUTF8(decrypt(
        studentSecretKey,
        ephemeralPublicKey,
        decodeBase64(userInfo.credentials[0].user_cred_encrypted_info)
      )))
    }
    catch (error) {
      console.log('decryption error', error)
      decryptionError = true
    }
  }

  function t(slug) {
    return store.getters.t(slug)
  }
</script>

<template>
  <div class="no-break">
    <div v-if="teacherOwnedUserAccount">
      <p v-if="decryptionError">
        Your current encryption key could not decrypt the user's name.
        Please input your original encryption key or you will need to set new names.
      </p>
      <div v-else>
        <div>{{t('name')}}: {{decryptedUserInfo.name}}</div>
        <QRCode
          v-if="qrCodePayload"
          :data="qrCodePayload"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
  .no-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }
</style>