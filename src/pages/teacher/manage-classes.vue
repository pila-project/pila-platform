<template>
  <div class="page-container admin-page">
    <h1 class="page-heading">{{ t('student-and-group-management') }}</h1>

    <div class="admin-layout">
      <!-- Left column: Students -->
      <div class="student-section content-card">
        <div class="section-header">
          <div class="section-header-left">
            <i class="fa-solid fa-user-group section-icon" />
            <div>
              <h2 class="card-section-title">{{ t('student') }} ({{ students.length }})</h2>
              <p class="card-section-subtitle">{{ t('manage-student-accounts') }}</p>
            </div>
          </div>
          <div class="section-header-actions">
            <PButton
              v-if="hasEncryptionKey"
              icon="fa-solid fa-print"
              variant="outline"
              :text="t('print-login-codes')"
              size="sm"
              @click="printLoginCodes"
            />
            <PButton
              icon="fa-solid fa-plus"
              variant="primary"
              :text="t('add-student')"
              size="sm"
              @click="showAddStudentPicker = true"
            />
          </div>
        </div>

        <!-- Search + filters -->
        <div class="search-and-filters">
          <PSearchFilter
            v-model="searchQuery"
            type="search-only"
            :placeholder="t('search')"
          />
          <div class="filter-chips-row">
            <FilterDropdown
              :label="t('status')"
              :options="statusFilterOptions"
              v-model="activeStatusFilters"
            />
            <FilterDropdown
              :label="t('group')"
              :options="groupFilterOptions"
              v-model="activeGroupFilters"
            />
          </div>
        </div>

        <!-- Student table -->
        <div class="table-scroll-wrapper">
          <PTable
            :headers="studentHeaders"
            :items="filteredStudents"
            item-key="id"
            selectable
            :selected="selectedStudents"
            @update:selected="selectedStudents = $event"
            :items-per-page="10"
            :items-per-page-options="[
              { value: 10, title: '10' },
              { value: 25, title: '25' },
              { value: 50, title: '50' },
              { value: -1, title: t('all') }
            ]"
            :no-data-text="t('you-currently-have-no-students')"
            :items-per-page-text="t('rows-per-page')"
          >
            <template #item.name="{ item }">
              <div class="student-name-cell">
                <PAvatar :name="item.displayName" :size="28" />
                <DecryptedName :user="item.id" />
              </div>
            </template>
            <template #item.status="{ item }">
              <PBadge
                :variant="item.archived ? 'warning' : 'success'"
                :text="item.archived ? t('archived') : t('active')"
              />
            </template>
            <template #item.groups="{ item }">
              <span class="groups-cell">{{ item.groupNames }}</span>
            </template>
            <template #item.more="{ item }">
              <div class="action-cell">
                <PMenu align-right>
                  <template #activator="{ props }">
                    <button class="action-dots" @click="props.onClick">
                      <i class="fa-solid fa-ellipsis-vertical" />
                    </button>
                  </template>
                  <PMenuItem
                    :title="t('edit')"
                    prepend-icon="fa-solid fa-pencil"
                    @click="userModalUser = item.id"
                  />
                  <PMenuItem
                    :title="t('student-info')"
                    prepend-icon="fa-solid fa-user"
                    @click="viewProfileUser = item.id"
                  />
                  <PMenuItem
                    :title="item.archived ? t('unarchive') : t('archive')"
                    :prepend-icon="item.archived ? 'fa-solid fa-box-open' : 'fa-solid fa-box-archive'"
                    @click="confirmArchiveStudent(item)"
                  />
                </PMenu>
              </div>
            </template>
          </PTable>
        </div>

        <!-- Archived toggle -->
        <div class="archived-toggle-row">
          <ShowArchivedToggle v-model="showArchived" />
        </div>
      </div>

      <!-- Right column: Groups -->
      <div class="group-section">
        <div class="group-section-header content-card">
          <div class="section-header-left">
            <i class="fa-solid fa-shuffle section-icon" />
            <div>
              <h2 class="card-section-title">{{ t('group') }} ({{ activeGroups.length }})</h2>
              <p class="card-section-subtitle">{{ t('organise-students-into-groups') }}</p>
            </div>
          </div>
          <PButton
            icon="fa-solid fa-plus"
            variant="primary"
            :text="t('add-group')"
            size="sm"
            @click="showCreateGroupModal = true"
          />
        </div>

        <div class="group-cards-list">
          <GroupCard
            v-for="groupId in activeGroups"
            :key="groupId"
            :group-id="groupId"
            @manage="openManageStudents(groupId)"
            @edit="openEditGroup(groupId)"
            @archive="archiveGroup(groupId)"
          />

          <div v-if="showArchived && archivedGroups.length" class="archived-groups-section">
            <p class="archived-label">{{ t('archived') }}</p>
            <GroupCard
              v-for="groupId in archivedGroups"
              :key="groupId"
              :group-id="groupId"
              archived
              @unarchive="unarchiveGroup(groupId)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <UserInfoModal
      v-if="userModalUser"
      :id="userModalUser"
      @close="userModalUser = null"
    />

    <!-- Student Profile (read-only) -->
    <PModal
      v-if="viewProfileUser"
      :title="t('student-info')"
      width="500px"
      @close="viewProfileUser = null"
    >
      <template #body>
        <div class="profile-section">
          <div class="profile-section-header">
            <i class="fa-solid fa-user profile-section-icon" />
            <span class="profile-section-label">{{ t('student-info') }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">{{ t('name') }}</span>
            <span class="profile-value"><DecryptedName :user="viewProfileUser" /></span>
          </div>
          <div class="profile-row">
            <span class="profile-label">{{ t('status') }}</span>
            <PBadge
              :variant="profileUserArchived ? 'warning' : 'success'"
              :text="profileUserArchived ? t('archived') : t('active')"
            />
          </div>
        </div>
        <div class="profile-section" v-if="profileUserGroups.length">
          <div class="profile-section-header">
            <i class="fa-solid fa-users profile-section-icon" />
            <span class="profile-section-label">{{ t('group') }} ({{ profileUserGroups.length }})</span>
          </div>
          <div
            v-for="g in profileUserGroups"
            :key="g.id"
            class="profile-group-tile"
          >
            <span class="profile-group-name">{{ g.name }}</span>
            <PBadge variant="default" :text="`${g.memberCount} ${t('student')}`" />
          </div>
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('cancel')" @click="viewProfileUser = null" />
        <PButton variant="primary" :text="t('edit')" @click="userModalUser = viewProfileUser; viewProfileUser = null" />
      </template>
    </PModal>

    <ManageStudentsModal
      v-if="manageGroupId"
      :group-id="manageGroupId"
      :students="students"
      @close="manageGroupId = null"
    />

    <!-- Add Student Option Picker -->
    <PModal
      v-if="showAddStudentPicker"
      :title="t('add-student')"
      width="500px"
      @close="showAddStudentPicker = false"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('add-student') }}</h2>
          <p class="text-sm text-slate-500 mt-0.5">{{ t('select-content-type') }}</p>
        </div>
      </template>
      <template #body>
        <div class="add-student-options">
          <button class="add-student-option" @click="handleAddStudentIndividual">
            <div class="add-option-icon add-option-icon-individual">
              <i class="fa-solid fa-plus" />
            </div>
            <div class="add-option-text">
              <span class="add-option-title">{{ t('create-account') }}</span>
              <span class="add-option-desc">{{ t('add-student') }}</span>
            </div>
            <i class="fa-solid fa-arrow-right add-option-arrow" />
          </button>
          <button class="add-student-option" @click="handleAddStudentLink">
            <div class="add-option-icon add-option-icon-link">
              <i class="fa-solid fa-link" />
            </div>
            <div class="add-option-text">
              <span class="add-option-title">{{ t('link-students-to-you') }}</span>
              <span class="add-option-desc">{{ t('share-this-link-with-your-students') }}</span>
            </div>
            <i class="fa-solid fa-arrow-right add-option-arrow" />
          </button>
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('cancel')" @click="showAddStudentPicker = false" />
      </template>
    </PModal>

    <!-- Create Group Modal -->
    <PModal
      v-if="showCreateGroupModal"
      :title="t('new-group')"
      width="500px"
      @close="showCreateGroupModal = false"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('new-group') }}</h2>
          <p class="text-sm text-slate-500 mt-0.5">{{ t('organise-students-into-groups') }}</p>
        </div>
      </template>
      <template #body>
        <PInput
          v-model="newGroupName"
          :label="t('group-name')"
          :placeholder="t('give-your-group-a-name')"
          required
        />
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('cancel')" @click="showCreateGroupModal = false" />
        <PButton variant="primary" :text="t('create')" @click="handleCreateGroup" :disabled="!newGroupName.trim()" />
      </template>
    </PModal>

    <!-- Edit Group Modal -->
    <PModal
      v-if="editGroupId"
      :title="t('edit')"
      width="500px"
      @close="editGroupId = null"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('edit') }}</h2>
          <p class="text-sm text-slate-500 mt-0.5">{{ t('group-details') }}</p>
        </div>
      </template>
      <template #body>
        <PInput
          v-model="editGroupName"
          :label="t('group-name')"
          :placeholder="t('give-your-group-a-name')"
          required
        />
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('cancel')" @click="editGroupId = null" />
        <PButton variant="primary" :text="t('save')" @click="handleSaveGroup" :disabled="!editGroupName.trim()" />
      </template>
    </PModal>

    <!-- Archive Confirmation -->
    <PAlertDialog
      v-if="archiveConfirmStudent"
      variant="warning"
      :title="t('are-you-sure')"
      :description="`${t('archive')} &quot;${archiveConfirmStudent.id.slice(0,8)}&quot;`"
      :confirm-text="t('archive')"
      :cancel-text="t('cancel')"
      @confirm="executeArchiveStudent"
      @cancel="archiveConfirmStudent = null"
    />

    <!-- Success Dialog -->
    <PAlertDialog
      v-if="successMessage"
      variant="success"
      :title="successMessage"
      confirm-text="OK"
      :cancel-text="null"
      @confirm="successMessage = null"
      @cancel="successMessage = null"
    />

    <PModal
      v-if="showLinkStudentModal"
      @close="showLinkStudentModal = false"
      width="600px"
      :title="t('add-students-to-your-student-list')"
    >
      <template #body>
        <LinkStudentModal />
      </template>
    </PModal>

    <PModal
      v-if="showNamePasswordModal"
      @close="closeNamePasswordModal"
      show-close-button
      :close-button-text="t('done')"
      width="600px"
      :title="t('enter-encryption-key-word')"
    >
      <template #body>
        <div class="encryption-key-body">
          {{ t('enter-an-encryption-key-word-you-will-remember-t') }}
          <input v-model="namePassword" class="input encryption-key-input" />
        </div>
      </template>
    </PModal>

    <TeacherStudentAgreementModal
      v-if="showAcceptStudentAgreementModal"
      @agreed="createUserAndLaunchModal()"
      @close="showAcceptStudentAgreementModal = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useStore } from 'vuex'
