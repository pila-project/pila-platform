<script setup>
  import { ref, reactive } from 'vue'
  import { useStore } from 'vuex'
  import { generateKeyPair, decryptSymmetric } from '@/utils/encryption.js'
  import { encodeUTF8 } from 'tweetnacl-util'
  import { createUser } from '@/utils/user-utils.js'
  import DecryptedName from '@/components/common/decrypted-name.vue'
  import { PModal, PButton, PInput, PCheckbox } from '@/components/ui/index.js'

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

  function cancel() {
    open.value = false
    emit('close')
  }

  async function save() {
    if (teacherOwnedUserAccount && userSecret) {
      await createUser(userSecret, providerSecret, editUserInfo)
    }
    if (users[props.id] && archived.value !== !!users[props.id]?.archived) {
      users[props.id].archived = archived.value
    }
    open.value = false
    emit('close')
  }

  function t(slug) {
    return store.getters.t(slug)
  }
</script>

<template>
  <PModal
    v-if="open"
    width="500px"
    :title="t('student-info')"
    @close="cancel"
  >
    <template #body>
      <div v-if="teacherOwnedUserAccount && editUserInfo">
        <PInput
          v-model="editUserInfo.name"
          :label="t('name')"
          required
        />
      </div>
      <div v-else>
        <DecryptedName :user="id" />
      </div>

      <div v-if="users[id]" class="mt-4">
        <PCheckbox
          v-model="archived"
          :label="t('archive')"
        />
      </div>
    </template>
    <template #footer>
      <PButton variant="secondary" :text="t('cancel')" @click="cancel" />
      <PButton variant="primary" :text="t('save')" @click="save" />
    </template>
  </PModal>
</template>
