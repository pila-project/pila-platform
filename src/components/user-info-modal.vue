<script setup>
  import { ref, reactive } from 'vue'
  import { useStore } from 'vuex'
  import { encrypt, decrypt, generateKeyPair } from '../encryption.js'
  import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util'

  let editUserInfo, studentSecretKey, teacherKeys, decryptionError

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
      editUserInfo = reactive({})

      studentSecretKey = decrypt(
        teacherKeys.secretKey,
        ephemeralPublicKey,
        decodeBase64(userInfo.credentials[0].owner_cred_encrypted_user_cred)
      )

      Object.assign(editUserInfo, JSON.parse(encodeUTF8(decrypt(
        studentSecretKey,
        ephemeralPublicKey,
        decodeBase64(userInfo.credentials[0].user_cred_encrypted_info)
      ))))
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
        decodeUTF8(JSON.stringify(editUserInfo))
      ))

      userInfo.credentials[0].public_key = encodeBase64(ephemeralKeys.publicKey)
    }
    open.value = false
  }

  function t(slug) {
    return store.getters.t(slug)
  }
</script>

<template>
  <v-dialog
    v-model="open"
    max-width="500"
    @afterLeave="emit('close')"
  >
    <v-card>
      <v-card-title>
        <span class="text-h6">{{t('student-info')}}</span>
      </v-card-title>

      <v-card-text v-if="teacherOwnedUserAccount && editUserInfo">
        <p v-if="decryptionError">
          Your current encryption key could not decrypt the user's name.
          Please input your original encryption key or you will need to set new names.
        </p>
        <br>
        <v-text-field
          v-model="editUserInfo.name"
          :label="t('name')"
          required
        />
      </v-card-text>
      <v-card-text v-else>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="cancel">{{t('cancel')}}</v-btn>
        <v-btn color="primary" @click="save">{{t('save')}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>