import naclUtil from 'tweetnacl-util'
import { PButton, PTable, PBadge, PAvatar, PSearchFilter, PModal, PMenu, PMenuItem, PAlertDialog, PInput } from '@/components/ui/index.js'
import DecryptedName from '@/components/common/decrypted-name.vue'
import ShowArchivedToggle from '@/components/common/show-archived-toggle.vue'
import UserInfoModal from '@/components/users/user-info-modal.vue'
import LinkStudentModal from '@/components/groups/link-student-modal.vue'
import TeacherStudentAgreementModal from './teacher-student-agreement-modal.vue'
import GroupCard from '@/components/groups/GroupCard.vue'
import ManageStudentsModal from '@/components/groups/ManageStudentsModal.vue'
import FilterDropdown from '@/components/content/filter-dropdown.vue'
import { createUser } from '@/utils/user-utils.js'
import * as encryption from '@/utils/encryption.js'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

// ── State ──
const users = reactive({})
const userModalUser = ref(null)
const viewProfileUser = ref(null)
const showArchived = ref(false)
const showAcceptStudentAgreementModal = ref(false)
const showLinkStudentModal = ref(false)
const showAddStudentPicker = ref(false)
const showCreateGroupModal = ref(false)
const editGroupId = ref(null)
const editGroupName = ref('')
const newGroupName = ref('')
const searchQuery = ref('')
const selectedStudents = ref([])
const manageGroupId = ref(null)
const activeStatusFilters = ref([])
const activeGroupFilters = ref([])
const archiveConfirmStudent = ref(null)
const successMessage = ref(null)

