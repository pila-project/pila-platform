<template>
  <div class="role-table">
    <div class="role-table-header">
      <h2 class="text-xl font-semibold text-zinc-950">{{ props.header }}</h2>
      <div class="role-table-header-actions">
        <PButton
          v-if="downloadable"
          @click="download"
          variant="secondary"
          size="sm"
          :text="t('download')"
        />
        <PButton
          v-if="editable && props.approvalColumns"
          variant="primary"
          size="sm"
          text="Create teacher account"
          @click="openCreateTeacherAccount"
        />
        <PButton
          v-if="editable && props.approvalColumns"
          variant="secondary"
          size="sm"
          text="Admin encryption key"
          @click="openAdminEncryptionKeyDialog(false)"
        />
      </div>
    </div>

    <PTable
      :items="taggings"
      :loading="loading"
      :headers="headers"
      :noDataText="t('no-one-has-been-assigned-this-role')"
      :itemsPerPageText="t('items-per-page')"
      :itemsPerPage="itemsPerPage"
      :itemsPerPageOptions="[
        { value: 10, title: '10' },
        { value: 25, title: '25' },
        { value: 50, title: '50' },
        { value: 100, title: '100' },
        { value: -1, title: t('all') },
      ]"
    >
      <template v-if="props.approvalColumns" #item.userName="{ item }">
        {{ item.userName }}
      </template>
      <template #item.target="{ item }">
        <DecryptedName avatar :user="item.target" />
      </template>
      <template v-if="props.approvalColumns" #item.accountType="{ item }">
        {{ item.accountType }}
      </template>
      <template v-if="props.approvalColumns" #item.approvalDateMs="{ item }">
        {{ formatDate(item.approvalDate) }}
      </template>
      <template v-if="props.approvalColumns" #item.approvedByName="{ item }">
        <DecryptedName avatar :user="item.contributor" />
      </template>
      <template v-if="props.approvalColumns" #item.credentials="{ item }">
        <PButton
          v-if="item.accountType === 'PILA-created'"
          size="sm"
          variant="secondary"
          text="View code"
          @click="openTeacherCredentials(item)"
        />
      </template>
      <template
        v-for="{ id, key, templateSlot, editable: relEditable, values } in relatedTagTemplateData"
        :key="key"
        #[templateSlot]="{ item }"
      >
        <template v-if="relEditable">
          <PSelect
            v-if="values"
            :items="values"
            :itemTitle="v => t(v?.label || 'teacher')"
            returnObject
            :modelValue="relatedTagStates[id][item.target]"
            @update:modelValue="val => setRelatedTag(id, item.target, val)"
          />
          <button
            v-else
            type="button"
            class="inline-flex"
            @click="toggleRelatedTag(id, item.target)"
          >
            <LucideIcon :name="relatedTagStates[id][item.target] ? 'check-square' : 'square'" :size="16" />
          </button>
        </template>
      </template>
      <template v-if="!props.approvalColumns" #item.contributor="{ item }">
        <DecryptedName avatar :user="item.contributor" />
      </template>
      <template #item.edit="{ item }">
        <button
          v-if="editable"
          type="button"
          class="text-slate-400 hover:text-red-600"
          @click="potentialRemoval = item.target"
        >
          <LucideIcon name="x" :size="16" />
        </button>
      </template>
    </PTable>

    <PModal
      v-if="potentialRemoval"
      width="500px"
      :title="t('are-you-sure')"
      @close="potentialRemoval = null"
    >
      <template #footer>
        <PButton variant="secondary" color="danger" :text="t('cancel')" @click="potentialRemoval = null" />
        <PButton
          variant="primary"
          color="danger"
          :text="t('remove')"
          @click="() => { tag(potentialRemoval, null); potentialRemoval = null }"
        />
      </template>
    </PModal>

    <!-- Add by user id (non-approval mode) -->
    <PModal
      v-if="editable && !props.approvalColumns && showAddDialog"
      width="500px"
      :title="`${t('add')} ${props.header}`"
      @close="showAddDialog = false"
    >
      <template #body>
        <PInput
          autofocus
          v-model="newRoleUser"
          :label="t('user-id')"
          :error="newRoleUser && !isUUID(newRoleUser) ? 'Enter a valid user id' : ''"
          @enter="submitNewTeacher(newRoleUser)"
          required
        />
      </template>
      <template #footer>
        <PButton variant="secondary" color="danger" :text="t('cancel')" @click="showAddDialog = false" />
        <PButton variant="primary" :text="t('add')" @click="submitNewTeacher(newRoleUser)" />
      </template>
    </PModal>
    <PButton
      v-if="editable && !props.approvalColumns"
      variant="secondary"
      :text="t('add-new')"
      @click="showAddDialog = true"
      class="mt-4"
    />

    <!-- Admin encryption key -->
    <PModal
      v-if="props.approvalColumns && showAdminEncryptionKeyDialog"
      width="500px"
      title="Admin encryption key"
      @close="cancelAdminEncryptionKeyDialog"
    >
      <template #body>
        <p class="text-sm text-slate-600 mb-3">
          This key encrypts the names and login codes for every teacher account you create. It is saved only on this device.
        </p>
        <PInput
          v-model="adminSecretDraft"
          label="Admin encryption key"
          :type="showAdminSecret ? 'text' : 'password'"
          :error="adminSecretError"
        />
        <label class="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
          <input v-model="showAdminSecret" type="checkbox" />
          Show key
        </label>
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('cancel')" @click="cancelAdminEncryptionKeyDialog" />
        <PButton
          variant="primary"
          text="Save"
          :disabled="!adminSecretDraft"
          @click="saveAdminEncryptionKey"
        />
      </template>
    </PModal>

    <!-- Create teacher account -->
    <PModal
      v-if="props.approvalColumns && showCreateTeacherAccountDialog"
      width="500px"
      title="Create teacher account"
      @close="showCreateTeacherAccountDialog = false"
    >
      <template #body>
        <PInput v-model="newTeacherName" label="User name" autofocus />
        <p class="text-sm text-slate-500 mt-3">
          The admin encryption key saved on this device will be used.
        </p>
        <p class="text-sm text-slate-500 mt-1">
          This will create a PILA 8-element login code and QR code, then approve the account for teacher access.
        </p>
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('cancel')" @click="showCreateTeacherAccountDialog = false" />
        <PButton
          variant="primary"
          text="Create"
          :loading="creatingTeacherAccount"
          :disabled="!canCreateTeacherAccount"
          @click="createTeacherAccount"
        />
      </template>
    </PModal>

    <!-- Created teacher account -->
    <PModal
      v-if="props.approvalColumns && showCreatedTeacherAccountDialog"
      width="500px"
      title="Teacher login code"
      @close="showCreatedTeacherAccountDialog = false"
    >
      <template #body>
        <LoginCodeCard
          v-if="createdTeacherAccount"
          :name="createdTeacherAccount.name"
          :loginCode="createdTeacherAccount.loginCode"
        />
      </template>
      <template #footer>
        <PButton
          variant="secondary"
          text="Save"
          @click="downloadLoginCode(createdTeacherAccount)"
        />
        <PButton
          variant="secondary"
          text="Print"
          @click="printLoginCode(createdTeacherAccount)"
        />
        <PButton :text="t('close')" variant="primary" @click="showCreatedTeacherAccountDialog = false" />
      </template>
    </PModal>

    <!-- View teacher credentials -->
    <PModal
      v-if="props.approvalColumns && showTeacherCredentialsDialog"
      width="500px"
      title="Teacher login code"
      @close="() => { showTeacherCredentialsDialog = false; clearTeacherCredentials() }"
    >
      <template #body>
        <div v-if="loadingTeacherCredentials" class="text-center py-6 text-sm text-slate-500">
          Loading…
        </div>
        <LoginCodeCard
          v-else-if="decryptedTeacherCredentials"
          :name="decryptedTeacherCredentials.name"
          :loginCode="decryptedTeacherCredentials.loginCode"
        />
        <div
          v-else-if="teacherCredentialRecordUnavailable"
          class="text-sm text-slate-600 p-3 rounded border border-slate-200 bg-slate-50"
        >
          No saved login code is available for this teacher. Accounts created before encrypted credential storage was enabled cannot be recovered.
        </div>
        <div v-else class="space-y-3">
          <div class="text-sm text-amber-800 p-3 rounded border border-amber-200 bg-amber-50">
            {{ credentialKeyError || 'Set the admin encryption key used when this teacher account was created.' }}
          </div>
          <PButton
            variant="secondary"
            text="Update admin encryption key"
            @click="openAdminEncryptionKeyDialog(false)"
          />
          <div class="border-t border-slate-200 pt-3">
            <p class="text-sm font-medium mb-2">Super-admin access</p>
            <PInput
              v-model="superAdminKeyInput"
              label="Super-admin key"
              type="password"
              :error="superAdminKeyError"
              @enter="unlockWithSuperAdminKey"
            />
            <PButton
              class="mt-2"
              variant="secondary"
              text="Unlock once with super-admin key"
              :disabled="!superAdminKeyInput"
              @click="unlockWithSuperAdminKey"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <template v-if="decryptedTeacherCredentials">
          <PButton
            variant="secondary"
            text="Save"
            @click="downloadLoginCode(decryptedTeacherCredentials)"
          />
          <PButton
            variant="secondary"
            text="Print"
            @click="printLoginCode(decryptedTeacherCredentials)"
          />
        </template>
        <PButton
          variant="primary"
          :text="t('close')"
          @click="() => { showTeacherCredentialsDialog = false; clearTeacherCredentials() }"
        />
      </template>
    </PModal>
  </div>
