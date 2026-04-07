<script setup>
  import { ref, reactive, computed } from 'vue'
  import { useStore } from 'vuex'
  import { generateKeyPair, decryptSymmetric } from '../encryption.js'
  import { encodeUTF8 } from 'tweetnacl-util'
  import { createUser } from '../user-utils.js'
  import DecryptedName from './decrypted-name.vue'

  const store = useStore()

  const props = defineProps({ id: String })
  const emit = defineEmits(['close'])

  const open = ref(true)

  const userData = reactive(await Agent.state(props.id))
  const users = reactive(await Agent.state('users'))

  const archived = ref(!!users[props.id]?.archived)

  const teacherOwnedUserAccount = !!userData.providerEncryptedKey

  const {
    providerEncryptedKey,
    providerEncryptedInfo,
    publicKey
  } = userData

  const providerSecret = localStorage.getItem(`zkek-${store.state.user}`)
  const providerKeyPair = await generateKeyPair(providerSecret)

  let editUserInfo, userSecret

  try {
    editUserInfo = reactive(JSON.parse(decryptSymmetric(
      providerKeyPair.secretKey,
      providerEncryptedInfo
    )).info)

    userSecret = decryptSymmetric(
      providerKeyPair.secretKey,
      userData.providerEncryptedKey
    )
  }
  catch (error) {

  }

  const hasNameLetter = computed(() => /\p{L}/u.test(editUserInfo?.name || ''))
  const canSave = computed(() => !teacherOwnedUserAccount || !editUserInfo || hasNameLetter.value)
  const nameRules = [
    () => hasNameLetter.value || 'Enter at least one letter.'
  ]

  function cancel() {
    open.value = false
  }

  async function save() {
    if (!canSave.value) return
    if (teacherOwnedUserAccount && userSecret) {
      await createUser(userSecret, providerSecret, editUserInfo)
    }
    if (users[props.id] && archived.value !== !!users[props.id]?.archived) {
      users[props.id].archived = archived.value
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

      <v-card-text>
        <div v-if="teacherOwnedUserAccount && editUserInfo">
          <v-text-field
            v-model="editUserInfo.name"
            :label="t('name')"
            :rules="nameRules"
            required
          />
        </div>
        <div v-else>
          <DecryptedName :user="id" />
        </div>

        <div v-if="users[id]">
          <v-checkbox
            v-model="archived"
            :label="t('archive')"
          ></v-checkbox>
        </div>

      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="cancel">{{t('cancel')}}</v-btn>
        <v-btn color="primary" :disabled="!canSave" @click="save">{{t('save')}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