// ── Encryption key ──
const namePassword = ref(localStorage.getItem(`zkek-${store.state.user}`) || '')
const showNamePasswordModal = ref(!namePassword.value)
const hasEncryptionKey = computed(() => !!namePassword.value)

watch(namePassword, async (val) => {
  localStorage.setItem(`zkek-${store.state.user}`, val)
  const publicKeys = await Agent.state('user-info-public-keys')
  const { publicKey: publicKeyBuffer } = await encryption.generateKeyPair(val)
  publicKeys.public = naclUtil.encodeBase64(publicKeyBuffer)
})

function closeNamePasswordModal() {
  showNamePasswordModal.value = false
}

// ── Users watcher ──
let unwatchUsers
onMounted(() => {
  unwatchUsers = Agent.watch('users', ({ state }) => {
    Object.entries(state).forEach(([key, value]) => users[key] = value)
  })
})
onBeforeUnmount(() => { if (unwatchUsers) unwatchUsers() })

// ── Students ──
const myPILAUsers = computed(() => Object.keys(users))

const students = computed(() => {
  const ids = [
    ...myPILAUsers.value.filter(id => showArchived.value || !users[id]?.archived),
    ...store.getters['groups/myStudents']().filter(id => !myPILAUsers.value.includes(id))
  ]
  return ids.map(id => {
    const groupIds = activeGroups.value.filter(gid => store.getters['groups/belongs'](id, gid))
    const groupNames = groupIds.map(gid => store.state.groups.groups[gid]?.name || '').filter(Boolean).join(', ')
    return {
      id,
      displayName: '…',
      archived: !!users[id]?.archived,
      groupNames,
      groupIds,
    }
  })
})