</template>

<script setup>
  import { ref, reactive, computed } from 'vue'
  import { validate as isUUID } from 'uuid'
  import DecryptedName from '@/components/common/decrypted-name.vue'
  import LoginCodeCard from '@/components/login-code-card.vue'
  import { useStore } from 'vuex'
  import { json2csv } from 'json-2-csv'
  import { PTable, PModal, PButton, PInput, PSelect } from '@/components/ui/index.js'
  import LucideIcon from '@/components/ui/LucideIcon.vue'
  import { createUser, randomUserSecret } from '@/user-utils.js'
  import { downloadLoginCode, printLoginCode } from '@/login-code-document.js'
  import {
    createTeacherLoginCredentialRecord,
    decryptTeacherLoginCredentialRecord,
    getStoredAdminCredentialSecret,
    readTeacherLoginCredentialRecord,
    storeAdminCredentialSecret,
    writeTeacherLoginCredentialRecord,
  } from '@/teacher-login-credentials.js'

  const store = useStore()
  function t(slug) { return store.getters.t(slug) }

  function submitNewTeacher(user) {
    if (isUUID(user)) {
      tag(user, true)
      showAddDialog.value = false
    }
  }

  const props = defineProps({
    partition: String,
    tag: String,
    header: String,
    descendentTaggings: {
      type: Boolean,
      default: false,
    },
    relatedTags: {
      type: Array,
      default: () => [],
    },
    approvalColumns: {
      type: Boolean,
      default: false,
    },
    editable: {
      type: Boolean,
      default: true,
    },
    downloadable: {
      type: Boolean,
      default: false,
    },
  })
  const emit = defineEmits(['tag'])

  const loading = ref(true)
  const taggings = ref([])
  const newRoleUser = ref('')
  const potentialRemoval = ref(null)
  const showAddDialog = ref(false)
  const showAdminEncryptionKeyDialog = ref(false)
  const showCreateTeacherAccountDialog = ref(false)
  const showCreatedTeacherAccountDialog = ref(false)
  const showTeacherCredentialsDialog = ref(false)
  const newTeacherName = ref('')
  const adminSecret = ref(getStoredAdminCredentialSecret(store.state.user))
  const adminSecretDraft = ref('')
  const showAdminSecret = ref(false)
  const adminSecretError = ref('')
  const createTeacherAfterKeySave = ref(false)
  const creatingTeacherAccount = ref(false)
  const createdTeacherAccount = ref(null)
  const teacherCredentialRecord = ref(null)
  const decryptedTeacherCredentials = ref(null)
  const teacherCredentialRecordUnavailable = ref(false)
  const loadingTeacherCredentials = ref(false)
  const credentialKeyError = ref('')
  const superAdminKeyInput = ref('')
  const superAdminKeyError = ref('')

  const itemsPerPage = props.approvalColumns ? -1 : 10
  const effectiveRelatedTags = props.approvalColumns ? [] : props.relatedTags
  const hasTeacherNameLetter = computed(() => /\p{L}/u.test(newTeacherName.value || ''))
  const canCreateTeacherAccount = computed(() => (
    hasTeacherNameLetter.value
      && !!adminSecret.value
      && !creatingTeacherAccount.value
  ))

  const headers = props.approvalColumns
    ? [
        { key: 'userName', title: 'User name' },
        { key: 'target', title: 'User ID' },
        { key: 'accountType', title: 'Account type' },
        { key: 'approvalDateMs', title: 'Approval date' },
        { key: 'approvedByName', title: 'Approved by' },
        { key: 'credentials', title: 'Login code' },
        { key: 'edit', title: 'Remove access' },
      ]
    : [
        { key: 'target', title: t('user') },
      ]

  const relatedTagStates = reactive({})

  effectiveRelatedTags.forEach(({ id }) => {
    relatedTagStates[id] = {}
    Agent
      .query(
        'taggings-for-tag',
        [props.partition, id],
        'tags.knowlearning.systems',
      )
      .then(results => {
        results.forEach(({ target, value }) => {
          relatedTagStates[id][target] = value
        })
      })
  })

  const relatedTagTemplateData = computed(() => {
    return effectiveRelatedTags.map(({ id, editable, values }, index) => ({
      id,
      editable,
      values,
      key: `relatedTag${index}`,
      templateSlot: `item.relatedTag${index}`,
    }))
  })

  if (!props.approvalColumns) {
    await Promise.all(relatedTagTemplateData.value.map(async ({ id, key }) => {
      const { name } = await Agent.state(id)
      headers.push({ key, title: t(name) })
    }))
    headers.push({ key: 'contributor', title: t('assigned-by') })
    headers.push({ key: 'edit', title: '' })
  }

  fetchTaggings()

  function setRelatedTag(relatedTagId, target, value) {
    relatedTagStates[relatedTagId][target] = value
    tag(target, value, relatedTagId)
  }

  function toggleRelatedTag(relatedTagId, target) {
    const value = !relatedTagStates[relatedTagId][target]
    relatedTagStates[relatedTagId][target] = value
    tag(target, value ? true : null, relatedTagId)
  }

  async function tag(target, value, tagId) {
    loading.value = true
    emit('tag', { tag: tagId || props.tag, target, value })
    await Agent.synced()
    await new Promise(r => setTimeout(r, 500))
    fetchTaggings()
  }

  function openCreateTeacherAccount() {
    if (!adminSecret.value) {
      openAdminEncryptionKeyDialog(true)
      return
    }
    showCreateTeacherAccountDialog.value = true
  }

  function openAdminEncryptionKeyDialog(thenCreate) {
    createTeacherAfterKeySave.value = !!thenCreate
    adminSecretDraft.value = adminSecret.value || ''
    adminSecretError.value = ''
    showAdminEncryptionKeyDialog.value = true
  }

  function cancelAdminEncryptionKeyDialog() {
    createTeacherAfterKeySave.value = false
    showAdminEncryptionKeyDialog.value = false
  }

  async function saveAdminEncryptionKey() {
    if (!adminSecretDraft.value) return
    adminSecretError.value = ''

    if (teacherCredentialRecord.value && !decryptedTeacherCredentials.value) {
      try {
        const result = await decryptTeacherLoginCredentialRecord(
          teacherCredentialRecord.value,
          adminSecretDraft.value,
        )
        if (result.keyType !== 'admin') {
          adminSecretError.value = 'Use the one-time super-admin field instead of saving the super-admin key.'
          return
        }
        decryptedTeacherCredentials.value = result.credentials
      } catch {
        adminSecretError.value = 'That key cannot decrypt this teacher account.'
        return
      }
    }

    storeAdminCredentialSecret(store.state.user, adminSecretDraft.value)
    adminSecret.value = adminSecretDraft.value
    credentialKeyError.value = ''
    showAdminEncryptionKeyDialog.value = false
    const openCreate = createTeacherAfterKeySave.value
    createTeacherAfterKeySave.value = false
    adminSecretDraft.value = ''
    if (openCreate) showCreateTeacherAccountDialog.value = true
  }

  async function createTeacherAccount() {
    if (!canCreateTeacherAccount.value) return
    creatingTeacherAccount.value = true
    try {
      const credentials = {
        loginCode: randomUserSecret(),
        name: newTeacherName.value.trim(),
      }
      const id = await createUser(credentials.loginCode, adminSecret.value, {
        name: credentials.name,
      })
      const credentialRecord = await createTeacherLoginCredentialRecord(
        credentials,
        adminSecret.value,
      )
      await writeTeacherLoginCredentialRecord(Agent, id, credentialRecord)
      await tag(id, true)
      createdTeacherAccount.value = { id, ...credentials }
      showCreateTeacherAccountDialog.value = false
      showCreatedTeacherAccountDialog.value = true
      newTeacherName.value = ''
    } finally {
      creatingTeacherAccount.value = false
    }
  }

  async function openTeacherCredentials(teacher) {
    showTeacherCredentialsDialog.value = true
    loadingTeacherCredentials.value = true
    teacherCredentialRecord.value = null
    decryptedTeacherCredentials.value = null
    teacherCredentialRecordUnavailable.value = false
    credentialKeyError.value = ''
    superAdminKeyInput.value = ''
    superAdminKeyError.value = ''

    try {
      const owners = [...new Set([store.state.user, teacher.contributor].filter(Boolean))]
      for (const owner of owners) {
        teacherCredentialRecord.value = await readTeacherLoginCredentialRecord(
          Agent,
          teacher.target,
          owner,
        )
        if (teacherCredentialRecord.value) break
      }

      if (!teacherCredentialRecord.value) {
        teacherCredentialRecordUnavailable.value = true
        return
      }

      const storedKey = getStoredAdminCredentialSecret(store.state.user)
      if (storedKey) {
        try {
          const { credentials, keyType } = await decryptTeacherLoginCredentialRecord(
            teacherCredentialRecord.value,
            storedKey,
          )
          if (keyType !== 'admin') throw new Error('The saved key is not an admin key.')
          decryptedTeacherCredentials.value = credentials
          return
        } catch {
          credentialKeyError.value = 'The key saved on this device is not valid for this teacher.'
        }
      } else {
        credentialKeyError.value = 'No admin encryption key is saved on this device.'
      }
    } catch (error) {
      console.warn('Unable to load teacher credentials.', error)
      teacherCredentialRecordUnavailable.value = true
    } finally {
      loadingTeacherCredentials.value = false
    }
  }

  async function unlockWithSuperAdminKey() {
    if (!teacherCredentialRecord.value || !superAdminKeyInput.value) return
    superAdminKeyError.value = ''
    try {
      const { credentials, keyType } = await decryptTeacherLoginCredentialRecord(
        teacherCredentialRecord.value,
        superAdminKeyInput.value,
      )
      if (keyType !== 'super-admin') {
        superAdminKeyError.value = 'This is an admin key. Save it using the Encryption key dialog.'
        return
      }
      decryptedTeacherCredentials.value = credentials
      superAdminKeyInput.value = ''
    } catch (error) {
      superAdminKeyError.value = error.message
    }
  }

  function clearTeacherCredentials() {
    teacherCredentialRecord.value = null
    decryptedTeacherCredentials.value = null
    teacherCredentialRecordUnavailable.value = false
    credentialKeyError.value = ''
    superAdminKeyInput.value = ''
    superAdminKeyError.value = ''
  }

  async function fetchTaggings() {
    loading.value = true
    const query = props.descendentTaggings ? 'my-descendent-taggings-for-tag' : 'taggings-for-tag'
    await (
      Agent
        .query(query, [props.partition, props.tag], 'tags.knowlearning.systems')
        .then(result => {
          result.forEach(
            o => relatedTagTemplateData.value.forEach(({ key }) => { o[key] = true }),
          )
          return result
        })
    )
      .then(async result => {
        taggings.value = props.approvalColumns
          ? await Promise.all(result.map(enrichApprovalTagging))
          : result
      })

    taggings.value.forEach(result => {
      effectiveRelatedTags.forEach(({ id }) => {
        if (relatedTagStates[id][result.target]) return
        relatedTagStates[id][result.target] = false
      })
    })
    loading.value = false
  }

  async function download() {
    const table = await Promise.all(
      taggings.value.map(async ({ target }) => {
        const entry = { [t('user')]: target }
        await Promise.all(
          Object.entries(relatedTagStates).map(async ([tagId, tagTargets]) => {
            const { name } = await Agent.state(tagId)
            entry[t(name)] = tagTargets[target] || null
          }),
        )
        return entry
      }),
    )
    const csv = await json2csv(table)
    const file = new File([csv], `${t('teachers')}-${(new Date()).toLocaleString()}.csv`, {
      type: 'text/plain',
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(file)
    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  async function enrichApprovalTagging(tagging) {
    const approvalDate = tagging.timestamp || tagging.updated || tagging.created
    const [userName, approvedByName, accountType] = await Promise.all([
      userNameFor(tagging.target),
      userNameFor(tagging.contributor),
      accountTypeFor(tagging.target),
    ])
    return {
      ...tagging,
      userName,
      approvedByName,
      accountType,
      approvalDate,
      approvalDateMs: dateMs(approvalDate),
    }
  }

  async function accountTypeFor(user) {
    try {
      const userData = await Agent.state(user)
      return userData?.providerEncryptedKey ? 'PILA-created' : 'SSO'
    } catch (error) {
      console.warn(`Unable to determine account type for ${user}.`, error)
      return 'Unknown'
    }
  }

  async function userNameFor(user) {
    if (!user) return ''
    try {
      const info = await store.getters.decryptUserInfo(user)
      return info?.name || user
    } catch (error) {
      console.warn(`Unable to load user name for ${user}.`, error)
      return user
    }
  }

  function dateMs(date) {
    if (!date) return 0
    const ms = new Date(date).getTime()
    return Number.isNaN(ms) ? 0 : ms
  }

  function formatDate(date) {
    if (!date) return ''
    const parsed = new Date(date)
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString()
  }
</script>

<style scoped>
.role-table-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.role-table-header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
