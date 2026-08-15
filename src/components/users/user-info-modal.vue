<script setup>
  import { ref, reactive, computed } from 'vue'
  import { useStore } from 'vuex'
  import { generateKeyPair, decryptSymmetric } from '@/utils/encryption.js'
  import { createUser } from '@/utils/user-utils.js'
  import DecryptedName from '@/components/common/decrypted-name.vue'
  import { PModal, PButton, PInput, PSelect, PBadge } from '@/components/ui/index.js'
  import LucideIcon from '@/components/ui/LucideIcon.vue'

  const store = useStore()

  const props = defineProps({ id: String })
  const emit = defineEmits(['close', 'open-login-code', 'saved'])

  const open = ref(true)

  const userData = reactive(await Agent.state(props.id))
  const usersState = reactive(await Agent.state('users'))

  const archived = ref(!!usersState[props.id]?.archived)
  const studentGrade = ref(usersState[props.id]?.grade || '')
  const studentStatus = ref(archived.value ? 'archived' : 'active')
  const saving = ref(false)

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
    saving.value = true
    try {
      if (teacherOwnedUserAccount && userSecret) {
        await createUser(userSecret, providerSecret, editUserInfo)
      }

      // Save grade (and archived) to the top-level 'users' Agent state collection.
      // We must await Agent.synced() so the write (including adding `grade` to
      // legacy student records that never had the field) is flushed and visible
      // to Agent.watch('users') listeners in manage-classes.vue etc.
      if (usersState[props.id]) {
        usersState[props.id].grade = studentGrade.value || undefined

        // Update archived status based on dropdown
        const shouldBeArchived = studentStatus.value === 'archived'
        if (shouldBeArchived !== !!usersState[props.id]?.archived) {
          usersState[props.id].archived = shouldBeArchived
        }
      }

      await Agent.synced()
    } finally {
      saving.value = false
    }

    open.value = false
    emit('saved')
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
        <h2 class="text-lg font-semibold text-zinc-950">{{ t('edit-students-details') }}</h2>
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
        <button class="login-code-card" @click="openLoginCode">
          <div class="login-code-card-icon">
            <LucideIcon name="upload" :size="18" />
          </div>
          <div class="login-code-card-text">
            <span class="login-code-card-title">{{ t('login-code') }}</span>
          </div>
          <LucideIcon name="chevron-right" :size="16" class="login-code-card-arrow" />
        </button>
      </div>
      <div v-else>
        <DecryptedName :user="id" />
      </div>
    </template>
    <template #footer>
      <PButton variant="secondary" color="danger" :text="t('cancel')" @click="cancel" />
      <PButton variant="primary" :text="t('save-changes')" :loading="saving" :disabled="saving" @click="save" />
    </template>
  </PModal>
</template>

<style scoped>
.edit-student-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-code-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: background 150ms;
}
.login-code-card:hover {
  background: #f1f5f9;
}
.login-code-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  flex-shrink: 0;
}
.login-code-card-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  text-align: left;
}
.login-code-card-title {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}
.login-code-card-subtitle {
  font-size: 12px;
  color: #64748b;
}
.login-code-card-arrow {
  color: #94a3b8;
  flex-shrink: 0;
}
</style>