const filteredStudents = computed(() => {
  let items = students.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(s => s.id.toLowerCase().includes(q) || s.groupNames.toLowerCase().includes(q))
  }
  if (activeStatusFilters.value.length) {
    items = items.filter(s => {
      const label = s.archived ? t('archived') : t('active')
      return activeStatusFilters.value.includes(label)
    })
  }
  if (activeGroupFilters.value.length) {
    items = items.filter(s =>
      activeGroupFilters.value.some(gName => s.groupNames.toLowerCase().includes(gName.toLowerCase()))
    )
  }
  return items
})

const studentHeaders = computed(() => [
  { key: 'name', title: t('name') },
  { key: 'status', title: t('status'), sortable: false },
  { key: 'groups', title: t('groups'), sortable: false },
  { key: 'more', title: '', sortable: false, width: '60px' },
])

// ── Filter options ──
const statusFilterOptions = computed(() => [
  { value: t('active'), label: t('active') },
  { value: t('archived'), label: t('archived') },
])

const groupFilterOptions = computed(() =>
  activeGroups.value.map(gid => {
    const name = store.state.groups.groups[gid]?.name || t('unnamed')
    return { value: name, label: name }
  })
)

// ── Profile helpers ──
const profileUserArchived = computed(() => {
  if (!viewProfileUser.value) return false
  return !!users[viewProfileUser.value]?.archived
})

const profileUserGroups = computed(() => {
  if (!viewProfileUser.value) return []
  return activeGroups.value
    .filter(gid => store.getters['groups/belongs'](viewProfileUser.value, gid))
    .map(gid => ({
      id: gid,
      name: store.state.groups.groups[gid]?.name || t('unnamed'),
      memberCount: store.getters['groups/members'](gid).length,
    }))
})

// ── Groups ──
const activeGroups = computed(() => store.getters['groups/groups']('class', true))
const archivedGroups = computed(() => store.getters['groups/archivedGroups']('class'))

async function handleCreateGroup() {
  const name = newGroupName.value.trim()
  if (!name) return
  const id = await store.dispatch('groups/add', { type: 'class', name })
  newGroupName.value = ''
  showCreateGroupModal.value = false
  successMessage.value = t('success')
  manageGroupId.value = id
}

function openEditGroup(groupId) {
  editGroupId.value = groupId
  editGroupName.value = store.state.groups.groups[groupId]?.name || ''
}

async function handleSaveGroup() {
  if (!editGroupName.value.trim() || !editGroupId.value) return
  const state = await Agent.state(editGroupId.value)
  state.name = editGroupName.value.trim()
  await Agent.synced()
  await store.dispatch('groups/loadGroups')
  editGroupId.value = null
  successMessage.value = t('success')
}

function archiveGroup(id) {
  store.dispatch('groups/archive', id)
}

function unarchiveGroup(id) {
  store.dispatch('groups/unarchive', id)
}

function openManageStudents(groupId) {
  manageGroupId.value = groupId
}

// ── Student actions ──
function confirmArchiveStudent(item) {
  if (item.archived) {
    // Unarchive directly — no confirmation needed
    toggleArchiveStudent(item)
  } else {
    archiveConfirmStudent.value = item
  }
}

async function executeArchiveStudent() {
  if (archiveConfirmStudent.value) {
    await toggleArchiveStudent(archiveConfirmStudent.value)
    archiveConfirmStudent.value = null
  }
}

async function toggleArchiveStudent(item) {
  const usersState = await Agent.state('users')
  if (usersState[item.id]) {
    usersState[item.id].archived = !item.archived
  }
}

