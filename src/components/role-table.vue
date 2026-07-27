<template>
  <div class="text-h3">
    {{ props.header }}
    <v-btn
      v-if="downloadable"
      @click="download"
    >
      {{ t('download') }}
    </v-btn>
    <v-btn
      v-if="props.approvalColumns && isSimplifiedStudyDomain"
      class="ml-4"
      :color="adminSecret ? undefined : 'warning'"
      variant="tonal"
      prepend-icon="fa-solid fa-key"
      text="Encryption key"
      @click="openAdminEncryptionKeyDialog(false)"
    />
    <v-btn
      v-if="props.approvalColumns && isSimplifiedStudyDomain"
      class="ml-2"
      color="primary"
      prepend-icon="fa-solid fa-user-plus"
      text="Create teacher account"
      @click="openCreateTeacherAccountDialog"
    />
  </div>
  <v-data-table
    sticky
    v-model:sort-by="sortBy"
    :items="taggings"
    :loading="loading"
    :headers="headers"
    :must-sort="props.approvalColumns"
    :items-per-page="itemsPerPage"
    :no-data-text="t('no-one-has-been-assigned-this-role')"
    :items-per-page-text="t('items-per-page')"
    :items-per-page-options="[
      {value: 10, title: '10'},
      {value: 25, title: '25'},
      {value: 50, title: '50'},
      {value: 100, title: '100'},
      {value: -1, title: t('all')}
    ]"
  >
    <template v-slot:item.target="data">
      <span v-if="props.approvalColumns">
        {{ data.item.target }}
      </span>
      <DecryptedName
        v-else
        avatar
        :user="data.item.target"
      />
    </template>
    <template v-slot:item.userName="data">
      <DecryptedName
        avatar
        :user="data.item.target"
      />
    </template>
    <template v-slot:item.approvalDateMs="data">
      {{ formatDate(data.item.approvalDate) }}
    </template>
    <template v-slot:item.approvedByName="data">
      <DecryptedName
        avatar
        :user="data.item.contributor"
      />
    </template>
    <template v-slot:item.credentials="data">
      <v-btn
        v-if="data.item.accountType === 'PILA-created'"
        size="small"
        variant="tonal"
        prepend-icon="fa-solid fa-key"
        text="View code"
        @click="openTeacherCredentials(data.item)"
      />
    </template>
    <template
      v-for="{ id, key, templateSlot, editable, values } in relatedTagTemplateData"
      :key="key"
      v-slot:[templateSlot]="data"
    >
      <template v-if="editable">
        <v-select
          v-if="values"
          density="compact"
          variant="solo"
          :items="values"
          :item-title="v => t(v?.label || 'teacher')"
          return-object
          v-model="relatedTagStates[id][data.item.target]"
          @update:modelValue="val => setRelatedTag(id, data.item.target, val)"
        />
        <v-icon
          v-else
          class="d-inline-flex"
          :icon="`fa-regular fa-square${relatedTagStates[id][data.item.target] ? '-check' : ''}`"
          @click="toggleRelatedTag(id, data.item.target)"
        />
      </template>
    </template>
    <template v-slot:item.contributor="data">
      <DecryptedName
        avatar
        :user="data.item.contributor"
      />
    </template>
    <template v-slot:item.edit="data">
      <v-btn
        v-if="editable && props.approvalColumns"
        color="error"
        variant="tonal"
        prepend-icon="fa-solid fa-xmark"
        text="Remove access"
        @click="potentialRemoval = data.item.target"
      />
      <v-btn
        v-else-if="editable"
        variant="plain"
        icon="fa-solid fa-xmark"
        @click="potentialRemoval = data.item.target"
      />
    </template>
  </v-data-table>
  <v-dialog
    max-width="500"
    v-model="potentialRemoval"
  >
    <template v-slot:default="{ isActive }">
      <v-card :title="t('are-you-sure')">
        <template v-slot:actions>
          <v-spacer></v-spacer>
          <v-btn @click="potentialRemoval = null">
            {{t('cancel')}}
          </v-btn>
          <v-btn @click="() => {
            tag(potentialRemoval, null)
            potentialRemoval = null
          }">
            {{t('remove')}}
          </v-btn>
        </template>
      </v-card>
    </template>
  </v-dialog>
  <v-dialog
    v-if="editable && !props.approvalColumns"
    max-width="500"
  >
    <template v-slot:activator="{ props: activatorProps }">
      <v-btn v-bind="activatorProps">{{ t('add-new') }}</v-btn>
    </template>
    <template v-slot:default="{ isActive }">
      <v-card :title="`${t('add')} ${props.header}`">
        <v-card-text>
          <v-text-field
            autofocus
            v-model="newRoleUser"
            :label="t('user-id')"
            :rules="[validateUUID]"
            @keypress.enter="submitNewTeacher(newRoleUser, isActive)"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            :text="t('add')"
            @click="submitNewTeacher(newRoleUser, isActive)"
          />
          <v-btn
            :text="t('cancel')"
            @click="isActive.value = false"
          />
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
  <v-dialog
    v-if="props.approvalColumns"
    v-model="showAdminEncryptionKeyDialog"
    max-width="500"
    @afterLeave="clearAdminEncryptionKeyDialog"
  >
    <v-card title="Admin encryption key">
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-4">
          This key encrypts the names and login codes for every teacher account you create. It is saved only on this device.
        </p>
        <v-text-field
          autofocus
          v-model="adminSecretDraft"
          label="Encryption key"
          :type="showAdminSecret ? 'text' : 'password'"
          :append-inner-icon="showAdminSecret ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
          :error-messages="adminSecretError"
          autocomplete="off"
          @click:append-inner="showAdminSecret = !showAdminSecret"
          @keydown.enter="saveAdminEncryptionKey"
        />
        <p class="text-caption text-medium-emphasis">
          Editing this value does not re-encrypt accounts created with a different key.
        </p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          :text="t('cancel')"
          @click="cancelAdminEncryptionKeyDialog"
        />
        <v-btn
          color="primary"
          text="Save key"
          :disabled="!adminSecretDraft"
          @click="saveAdminEncryptionKey"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog
    v-if="props.approvalColumns"
    v-model="showCreateTeacherAccountDialog"
    max-width="500"
  >
    <v-card title="Create teacher account">
      <v-card-text>
        <v-text-field
          autofocus
          v-model="newTeacherName"
          label="User name"
          :rules="teacherNameRules"
          required
        />
        <p class="text-body-2 text-medium-emphasis mb-2">
          The admin encryption key saved on this device will be used.
        </p>
        <p class="text-body-2 text-medium-emphasis">
          This will create a PILA 8-element login code and QR code, then approve the account for teacher access.
        </p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          :text="t('cancel')"
          @click="showCreateTeacherAccountDialog = false"
        />
        <v-btn
          color="primary"
          text="Create"
          :loading="creatingTeacherAccount"
          :disabled="!canCreateTeacherAccount"
          @click="createTeacherAccount"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog
    v-if="props.approvalColumns"
    v-model="showCreatedTeacherAccountDialog"
    max-width="500"
    @afterLeave="createdTeacherAccount = null"
  >
    <v-card title="Teacher login code">
      <v-card-text>
        <LoginCodeCard
          v-if="createdTeacherAccount"
          :name="createdTeacherAccount.name"
          :loginCode="createdTeacherAccount.loginCode"
        />
      </v-card-text>
      <v-card-actions>
        <v-btn
          prepend-icon="fa-solid fa-download"
          text="Save"
          @click="downloadLoginCode(createdTeacherAccount)"
        />
        <v-btn
          prepend-icon="fa-solid fa-print"
          text="Print"
          @click="printLoginCode(createdTeacherAccount)"
        />
        <v-spacer />
        <v-btn
          :text="t('close')"
          @click="showCreatedTeacherAccountDialog = false"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog
    v-if="props.approvalColumns"
    v-model="showTeacherCredentialsDialog"
    max-width="500"
    @afterLeave="clearTeacherCredentials"
  >
    <v-card title="Teacher login code">
      <v-card-text>
        <div v-if="loadingTeacherCredentials" class="text-center pa-6">
          <v-progress-circular indeterminate color="primary" />
        </div>
        <LoginCodeCard
          v-else-if="decryptedTeacherCredentials"
          :name="decryptedTeacherCredentials.name"
          :loginCode="decryptedTeacherCredentials.loginCode"
        />
        <v-alert
          v-else-if="teacherCredentialRecordUnavailable"
          type="info"
          variant="tonal"
          text="No saved login code is available for this teacher. Accounts created before encrypted credential storage was enabled cannot be recovered."
        />
        <div v-else>
          <v-alert
            type="warning"
            variant="tonal"
            :text="credentialKeyError || 'Set the admin encryption key used when this teacher account was created.'"
            class="mb-4"
          />
          <v-btn
            block
            variant="tonal"
            prepend-icon="fa-solid fa-key"
            text="Update admin encryption key"
            @click="openAdminEncryptionKeyDialog(false)"
          />
          <v-divider class="my-5" />
          <p class="text-body-2 mb-2">Super-admin access</p>
          <v-text-field
            v-model="superAdminKeyInput"
            label="Super-admin key"
            type="password"
            :error-messages="superAdminKeyError"
            @keydown.enter="unlockWithSuperAdminKey"
          />
          <v-btn
            block
            variant="text"
            text="Unlock once with super-admin key"
            :disabled="!superAdminKeyInput"
            @click="unlockWithSuperAdminKey"
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <template v-if="decryptedTeacherCredentials">
          <v-btn
            prepend-icon="fa-solid fa-download"
            text="Save"
            @click="downloadLoginCode(decryptedTeacherCredentials)"
          />
          <v-btn
            prepend-icon="fa-solid fa-print"
            text="Print"
            @click="printLoginCode(decryptedTeacherCredentials)"
          />
        </template>
        <v-spacer />
        <v-btn
          :text="t('close')"
          @click="showTeacherCredentialsDialog = false"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
  import { ref, reactive, computed } from 'vue'
  import { validate as isUUID } from 'uuid'
  import DecryptedName from './decrypted-name.vue'
  import LoginCodeCard from './login-code-card.vue'
  import { useStore } from 'vuex'
  import { json2csv } from 'json-2-csv'
  import { SIMPLIFIED_STUDY_DOMAINS } from '../constants.js'
  import { createUser, randomUserSecret } from '../user-utils.js'
  import { downloadLoginCode, printLoginCode } from '../login-code-document.js'
  import {
    createTeacherLoginCredentialRecord,
    decryptTeacherLoginCredentialRecord,
    getStoredAdminCredentialSecret,
    readTeacherLoginCredentialRecord,
    storeAdminCredentialSecret,
    writeTeacherLoginCredentialRecord
  } from '../teacher-login-credentials.js'

  const store = useStore()
  const isSimplifiedStudyDomain = SIMPLIFIED_STUDY_DOMAINS.includes(window.location.host)

  function t(slug) { return store.getters.t(slug) }

  function validateUUID(val) {
    return isUUID(val) || 'Enter a valid user id'
  }
  function submitNewTeacher(user, isActive) {
    if (isUUID(user)) {
      tag(user, true)
      isActive.value = false
    }
  }
  const props = defineProps({
    partition: String,
    tag: String,
    header: String,
    descendentTaggings: {
      type: Boolean,
      default: false
    },
    relatedTags: {
      type: Array,
      default: () => []
    },
    approvalColumns: {
      type: Boolean,
      default: false
    },
    editable: {
      type: Boolean,
      default: true
    },
    downloadable: {
      type: Boolean,
      defaut: false
    }
  })
  const emit = defineEmits(['tag'])

  const loading = ref(true)
  const taggings = ref([])
  const newRoleUser = ref('')
  const potentialRemoval = ref(null)
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
  const sortBy = ref(props.approvalColumns ? [{ key: 'approvalDateMs', order: 'desc' }] : [])
  const itemsPerPage = props.approvalColumns ? -1 : 10
  const effectiveRelatedTags = props.approvalColumns ? [] : props.relatedTags
  const hasTeacherNameLetter = computed(() => /\p{L}/u.test(newTeacherName.value || ''))
  const teacherNameRules = [
    () => hasTeacherNameLetter.value || 'Enter at least one letter.'
  ]
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
      { key: 'credentials', title: 'Login code', sortable: false },
      { key: 'edit', title: 'Remove access', sortable: false }
    ]
    : [
      { key: 'target', title: t('user') }
    ]

  const relatedTagStates = reactive({})

  effectiveRelatedTags.forEach(({ id, editable }) => {
    relatedTagStates[id] = {}
    Agent
      .query(
        'taggings-for-tag',
        [props.partition, id],
        'tags.knowlearning.systems'
      )
      .then(results => {
        results
          .forEach(({ target, value }) => {
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
      templateSlot: `item.relatedTag${index}`
    }))
  })

  await Promise.all(relatedTagTemplateData.value.map(async ({ id, key }, index) => {
    const { name } = await Agent.state(id)
    headers.push({ key, title: t(name) })
  }))

  if (!props.approvalColumns) {
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

  async function tag(target, value, tag) {
    loading.value = true
    emit('tag', { tag: tag || props.tag, target, value })
    await Agent.synced()
    await new Promise(r => setTimeout(r, 500))
    fetchTaggings()
  }

  function openCreateTeacherAccountDialog() {
    if (adminSecret.value) showCreateTeacherAccountDialog.value = true
    else openAdminEncryptionKeyDialog(true)
  }

  function openAdminEncryptionKeyDialog(openCreateAfterSave = false) {
    adminSecretDraft.value = adminSecret.value
    showAdminSecret.value = false
    adminSecretError.value = ''
    showAdminEncryptionKeyDialog.value = true
    createTeacherAfterKeySave.value = openCreateAfterSave
  }

  function cancelAdminEncryptionKeyDialog() {
    createTeacherAfterKeySave.value = false
    showAdminEncryptionKeyDialog.value = false
  }

  async function saveAdminEncryptionKey() {
    if (!adminSecretDraft.value) return

    adminSecretError.value = ''
    let decryptedCredentials = null

    if (teacherCredentialRecord.value && !decryptedTeacherCredentials.value) {
      try {
        const result = await decryptTeacherLoginCredentialRecord(
          teacherCredentialRecord.value,
          adminSecretDraft.value
        )
        if (result.keyType !== 'admin') {
          adminSecretError.value = 'Use the one-time super-admin field instead of saving the super-admin key.'
          return
        }
        decryptedCredentials = result.credentials
      } catch (_error) {
        adminSecretError.value = 'That key cannot decrypt this teacher account.'
        return
      }
    }

    storeAdminCredentialSecret(store.state.user, adminSecretDraft.value)
    adminSecret.value = adminSecretDraft.value
    if (decryptedCredentials) {
      decryptedTeacherCredentials.value = decryptedCredentials
      credentialKeyError.value = ''
    }

    showAdminEncryptionKeyDialog.value = false
  }

  function clearAdminEncryptionKeyDialog() {
    const openCreateAfterSave = createTeacherAfterKeySave.value && !!adminSecret.value
    adminSecretDraft.value = ''
    showAdminSecret.value = false
    adminSecretError.value = ''
    createTeacherAfterKeySave.value = false
    if (openCreateAfterSave) showCreateTeacherAccountDialog.value = true
  }

  async function createTeacherAccount() {
    if (!canCreateTeacherAccount.value) return

    creatingTeacherAccount.value = true

    try {
      const credentials = {
        loginCode: randomUserSecret(),
        name: newTeacherName.value.trim()
      }
      const id = await createUser(credentials.loginCode, adminSecret.value, {
        name: credentials.name
      })
      const credentialRecord = await createTeacherLoginCredentialRecord(
        credentials,
        adminSecret.value
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
          owner
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
            storedKey
          )
          if (keyType !== 'admin') throw new Error('The saved key is not an admin key.')
          decryptedTeacherCredentials.value = credentials
          return
        } catch (_error) {
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
        superAdminKeyInput.value
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
            o => relatedTagTemplateData.value.forEach(({ key }) => o[key] = true)
          )
          return result
        })
    )
      .then(async result => {
        taggings.value = props.approvalColumns
          ? await Promise.all(result.map(enrichApprovalTagging))
          : result
      })

    taggings
      .value
      .forEach(result => {
        effectiveRelatedTags.forEach(({ id, editable }) => {
          if (relatedTagStates[id][result.target]) return
          relatedTagStates[id][result.target] = false
        })
      })
    loading.value = false
  }

  async function download() {
    const table = await Promise.all(
      taggings
        .value
        .map(async ({ target, contributor }) => {
          const entry = { [t('user')]: target }
          await Promise.all(
            Object
              .entries(relatedTagStates)
              .map(async ([tagId, tagTargets]) => {
                const { name } = await Agent.state(tagId)
                entry[t(name)] = tagTargets[target] || null
              })
          )
          return entry
        })
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
      accountTypeFor(tagging.target)
    ])

    return {
      ...tagging,
      userName,
      approvedByName,
      accountType,
      approvalDate,
      approvalDateMs: dateMs(approvalDate)
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
    return Number.isNaN(parsed.getTime())
      ? date
      : parsed.toLocaleDateString()
  }
</script>
