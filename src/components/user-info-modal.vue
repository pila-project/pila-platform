<script setup>
  import { ref, reactive } from 'vue'
  import { useStore } from 'vuex'
  import { generateKeyPair, decryptSymmetric } from '../encryption.js'
  import { encodeUTF8 } from 'tweetnacl-util'
  import { createUser } from '../user-utils.js'

  const store = useStore()

  const props = defineProps({ id: String })
  const emit = defineEmits(['close'])

  const open = ref(true)

  const userData = reactive(await Agent.state(props.id))

  const teacherOwnedUserAccount = !!userData.providerEncryptedKey

  const {
    providerEncryptedKey,
    providerEncryptedInfo,
    publicKey
  } = userData

  const providerSecret = localStorage.getItem(`zkek-${store.state.user}`)
  const providerKeyPair = await generateKeyPair(providerSecret)

  const editUserInfo = reactive(JSON.parse(decryptSymmetric(
    providerKeyPair.secretKey,
    providerEncryptedInfo
  )).info)

  const userSecret = decryptSymmetric(
    providerKeyPair.secretKey,
    userData.providerEncryptedKey
  )

  function cancel() {
    open.value = false
  }

  async function save() {
    if (teacherOwnedUserAccount) await createUser(userSecret, providerSecret, editUserInfo)
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