const codeCharacterSet = 'abcdefghijklmnopqrstuvwxy'

function randomString(length, chars) {
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return [...arr].map(i => chars[i % chars.length]).join('')
}

function handleAddStudentIndividual() {
  showAddStudentPicker.value = false
  handleAddStudent()
}

function handleAddStudentLink() {
  showAddStudentPicker.value = false
  showLinkStudentModal.value = true
}

async function handleAddStudent() {
  if (!hasEncryptionKey.value) {
    showNamePasswordModal.value = true
    return
  }
  await createUserAndLaunchModal()
}

async function createUserAndLaunchModal() {
  const { studentDataProtectionAgreement } = await Agent.state()
  if (studentDataProtectionAgreement) {
    const providerSecret = localStorage.getItem(`zkek-${store.state.user}`)
    const userSecret = randomString(8, codeCharacterSet)
    const info = { name: t('student') }
    const id = await createUser(userSecret, providerSecret, info)
    const usersState = await Agent.state('users')
    usersState[id] = {}
    userModalUser.value = id
  } else {
    showAcceptStudentAgreementModal.value = true
  }
}

function printLoginCodes() {
  window.open('/teacher/codes')
}
</script>

<style scoped>
.admin-page {
  padding: 32px 24px;
}

.admin-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

/* Student section (left) */
.student-section {
  flex: 1;
  min-width: 0;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-icon {
  font-size: 16px;
  color: var(--color-slate-500);
}

.section-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.search-and-filters {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.search-and-filters :deep(.search-filter) {
  flex: 0 0 240px;
}

.filter-chips-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Table scroll wrapper for mobile horizontal scroll */
.table-scroll-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Student table cells */
.student-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.groups-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.action-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  border-radius: 6px;
  color: var(--color-slate-400);
  cursor: pointer;
  transition: all 150ms;
}
.action-dots:hover {
  background: var(--color-slate-100);
  color: var(--color-slate-700);
}

.archived-toggle-row {
  padding: 12px 16px 4px;
}

/* Group section (right) */
.group-section {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.group-cards-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.archived-groups-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.archived-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-slate-400);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 8px 0 0;
}

/* Add Student Option Picker */
.add-student-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.add-student-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-slate-200);
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 150ms;
  text-align: left;
  width: 100%;
}
.add-student-option:hover {
  border-color: var(--color-primary-300);
  background: var(--color-primary-50);
}

.add-option-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
.add-option-icon-individual {
  background: #fef3c7;
  color: #d97706;
}
.add-option-icon-link {
  background: #dbeafe;
  color: #2563eb;
}

.add-option-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.add-option-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}
.add-option-desc {
  font-size: 12px;
  color: #64748b;
}
.add-option-arrow {
  color: var(--color-primary-600);
  font-size: 14px;
  flex-shrink: 0;
}

/* Student Profile Modal */
.profile-section {
  padding: 16px 0;
  border-bottom: 1px solid var(--color-slate-200);
}
.profile-section:last-child {
  border-bottom: none;
}

.profile-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.profile-section-icon {
  font-size: 14px;
  color: var(--color-slate-500);
}
.profile-section-label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.profile-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}
.profile-label {
  font-size: 13px;
  color: #64748b;
}
.profile-value {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.profile-group-tile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--color-slate-50);
  border-radius: 8px;
  margin-bottom: 8px;
}
.profile-group-name {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

/* Encryption key modal */
.encryption-key-body {
  padding: 20px 42px;
  text-align: center;
  font-size: 14px;
  color: var(--color-slate-600);
}

.encryption-key-input {
  width: 60%;
  text-align: center;
  margin-top: 16px;
}

/* Mobile responsive */
@media (max-width: 1023px) {
  .admin-page {
    padding: 16px;
  }

  .admin-layout {
    flex-direction: column;
  }

  .group-section {
    width: 100%;
  }

  .search-and-filters {
    flex-direction: column;
  }

  .search-and-filters :deep(.search-filter) {
    flex: 1;
  }

  .section-header {
    flex-direction: column;
    gap: 8px;
  }

  .section-header-actions {
    align-self: stretch;
    justify-content: flex-end;
  }

  .group-cards-list {
    flex-direction: row;
    overflow-x: auto;
    gap: 12px;
    padding-bottom: 4px;
  }

  .group-cards-list > :deep(.group-card) {
    min-width: 260px;
    flex-shrink: 0;
  }

  .table-scroll-wrapper {
    margin: 0 -16px;
    padding: 0 16px;
  }
}
</style>
