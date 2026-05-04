<script setup>
  import { ref, reactive, computed } from 'vue'
  import { useStore } from 'vuex'
  import { generateKeyPair, decryptSymmetric } from '@/utils/encryption.js'
  import { createUser } from '@/utils/user-utils.js'
  import DecryptedName from '@/components/common/decrypted-name.vue'
  import { PModal, PButton, PInput, PSelect, PBadge } from '@/components/ui/index.js'

  const store = useStore()

  const props = defineProps({ id: String })
  const emit = defineEmits(['close', 'open-login-code'])

  const open = ref(true)

  const userData = reactive(await Agent.state(props.id))
  const usersState = reactive(await Agent.state('users'))

  const archived = ref(!!usersState[props.id]?.archived)
  const studentGrade = ref(usersState[props.id]?.grade || '')
  const studentStatus = ref(archived.value ? 'archived' : 'active')

  const teacherOwnedUserAccount = !!userData.providerEncryptedKey

  const providerSecret = localStorage.getItem(`zkek-${store.state.user}`)
  const providerKeyPair = await generateKeyPair(providerSecret)

  let editUserInfo, userSecret

  try {
    editUserInfo = reactive(JSON.parse(decryptSymmetric(
      providerKeyPair.secretKey,
      userData.providerEncryptedInfo
    )).info)

    userSecret = decryptSymmetric(
      providerKeyPair.secretKey,
      userData.providerEncryptedKey
    )

    // Migrate: if old first_name/last_name fields exist but no name, combine them
    if (!editUserInfo.name && editUserInfo.first_name) {
      editUserInfo.name = [editUserInfo.first_name, editUserInfo.last_name].filter(Boolean).join(' ')
    }
  }
  catch (error) {
    // Decryption failed — user cannot edit
  }

  const statusOptions = [
    { value: 'active', title: t('active') },
    { value: 'archived', title: t('archived') },
  ]

  // Grade options — derive from existing students or provide common defaults
  const gradeOptions = computed(() => {
    const grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
    return grades.map(g => ({ value: g, title: g }))
  })

  function cancel() {
    open.value = false
    emit('close')
  }

  async function save() {
    if (teacherOwnedUserAccount && userSecret) {
      await createUser(userSecret, providerSecret, editUserInfo)
    }

    // Save grade to users state
    if (usersState[props.id]) {
      usersState[props.id].grade = studentGrade.value || undefined

      // Update archived status based on dropdown
      const shouldBeArchived = studentStatus.value === 'archived'
      if (shouldBeArchived !== !!usersState[props.id]?.archived) {
        usersState[props.id].archived = shouldBeArchived
      }
    }

    open.value = false
    emit('close')
  }

  function openLoginCode() {
    emit('open-login-code', props.id)
  }

  function t(slug) {
    return store.getters.t(slug)
  }
</script>

<template>
  <PModal
    v-if="open"
    width="500px"
    :title="t('edit')"
    @close="cancel"
  >
    <template #title>
      <div>
        <h2 class="text-lg font-semibold text-zinc-950">{{ t('edit') }}</h2>
        <p class="text-sm text-slate-500 mt-0.5">{{ t('student-info') }}</p>
      </div>
    </template>
    <template #body>
      <div v-if="teacherOwnedUserAccount && editUserInfo" class="edit-student-form">
        <PInput
          v-model="editUserInfo.name"
          :label="t('name')"
          :placeholder="t('name')"
          required
        />
        <PInput
          v-model="editUserInfo.nickname"
          :label="t('nickname')"
          :placeholder="t('nickname')"
        />
        <PSelect
          v-model="studentGrade"
          :label="t('grade')"
          :items="gradeOptions"
          :placeholder="t('select-grade')"
          required
        />
        <PSelect
          v-model="studentStatus"
          :label="t('status')"
          :items="statusOptions"
        />
        <div class="login-code-link">
          <button class="login-code-btn" @click="openLoginCode">
            {{ t('login-code') }} →
          </button>
          <!-- TODO: backend — needs per-student QR generation endpoint -->
        </div>
      </div>
      <div v-else>
        <DecryptedName :user="id" />
      </div>
    </template>
    <template #footer>
      <PButton variant="secondary" :text="t('cancel')" @click="cancel" />
      <PButton variant="primary" :text="t('save')" @click="save" />
    </template>
  </PModal>
</template>

<style scoped>
.edit-student-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-code-link {
  padding-top: 4px;
}

.login-code-btn {
  background: none;
  border: none;
  color: var(--color-primary-600, #2563eb);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}
.login-code-btn:hover {
  text-decoration: underline;
}
</style>
