<template>
  <div class="page-container admin-page">
    <h1 class="page-heading">{{ t('student-and-group-management') }}</h1>

    <div class="admin-layout">
      <!-- Left column: Students -->
      <div class="student-section content-card">
        <div class="section-header">
          <div class="section-header-left">
            <LucideIcon name="users" :size="20" class="section-icon" />
            <div>
              <h2 class="card-section-title">{{ t('student') }} ({{ students.length }})</h2>
              <p class="card-section-subtitle">{{ t('manage-student-accounts') }}</p>
            </div>
          </div>
          <div class="section-header-actions">
            <PButton
              v-if="selectedStudents.length"
              icon="lucide:download"
              variant="outline"
              :text="`${t('export')} (${selectedStudents.length})`"
              size="sm"
              @click="showExportModal = true"
            />
            <PButton
              v-if="selectedStudents.length"
              icon="lucide:users"
              variant="outline"
              :text="`${t('add-to-groups')} (${selectedStudents.length})`"
              size="sm"
              @click="showAddToGroupsModal = true; selectedGroupsForAssign = []; groupSearchQuery = ''"
            />
            <PButton
              v-if="hasEncryptionKey && selectedStudents.length"
              icon="lucide:printer"
              variant="outline"
              :text="`${t('print-login-codes')} (${selectedStudents.length})`"
              size="sm"
              @click="printLoginCodes"
            />
            <PButton
              icon="lucide:plus"
              variant="primary"
              :text="t('add-student')"
              size="sm"
              @click="showAddStudentPicker = true"
            />
          </div>
        </div>

        <!-- Search + filters -->
        <div class="search-and-filters">
          <PUnifiedFilter
            v-model:searchQuery="searchQuery"
            :placeholder="t('search')"
          >
            <PUnifiedFilterSection
              id="grade"
              :label="t('grade')"
              icon="table"
              :options="gradeFilterOptions"
              v-model="activeGradeFilters"
            />
            <PUnifiedFilterSection
              id="status"
              :label="t('status')"
              icon="badge-check"
              :options="statusFilterOptions"
              v-model="activeStatusFilters"
            />
            <PUnifiedFilterSection
              id="group"
              :label="t('group')"
              icon="list-tree"
              :options="groupFilterOptions"
              v-model="activeGroupFilters"
              searchable
            />
          </PUnifiedFilter>
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
                <div class="student-name-col">
                  <DecryptedName :user="item.id" />
                  <!-- TODO: backend — needs email field on student -->
                </div>
              </div>
            </template>
            <template #item.grade="{ item }">
              <span class="grade-cell">{{ item.grade || '--' }}</span>
            </template>
            <template #item.status="{ item }">
              <PBadge
                :variant="item.archived ? 'warning' : 'info'"
                :text="item.archived ? t('archived') : t('active')"
              />
            </template>
            <template #item.groups="{ item }">
              <PTooltip :text="item.groupNames">
                <span class="groups-cell">{{ item.groupNames || '--' }}</span>
              </PTooltip>
            </template>
            <template #item.more="{ item }">
              <div class="action-cell">
                <PButton
                  v-if="item.archived"
                  variant="outline"
                  size="sm"
                  :text="t('restore')"
                  @click="toggleArchiveStudent(item)"
                />
                <PMenu v-else align-right>
                  <template #activator="{ props }">
                    <button class="action-dots" @click="props.onClick">
                      <LucideIcon name="ellipsis-vertical" :size="14" />
                    </button>
                  </template>
                  <PMenuItem
                    :title="t('edit')"
                    prepend-icon="lucide:pencil"
                    @click="userModalUser = item.id"
                  />
                  <PMenuItem
                    :title="t('student-info')"
                    prepend-icon="lucide:user"
                    @click="openStudentProfile(item.id)"
                  />
                  <PMenuItem
                    :title="t('archive')"
                    prepend-icon="lucide:archive"
                    @click="confirmArchiveStudent(item)"
                  />
                  <PDivider />
                  <PMenuItem
                    :title="t('download-login-code')"
                    prepend-icon="lucide:qr-code"
                    @click="openLoginCodeModal(item)"
                  />
                  <PMenuItem
                    :title="t('reset-password')"
                    prepend-icon="lucide:key-round"
                    @click="resetPasswordStudent = item"
                  />
                  <PDivider />
                  <PMenuItem
                    :title="t('remove-student')"
                    prepend-icon="lucide:trash-2"
                    danger
                    @click="deleteConfirmStudent = item"
                  />
                </PMenu>
              </div>
            </template>
          </PTable>
        </div>

      </div>

      <!-- Right column: Groups -->
      <div class="group-section">
        <div class="group-section-header content-card">
          <div class="section-header-left">
            <LucideIcon name="shuffle" :size="20" class="section-icon" />
            <div>
              <h2 class="card-section-title">{{ t('group') }} ({{ activeGroups.length }})</h2>
              <p class="card-section-subtitle">{{ t('organise-students-into-groups') }}</p>
            </div>
          </div>
          <PButton
            icon="lucide:plus"
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
            @delete="confirmDeleteGroup(groupId)"
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
      @open-login-code="openLoginCodeModal({ id: $event }); userModalUser = null"
    />

    <!-- Student Profile (read-only) -->
    <PModal
      v-if="viewProfileUser"
      :title="t('student-info')"
      width="500px"
      @close="viewProfileUser = null"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('student-info') }}</h2>
          <p class="text-sm text-slate-500 mt-0.5">{{ t('student-profile') }}</p>
        </div>
      </template>
      <template #body>
        <!-- Basic Information -->
        <div class="profile-section">
          <div class="profile-section-header">
            <LucideIcon name="user" :size="16" class="profile-section-icon" />
            <span class="profile-section-label">{{ t('basic-information') }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">{{ t('name') }}</span>
            <span class="profile-value">{{ profileStudentInfo?.name || '...' }}</span>
          </div>
          <div class="profile-row" v-if="profileStudentInfo?.nickname">
            <span class="profile-label">{{ t('nickname') }}</span>
            <span class="profile-value">{{ profileStudentInfo.nickname }}</span>
          </div>
          <div class="profile-row" v-if="profileUserGrade">
            <span class="profile-label">{{ t('grade') }}</span>
            <span class="profile-value">{{ profileUserGrade }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">{{ t('status') }}</span>
            <PBadge
              :variant="profileUserArchived ? 'warning' : 'info'"
              :text="profileUserArchived ? t('archived') : t('active')"
            />
          </div>
        </div>

        <!-- Account Activity -->
        <div class="profile-section">
          <div class="profile-section-header">
            <LucideIcon name="clock" :size="16" class="profile-section-icon" />
            <span class="profile-section-label">{{ t('account-activity') }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">{{ t('account-created') }}</span>
            <span class="profile-value" :class="{ 'profile-value--muted': !profileCreatedDate }">{{ profileCreatedDate || '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">{{ t('last-login') }}</span>
            <!-- TODO: backend — needs last-login tracking -->
            <span class="profile-value profile-value--muted">—</span>
          </div>
        </div>

        <!-- Group Membership -->
        <div class="profile-section" v-if="profileUserGroups.length">
          <div class="profile-section-header">
            <LucideIcon name="users" :size="16" class="profile-section-icon" />
            <span class="profile-section-label">{{ t('group') }} ({{ profileUserGroups.length }})</span>
          </div>
          <div
            v-for="g in profileUserGroups"
            :key="g.id"
            class="profile-group-tile"
          >
            <div class="profile-group-info">
              <span class="profile-group-name">{{ g.name }}</span>
              <span v-if="g.detail" class="profile-group-detail">{{ g.detail }}</span>
            </div>
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
      :show-back="manageGroupShowBack"
      @close="manageGroupId = null; manageGroupShowBack = false"
      @back="manageGroupId = null; manageGroupShowBack = false; showCreateGroupModal = true"
    />

    <!-- Add Student Option Picker -->
    <PModal
      v-if="showAddStudentPicker"
      :title="t('add-student')"
      width="460px"
      @close="showAddStudentPicker = false; selectedPickerOption = null"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('add-students') }}</h2>
          <p class="text-sm text-slate-500 mt-0.5">{{ t('choose-how-to-add-students') }}</p>
        </div>
      </template>
      <template #body>
        <div class="add-student-options">
          <!-- Card 1: Create individual account -->
          <div
            class="add-student-card"
            :class="{ 'add-student-card--selected': selectedPickerOption === 'individual' }"
          >
            <button class="add-student-card-header" @click="selectedPickerOption = 'individual'">
              <div class="add-option-icon add-option-icon-individual">
                <LucideIcon name="plus" :size="16" />
              </div>
              <div class="add-option-text">
                <span class="add-option-title">{{ t('create-individual-account') }}</span>
                <span class="add-option-desc">{{ t('manually-create-single-student') }}</span>
              </div>
            </button>
            <div class="add-student-card-link">
              <button class="add-student-link-btn" @click="handleAddStudentLink">
                {{ t('link-student-to-you') }} <LucideIcon name="arrow-right" :size="14" class="inline" />
              </button>
            </div>
          </div>

          <!-- Card 2: Create bulk accounts -->
          <div
            class="add-student-card"
            :class="{ 'add-student-card--selected': selectedPickerOption === 'bulk' }"
          >
            <button class="add-student-card-header" @click="selectedPickerOption = 'bulk'">
              <div class="add-option-icon add-option-icon-bulk">
                <LucideIcon name="upload" :size="16" />
              </div>
              <div class="add-option-text">
                <span class="add-option-title">{{ t('create-bulk-accounts') }}</span>
                <span class="add-option-desc">{{ t('upload-csv-or-enter-multiple') }}</span>
              </div>
            </button>
            <div class="add-student-card-link">
              <button class="add-student-link-btn" @click="handleAddStudentLink">
                {{ t('link-students-to-you') }} <LucideIcon name="arrow-right" :size="14" class="inline" />
              </button>
            </div>
          </div>

          <!-- Card 3: Link via SSO -->
          <div
            class="add-student-card add-student-card--short"
            :class="{ 'add-student-card--selected': selectedPickerOption === 'sso' }"
          >
            <button class="add-student-card-header" @click="selectedPickerOption = 'sso'">
              <div class="add-option-icon add-option-icon-sso">
                <LucideIcon name="user-plus" :size="16" />
              </div>
              <div class="add-option-text">
                <span class="add-option-title">{{ t('link-via-sso') }}</span>
                <span class="add-option-desc">{{ t('connect-existing-google-microsoft') }}</span>
              </div>
            </button>
          </div>
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('cancel')" @click="showAddStudentPicker = false; selectedPickerOption = null" />
        <PButton
          variant="primary"
          :text="t('next')"
          :disabled="!selectedPickerOption"
          @click="handlePickerNext"
        />
      </template>
    </PModal>

    <!-- Create Student Form -->
    <PModal
      v-if="showCreateStudentForm"
      :title="t('create-individual-account')"
      width="500px"
      @close="showCreateStudentForm = false"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('create-individual-account') }}</h2>
          <p class="text-sm text-slate-500 mt-0.5">{{ t('manually-create-single-student') }}</p>
        </div>
      </template>
      <template #body>
        <div class="modal-form-fields">
          <PInput
            v-model="newStudentName"
            :label="t('name')"
            :placeholder="t('name')"
            required
          />
          <PInput
            v-model="newStudentNickname"
            :label="t('nickname')"
            :placeholder="t('nickname')"
          />
          <PSelect
            v-model="newStudentGrade"
            :label="t('grade')"
            :items="gradeOptions"
            item-title="label"
            item-value="value"
            :placeholder="t('select-grade')"
            required
          />
        </div>
      </template>
      <template #footer>
        <PButton variant="outline" :text="t('back')" @click="showCreateStudentForm = false; showAddStudentPicker = true" />
        <div style="flex: 1" />
        <PButton variant="secondary" :text="t('cancel')" @click="showCreateStudentForm = false" />
        <PButton
          variant="primary"
          :text="t('create')"
          :disabled="!newStudentName.trim() || !newStudentGrade"
          :loading="creatingStudent"
          @click="createStudentAccount"
        />
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
        <div class="modal-form-fields">
          <PInput
            v-model="newGroupName"
            :label="t('group-name')"
            :placeholder="t('give-your-group-a-name')"
            required
          />
          <PSelect
            v-model="newGroupGrade"
            :label="t('grade')"
            :items="gradeOptions"
            item-title="label"
            item-value="value"
            :placeholder="t('select-grade')"
          />
          <PSelect
            v-model="newGroupSubject"
            :label="t('subject')"
            :items="subjectOptions"
            :placeholder="t('select-subject')"
          />
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('cancel')" @click="showCreateGroupModal = false" />
        <PButton variant="primary" :text="t('create')" @click="handleCreateGroup" :disabled="!newGroupName.trim()" :loading="creatingGroup" />
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
        <div class="modal-form-fields">
          <PInput
            v-model="editGroupName"
            :label="t('group-name')"
            :placeholder="t('give-your-group-a-name')"
            required
          />
          <PSelect
            v-model="editGroupGrade"
            :label="t('grade')"
            :items="gradeOptions"
            item-title="label"
            item-value="value"
            :placeholder="t('select-grade')"
          />
          <PSelect
            v-model="editGroupSubject"
            :label="t('subject')"
            :items="subjectOptions"
            :placeholder="t('select-subject')"
          />
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('cancel')" @click="editGroupId = null" />
        <PButton variant="primary" :text="t('save')" @click="handleSaveGroup" :disabled="!editGroupName.trim()" :loading="savingGroup" />
      </template>
    </PModal>

    <!-- Archive Confirmation -->
    <PAlertDialog
      v-if="archiveConfirmStudent"
      variant="warning"
      :title="t('archive-student-confirm-title')"
      :description="t('archive-student-confirm-description')"
      :confirm-text="t('archive')"
      :cancel-text="t('cancel')"
      @confirm="executeArchiveStudent"
      @cancel="archiveConfirmStudent = null"
    />

    <!-- Delete Student Confirmation -->
    <PAlertDialog
      v-if="deleteConfirmStudent"
      variant="error"
      :title="t('delete-student-confirm-title')"
      :description="t('delete-student-confirm-description')"
      :confirm-text="t('delete')"
      :cancel-text="t('cancel')"
      @confirm="executeDeleteStudent"
      @cancel="deleteConfirmStudent = null"
    />

    <!-- Reset Password Confirmation -->
    <PAlertDialog
      v-if="resetPasswordStudent"
      variant="warning"
      :title="t('reset-password-confirm-title')"
      :description="t('reset-password-confirm-description')"
      :confirm-text="t('reset-password')"
      :cancel-text="t('cancel')"
      @confirm="executeResetPassword"
      @cancel="resetPasswordStudent = null"
    />

    <!-- Delete Group Confirmation -->
    <PAlertDialog
      v-if="deleteConfirmGroup"
      variant="error"
      :title="`${t('delete-group-confirm-title')} '${store.state.groups.groups[deleteConfirmGroup]?.name || ''}'?`"
      :description="`${t('delete-group-confirm-description')} (${store.getters['groups/members'](deleteConfirmGroup).length} ${t('student')})`"
      :confirm-text="t('delete-group')"
      :cancel-text="t('cancel')"
      @confirm="executeDeleteGroup"
      @cancel="deleteConfirmGroup = null"
    />

    <!-- Success Confirmation -->
    <PAlertDialog
      v-if="successDialog.show"
      variant="success"
      :title="successDialog.message"
      :confirm-text="t('done')"
      cancel-text=""
      @confirm="dismissSuccessDialog"
      @cancel="dismissSuccessDialog"
    />

    <!-- CSV Upload Modal -->
    <PModal
      v-if="showCSVUploadModal"
      :title="t('create-bulk-accounts')"
      width="600px"
      @close="showCSVUploadModal = false"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('create-bulk-accounts') }}</h2>
          <p class="text-sm text-slate-500 mt-0.5">{{ t('upload-csv-or-enter-multiple') }}</p>
        </div>
      </template>
      <template #body>
        <div class="modal-form-fields">
          <PFileUpload
            accept=".csv"
            :label="t('drop-csv-file-here')"
            :description="t('csv-required-columns')"
            @file-selected="csvFile = $event"
          />
          <div class="csv-actions-row">
            <button class="csv-template-link" @click="downloadCSVTemplate">
              <LucideIcon name="download" :size="14" />
              {{ t('download-template') }}
            </button>
            <button class="csv-template-link" @click="showCSVUploadModal = false; showBulkEntryModal = true">
              <LucideIcon name="table" :size="14" />
              {{ t('manual-entry') }}
            </button>
          </div>
          <div class="csv-info-text">
            <LucideIcon name="info" :size="14" />
            <span>{{ t('csv-required-columns') }}: First name ({{ t('required') }}), Last name, Nickname, Grade ({{ t('required') }})</span>
          </div>
        </div>
      </template>
      <template #footer>
        <PButton variant="outline" :text="t('back')" @click="showCSVUploadModal = false; showAddStudentPicker = true" />
        <div style="flex: 1" />
        <PButton variant="secondary" :text="t('cancel')" @click="showCSVUploadModal = false" />
        <PButton variant="primary" :text="t('create-all-accounts')" :disabled="!csvFile" :loading="importingCSV" @click="handleCSVImport" />
      </template>
    </PModal>

    <!-- Manual Bulk Entry Modal -->
    <PModal
      v-if="showBulkEntryModal"
      :title="t('create-bulk-accounts')"
      width="800px"
      @close="showBulkEntryModal = false"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('create-bulk-accounts') }}</h2>
          <p class="text-sm text-slate-500 mt-0.5">{{ t('manual-entry') }}</p>
        </div>
      </template>
      <template #body>
        <div class="bulk-entry-container">
          <div class="bulk-entry-toolbar">
            <PButton variant="outline" size="sm" icon="lucide:plus" :text="t('add-row')" @click="addBulkRow" />
          </div>
          <div class="bulk-entry-table-wrapper">
            <table class="bulk-entry-table">
              <thead>
                <tr>
                  <th>{{ t('name') }} *</th>
                  <th>{{ t('nickname') }}</th>
                  <th>{{ t('grade') }} *</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in bulkEntryRows" :key="index">
                  <td><input v-model="row.name" class="input bulk-input" :placeholder="t('name')" /></td>
                  <td><input v-model="row.nickname" class="input bulk-input" :placeholder="t('nickname')" /></td>
                  <td>
                    <select v-model="row.grade" class="input bulk-input">
                      <option value="">{{ t('select-grade') }}</option>
                      <option v-for="g in gradeOptions" :key="g.value" :value="g.value">{{ g.label }}</option>
                    </select>
                  </td>
                  <td>
                    <button class="bulk-delete-row" @click="bulkEntryRows.splice(index, 1)">
                      <LucideIcon name="x" :size="14" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
      <template #footer>
        <PButton variant="outline" :text="t('back')" @click="showBulkEntryModal = false; showCSVUploadModal = true" />
        <div style="flex: 1" />
        <PButton variant="secondary" :text="t('cancel')" @click="showBulkEntryModal = false" />
        <PButton variant="primary" :text="t('create-all-accounts')" :disabled="!validBulkRows" :loading="creatingBulk" @click="handleBulkCreate" />
      </template>
    </PModal>

    <!-- SSO Provider Selection Modal -->
    <PModal
      v-if="showSSOModal"
      :title="t('link-via-sso')"
      width="460px"
      @close="showSSOModal = false"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('link-via-sso') }}</h2>
          <p class="text-sm text-slate-500 mt-0.5">{{ t('connect-existing-google-microsoft') }}</p>
        </div>
      </template>
      <template #body>
        <div class="add-student-options">
          <div
            class="add-student-card add-student-card--short"
            :class="{ 'add-student-card--selected': selectedSSOProvider === 'google' }"
          >
            <button class="add-student-card-header" @click="selectedSSOProvider = 'google'">
              <div class="add-option-icon" style="background: #fef9c3; color: #d97706;">
                <LucideIcon name="chrome" :size="16" />
              </div>
              <div class="add-option-text">
                <span class="add-option-title">Google Workspace</span>
                <span class="add-option-desc">{{ t('import-from-google') }}</span>
              </div>
            </button>
          </div>
          <div
            class="add-student-card add-student-card--short"
            :class="{ 'add-student-card--selected': selectedSSOProvider === 'microsoft' }"
          >
            <button class="add-student-card-header" @click="selectedSSOProvider = 'microsoft'">
              <div class="add-option-icon" style="background: #dbeafe; color: #2563eb;">
                <LucideIcon name="app-window" :size="16" />
              </div>
              <div class="add-option-text">
                <span class="add-option-title">Microsoft 365</span>
                <span class="add-option-desc">{{ t('import-from-microsoft') }}</span>
              </div>
            </button>
          </div>
        </div>
      </template>
      <template #footer>
        <PButton variant="outline" :text="t('back')" @click="showSSOModal = false; showAddStudentPicker = true" />
        <div style="flex: 1" />
        <PButton variant="secondary" :text="t('cancel')" @click="showSSOModal = false" />
        <!-- TODO: backend — needs SSO OAuth integration (Google + Microsoft) -->
        <PButton variant="primary" :text="t('next')" :disabled="!selectedSSOProvider" @click="handleSSONext" />
      </template>
    </PModal>

    <!-- Export Students Modal -->
    <PModal
      v-if="showExportModal"
      :title="t('export')"
      width="500px"
      @close="showExportModal = false"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('export') }}</h2>
          <p class="text-sm text-slate-500 mt-0.5">{{ selectedStudents.length }} {{ t('student') }} {{ t('selected') }}</p>
        </div>
      </template>
      <template #body>
        <div class="add-student-options">
          <div
            class="add-student-card add-student-card--short"
            :class="{ 'add-student-card--selected': exportFormat === 'csv' }"
          >
            <button class="add-student-card-header" @click="exportFormat = 'csv'">
              <div class="add-option-icon" style="background: #dcfce7; color: #16a34a;">
                <LucideIcon name="table" :size="16" />
              </div>
              <div class="add-option-text">
                <span class="add-option-title">CSV</span>
                <span class="add-option-desc">{{ t('spreadsheet-format') }}</span>
              </div>
            </button>
          </div>
          <div
            class="add-student-card add-student-card--short"
            :class="{ 'add-student-card--selected': exportFormat === 'pdf' }"
          >
            <button class="add-student-card-header" @click="exportFormat = 'pdf'">
              <div class="add-option-icon" style="background: #fef3c7; color: #d97706;">
                <LucideIcon name="file-text" :size="16" />
              </div>
              <div class="add-option-text">
                <span class="add-option-title">PDF</span>
                <span class="add-option-desc">{{ t('formatted-document') }}</span>
              </div>
            </button>
          </div>
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('cancel')" @click="showExportModal = false; exportFormat = null" />
        <PButton variant="primary" :text="t('export')" :disabled="!exportFormat" :loading="exporting" @click="handleExport" />
      </template>
    </PModal>

    <!-- Add Students to Groups Modal -->
    <PModal
      v-if="showAddToGroupsModal"
      :title="t('add-to-groups')"
      width="700px"
      @close="showAddToGroupsModal = false"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('add-to-groups') }}</h2>
          <p class="text-sm text-slate-500 mt-0.5">{{ selectedStudents.length }} {{ t('student') }} {{ t('selected') }}</p>
        </div>
      </template>
      <template #body>
        <div class="modal-form-fields">
          <div class="info-banner">
            <LucideIcon name="info" :size="14" />
            <span>{{ t('selected-students-will-be-added') }}</span>
          </div>
          <PInput
            v-model="groupSearchQuery"
            :placeholder="t('search-groups')"
          />
          <div class="assign-groups-list">
            <label
              v-for="gid in filteredGroupsForAssign"
              :key="gid"
              class="assign-group-row"
            >
              <input
                type="checkbox"
                :checked="selectedGroupsForAssign.includes(gid)"
                @change="toggleGroupForAssign(gid)"
              />
              <span class="assign-group-name">{{ store.state.groups.groups[gid]?.name || t('unnamed') }}</span>
              <span v-if="store.state.groups.groups[gid]?.grade" class="assign-group-detail">{{ store.state.groups.groups[gid].grade }}</span>
              <span v-if="store.state.groups.groups[gid]?.subject" class="assign-group-detail">{{ store.state.groups.groups[gid].subject }}</span>
              <PBadge variant="default" :text="`${store.getters['groups/members'](gid).length}`" />
            </label>
          </div>
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('cancel')" @click="showAddToGroupsModal = false" />
        <PButton
          variant="primary"
          :text="`${t('add-to')} ${selectedGroupsForAssign.length} ${t('group')}`"
          :disabled="!selectedGroupsForAssign.length"
          :loading="addingToGroups"
          @click="handleAddToGroups"
        />
      </template>
    </PModal>

    <!-- Login Code / QR Modal -->
    <PModal
      v-if="loginCodeStudent"
      :title="t('login-code')"
      width="500px"
      @close="loginCodeStudent = null"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('login-code') }}</h2>
          <p class="text-sm text-slate-500 mt-0.5">{{ t('student-login-code') }}</p>
        </div>
      </template>
      <template #body>
        <div class="login-code-modal-body">
          <div class="login-code-student-name">
            <span><DecryptedName :user="loginCodeStudent.id" /></span>
            <button class="copy-btn" @click="copyToClipboard(loginCodeStudent.id)">
              <LucideIcon name="copy" :size="14" />
            </button>
          </div>
          <div class="login-code-qr" ref="qrContainerRef">
            <Suspense>
              <QRCodeDisplay :data="`${siteOrigin}/join/${loginCodeStudent.id}`" size="200px" />
              <template #fallback>
                <div class="qr-placeholder">{{ t('loading') }}...</div>
              </template>
            </Suspense>
          </div>
          <div class="login-code-passphrase">
            <span class="passphrase-label">{{ t('symbol-passphrase') }}</span>
            <span class="passphrase-value">{{ loginCodePassphrase }}</span>
          </div>
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('cancel')" @click="loginCodeStudent = null" />
        <PButton variant="primary" :text="t('download-qr-code')" @click="downloadQRCode" />
      </template>
    </PModal>

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
      @agreed="onAgreementAccepted()"
      @close="showAcceptStudentAgreementModal = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useStore } from 'vuex'
import naclUtil from 'tweetnacl-util'
import { PButton, PTable, PBadge, PAvatar, PModal, PMenu, PMenuItem, PDivider, PAlertDialog, PInput, PSelect, PUnifiedFilter, PUnifiedFilterSection, PFileUpload, PTooltip } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import DecryptedName from '@/components/common/decrypted-name.vue'

import UserInfoModal from '@/components/users/user-info-modal.vue'
import LinkStudentModal from '@/components/groups/link-student-modal.vue'
import TeacherStudentAgreementModal from './teacher-student-agreement-modal.vue'
import GroupCard from '@/components/groups/GroupCard.vue'
import QRCodeDisplay from '@/components/common/qrcode.vue'
import ManageStudentsModal from '@/components/groups/ManageStudentsModal.vue'
import { createUser, resetUserSecret } from '@/utils/user-utils.js'
import { useToast } from '@/utils/useToast.js'
import { useSuccessDialog } from '@/utils/useSuccessDialog.js'
import * as encryption from '@/utils/encryption.js'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

// ── State ──
const siteOrigin = window.location.origin
const users = reactive({})
const userModalUser = ref(null)
const viewProfileUser = ref(null)
const showArchived = computed(() => activeStatusFilters.value.includes(t('archived')))
const showAcceptStudentAgreementModal = ref(false)
const showLinkStudentModal = ref(false)
const showAddStudentPicker = ref(false)
const selectedPickerOption = ref(null)
const showCreateStudentForm = ref(false)
const newStudentName = ref('')
const newStudentNickname = ref('')
const newStudentGrade = ref('')
const showCreateGroupModal = ref(false)
const editGroupId = ref(null)
const editGroupName = ref('')
const editGroupGrade = ref('')
const editGroupSubject = ref('')
const newGroupName = ref('')
const newGroupGrade = ref('')
const newGroupSubject = ref('')
const searchQuery = ref('')
const selectedStudents = ref([])
const manageGroupId = ref(null)
const manageGroupShowBack = ref(false)
const activeGradeFilters = ref([])
const activeStatusFilters = ref([])
const activeGroupFilters = ref([])
const archiveConfirmStudent = ref(null)
const deleteConfirmStudent = ref(null)
const resetPasswordStudent = ref(null)
const loginCodeStudent = ref(null)
const deleteConfirmGroup = ref(null)
const showExportModal = ref(false)
const exportFormat = ref(null)
const showCSVUploadModal = ref(false)
const csvFile = ref(null)
const showBulkEntryModal = ref(false)
const showSSOModal = ref(false)
const showAddToGroupsModal = ref(false)
const selectedGroupsForAssign = ref([])
const groupSearchQuery = ref('')
const selectedSSOProvider = ref(null)
const bulkEntryRows = ref([
  { name: '', nickname: '', grade: '' },
  { name: '', nickname: '', grade: '' },
  { name: '', nickname: '', grade: '' },
])
// ── Toast notifications ──
const { error: toastError } = useToast()
const { successDialog, showSuccessDialog, dismissSuccessDialog } = useSuccessDialog()

// ── Loading states ──
const creatingStudent = ref(false)
const creatingBulk = ref(false)
const importingCSV = ref(false)
const creatingGroup = ref(false)
const savingGroup = ref(false)
const deletingStudent = ref(false)
const resettingPassword = ref(false)
const deletingGroup = ref(false)
const exporting = ref(false)
const addingToGroups = ref(false)

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
      grade: users[id]?.grade || '',
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
  if (activeGradeFilters.value.length) {
    items = items.filter(s => s.grade && activeGradeFilters.value.includes(s.grade))
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
  { key: 'grade', title: t('grade'), sortable: false },
  { key: 'status', title: t('status'), sortable: false },
  { key: 'groups', title: t('groups'), sortable: false },
  { key: 'more', title: '', sortable: false, width: '60px' },
])

// ── Grade options (static list for create/edit forms) ──
const gradeOptions = computed(() => {
  const grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  return grades.map(g => ({ value: g, label: g }))
})

// ── Filter options (derived from existing students, for table filters only) ──
const gradeFilterOptions = computed(() => {
  const grades = [...new Set(students.value.map(s => s.grade).filter(Boolean))]
  return grades.map(g => ({ value: g, label: g }))
})

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

// ── Subject options ──
const subjectOptions = [
  { value: 'Mathematics', title: 'Mathematics' },
  { value: 'English', title: 'English' },
  { value: 'Science', title: 'Science' },
  { value: 'Social Studies', title: 'Social Studies' },
  { value: 'Art', title: 'Art' },
  { value: 'Music', title: 'Music' },
  { value: 'Physical Education', title: 'Physical Education' },
  { value: 'Other', title: 'Other' },
]

// ── Profile helpers ──
const profileStudentInfo = ref(null)

const profileUserArchived = computed(() => {
  if (!viewProfileUser.value) return false
  return !!users[viewProfileUser.value]?.archived
})

const profileUserGrade = computed(() => {
  if (!viewProfileUser.value) return ''
  return users[viewProfileUser.value]?.grade || ''
})

const profileUserGroups = computed(() => {
  if (!viewProfileUser.value) return []
  return activeGroups.value
    .filter(gid => store.getters['groups/belongs'](viewProfileUser.value, gid))
    .map(gid => {
      const groupData = store.state.groups.groups[gid] || {}
      const detail = [groupData.grade, groupData.subject].filter(Boolean).join(' | ')
      return {
        id: gid,
        name: groupData.name || t('unnamed'),
        detail,
        memberCount: store.getters['groups/members'](gid).length,
      }
    })
})

const profileCreatedDate = ref(null)

async function openStudentProfile(studentId) {
  viewProfileUser.value = studentId
  profileStudentInfo.value = null
  profileCreatedDate.value = null
  // Decrypt student info for profile display
  try {
    const info = await store.getters.decryptUserInfo(studentId, false)
    profileStudentInfo.value = info
  } catch (e) {
    profileStudentInfo.value = { name: '...' }
  }
  // Get account creation date from metadata
  try {
    const meta = await Agent.metadata(studentId)
    if (meta?.created) {
      profileCreatedDate.value = new Date(meta.created).toLocaleDateString()
    }
  } catch (e) { /* metadata not available */ }
}

// ── Groups ──
const activeGroups = computed(() => store.getters['groups/groups']('class', true))
const archivedGroups = computed(() => store.getters['groups/archivedGroups']('class'))

async function handleCreateGroup() {
  const name = newGroupName.value.trim()
  if (!name) return
  creatingGroup.value = true
  try {
    const id = await store.dispatch('groups/add', { type: 'class', name })
    const groupState = await Agent.state(id)
    if (newGroupGrade.value) groupState.grade = newGroupGrade.value
    if (newGroupSubject.value) groupState.subject = newGroupSubject.value
    await Agent.synced()
    await store.dispatch('groups/loadGroups')
    newGroupName.value = ''
    newGroupGrade.value = ''
    newGroupSubject.value = ''
    showCreateGroupModal.value = false
    showSuccessDialog(t('success'), () => {
      manageGroupShowBack.value = true
      manageGroupId.value = id
    })
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    creatingGroup.value = false
  }
}

function openEditGroup(groupId) {
  const groupData = store.state.groups.groups[groupId] || {}
  editGroupId.value = groupId
  editGroupName.value = groupData.name || ''
  editGroupGrade.value = groupData.grade || ''
  editGroupSubject.value = groupData.subject || ''
}

async function handleSaveGroup() {
  if (!editGroupName.value.trim() || !editGroupId.value) return
  savingGroup.value = true
  try {
    const groupState = await Agent.state(editGroupId.value)
    groupState.name = editGroupName.value.trim()
    groupState.grade = editGroupGrade.value || undefined
    groupState.subject = editGroupSubject.value || undefined
    await Agent.synced()
    await store.dispatch('groups/loadGroups')
    editGroupId.value = null
    showSuccessDialog(t('success'))
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    savingGroup.value = false
  }
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

const qrContainerRef = ref(null)

const loginCodePassphrase = computed(() => {
  if (!loginCodeStudent.value) return '—'
  const secret = users[loginCodeStudent.value.id]?.secret
  return secret || '—'
})

function openLoginCodeModal(item) {
  loginCodeStudent.value = item
}

function downloadQRCode() {
  if (!qrContainerRef.value) return
  const canvas = qrContainerRef.value.querySelector('canvas')
  if (!canvas) return
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `login-code-${loginCodeStudent.value.id.slice(0, 8)}.png`
    a.click()
    URL.revokeObjectURL(url)
  })
}

async function executeDeleteStudent() {
  // TODO: backend — replace with hard-delete once backend endpoint exists
  if (!deleteConfirmStudent.value) return
  deletingStudent.value = true
  try {
    const studentId = deleteConfirmStudent.value.id
    const usersState = await Agent.state('users')
    if (usersState[studentId]) usersState[studentId].archived = true
    for (const gid of activeGroups.value) {
      if (store.getters['groups/belongs'](studentId, gid)) {
        await store.dispatch('groups/removeMember', { user_id: studentId, group_id: gid })
      }
    }
    deleteConfirmStudent.value = null
    showSuccessDialog(t('success'))
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    deletingStudent.value = false
  }
}

async function executeResetPassword() {
  if (!resetPasswordStudent.value) return
  const providerSecret = localStorage.getItem(`zkek-${store.state.user}`)
  if (!providerSecret) {
    resetPasswordStudent.value = null
    showNamePasswordModal.value = true
    return
  }
  resettingPassword.value = true
  try {
    const studentId = resetPasswordStudent.value.id
    const newSecret = randomString(8, codeCharacterSet)
    let info = { name: 'Student' }
    try {
      info = await store.getters.decryptUserInfo(studentId, false)
    } catch (e) {
      // fallback — re-encrypt with minimal info
    }
    await resetUserSecret(studentId, newSecret, providerSecret, info)
    const usersState = await Agent.state('users')
    if (usersState[studentId]) usersState[studentId].secret = newSecret
    resetPasswordStudent.value = null
    showSuccessDialog(t('success'), () => {
      loginCodeStudent.value = { id: studentId }
    })
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    resettingPassword.value = false
  }
}

function confirmDeleteGroup(groupId) {
  deleteConfirmGroup.value = groupId
}

async function executeDeleteGroup() {
  // TODO: backend — replace with hard-delete once backend endpoint exists
  if (!deleteConfirmGroup.value) return
  deletingGroup.value = true
  try {
    await store.dispatch('groups/archive', deleteConfirmGroup.value)
    deleteConfirmGroup.value = null
    showSuccessDialog(t('success'))
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    deletingGroup.value = false
  }
}

const codeCharacterSet = 'abcdefghijklmnopqrstuvwxy'

function randomString(length, chars) {
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return [...arr].map(i => chars[i % chars.length]).join('')
}

function handlePickerNext() {
  if (selectedPickerOption.value === 'individual') {
    handleAddStudentIndividual()
  } else if (selectedPickerOption.value === 'bulk') {
    showAddStudentPicker.value = false
    selectedPickerOption.value = null
    showCSVUploadModal.value = true
  } else if (selectedPickerOption.value === 'sso') {
    showAddStudentPicker.value = false
    selectedPickerOption.value = null
    showSSOModal.value = true
  }
}

function handleAddStudentIndividual() {
  showAddStudentPicker.value = false
  selectedPickerOption.value = null
  if (!hasEncryptionKey.value) {
    showNamePasswordModal.value = true
    return
  }
  newStudentName.value = ''
  newStudentNickname.value = ''
  newStudentGrade.value = ''
  showCreateStudentForm.value = true
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

async function createStudentAccount() {
  const { studentDataProtectionAgreement } = await Agent.state()
  if (!studentDataProtectionAgreement) {
    showAcceptStudentAgreementModal.value = true
    return
  }
  creatingStudent.value = true
  try {
    const providerSecret = localStorage.getItem(`zkek-${store.state.user}`)
    const userSecret = randomString(8, codeCharacterSet)
    const info = {
      name: newStudentName.value.trim(),
      nickname: newStudentNickname.value.trim() || undefined,
    }
    const id = await createUser(userSecret, providerSecret, info)
    const usersState = await Agent.state('users')
    usersState[id] = { grade: newStudentGrade.value || undefined, secret: userSecret }
    showCreateStudentForm.value = false
    newStudentName.value = ''
    newStudentNickname.value = ''
    newStudentGrade.value = ''
    showSuccessDialog(t('success'), () => {
      openLoginCodeModal({ id, secret: userSecret })
    })
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    creatingStudent.value = false
  }
}

function onAgreementAccepted() {
  showAcceptStudentAgreementModal.value = false
  // If the create form is open, re-trigger creation now that consent is given
  if (showCreateStudentForm.value) {
    createStudentAccount()
  }
}

// ── Bulk / Export / SSO handlers ──

async function createSingleStudent(name, nickname, grade) {
  const providerSecret = localStorage.getItem(`zkek-${store.state.user}`)
  const userSecret = randomString(8, codeCharacterSet)
  const info = {
    name: name.trim(),
    nickname: nickname?.trim() || undefined,
  }
  const id = await createUser(userSecret, providerSecret, info)
  const usersState = await Agent.state('users')
  usersState[id] = { grade: grade || undefined, secret: userSecret }
  return id
}

function addBulkRow() {
  bulkEntryRows.value.push({ name: '', nickname: '', grade: '' })
}

const validBulkRows = computed(() =>
  bulkEntryRows.value.some(r => r.name.trim() && r.grade)
)

async function handleCSVImport() {
  if (!csvFile.value) return
  const providerSecret = localStorage.getItem(`zkek-${store.state.user}`)
  if (!providerSecret) {
    showCSVUploadModal.value = false
    showNamePasswordModal.value = true
    return
  }
  const { studentDataProtectionAgreement } = await Agent.state()
  if (!studentDataProtectionAgreement) {
    showCSVUploadModal.value = false
    showAcceptStudentAgreementModal.value = true
    return
  }
  importingCSV.value = true
  try {
    const text = await csvFile.value.text()
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return // header only
    const header = lines[0].toLowerCase()
    const hasHeader = header.includes('name')
    const dataLines = hasHeader ? lines.slice(1) : lines
    let created = 0
    for (const line of dataLines) {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const name = cols[0]
      const nickname = cols[1] || ''
      const grade = cols[2] || ''
      if (!name) continue
      await createSingleStudent(name, nickname, grade)
      created++
    }
    showCSVUploadModal.value = false
    csvFile.value = null
    showSuccessDialog(`${created} ${t('student')} ${t('created')}`)
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    importingCSV.value = false
  }
}

async function handleBulkCreate() {
  const providerSecret = localStorage.getItem(`zkek-${store.state.user}`)
  if (!providerSecret) {
    showBulkEntryModal.value = false
    showNamePasswordModal.value = true
    return
  }
  const { studentDataProtectionAgreement } = await Agent.state()
  if (!studentDataProtectionAgreement) {
    showBulkEntryModal.value = false
    showAcceptStudentAgreementModal.value = true
    return
  }
  creatingBulk.value = true
  try {
    const rows = bulkEntryRows.value.filter(r => r.name.trim() && r.grade)
    let created = 0
    for (const row of rows) {
      await createSingleStudent(row.name, row.nickname, row.grade)
      created++
    }
    showBulkEntryModal.value = false
    bulkEntryRows.value = [
      { name: '', nickname: '', grade: '' },
      { name: '', nickname: '', grade: '' },
      { name: '', nickname: '', grade: '' },
    ]
    showSuccessDialog(`${created} ${t('student')} ${t('created')}`)
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    creatingBulk.value = false
  }
}

function downloadCSVTemplate() {
  const csv = 'Name,Nickname,Grade\n'
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'student-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function handleSSONext() {
  // TODO: backend — needs SSO OAuth integration (Google + Microsoft)
  console.warn('SSO integration not yet implemented — needs backend endpoint')
  showSSOModal.value = false
}

async function handleExport() {
  exporting.value = true
  try {
    const studentData = []
    for (const studentId of selectedStudents.value) {
      const student = students.value.find(s => s.id === studentId)
      let info = { name: '' }
      try {
        info = await store.getters.decryptUserInfo(studentId, false)
      } catch (e) { /* fallback */ }
      studentData.push({
        name: info?.name || '',
        nickname: info?.nickname || '',
        grade: student?.grade || '',
        status: student?.archived ? 'Archived' : 'Active',
        groups: student?.groupNames || '',
      })
    }

    if (exportFormat.value === 'csv') {
      const header = 'Name,Nickname,Grade,Status,Groups\n'
      const rows = studentData.map(s =>
        [s.name, s.nickname, s.grade, s.status, `"${s.groups}"`].join(',')
      ).join('\n')
      const blob = new Blob([header + rows], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'students-export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } else if (exportFormat.value === 'pdf') {
      const html = `<html><head><title>Students Export</title><style>
        body { font-family: sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f1f5f9; font-weight: 600; }
      </style></head><body>
      <h2>Students Export</h2>
      <table><thead><tr><th>Name</th><th>Nickname</th><th>Grade</th><th>Status</th><th>Groups</th></tr></thead>
      <tbody>${studentData.map(s => `<tr><td>${s.name}</td><td>${s.nickname}</td><td>${s.grade}</td><td>${s.status}</td><td>${s.groups}</td></tr>`).join('')}</tbody></table>
      </body></html>`
      const w = window.open('', '_blank')
      w.document.write(html)
      w.document.close()
      w.print()
    }

    showExportModal.value = false
    exportFormat.value = null
    showSuccessDialog(t('success'))
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    exporting.value = false
  }
}

const filteredGroupsForAssign = computed(() => {
  let groups = activeGroups.value
  if (groupSearchQuery.value) {
    const q = groupSearchQuery.value.toLowerCase()
    groups = groups.filter(gid => {
      const name = store.state.groups.groups[gid]?.name || ''
      return name.toLowerCase().includes(q)
    })
  }
  return groups
})

function toggleGroupForAssign(gid) {
  const idx = selectedGroupsForAssign.value.indexOf(gid)
  if (idx >= 0) {
    selectedGroupsForAssign.value.splice(idx, 1)
  } else {
    selectedGroupsForAssign.value.push(gid)
  }
}

async function handleAddToGroups() {
  addingToGroups.value = true
  try {
    for (const gid of selectedGroupsForAssign.value) {
      for (const studentId of selectedStudents.value) {
        await store.dispatch('groups/addMember', { user_id: studentId, group_id: gid })
      }
    }
    showAddToGroupsModal.value = false
    selectedGroupsForAssign.value = []
    groupSearchQuery.value = ''
    showSuccessDialog(t('success'))
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    addingToGroups.value = false
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {})
}

function printLoginCodes() {
  const ids = selectedStudents.value.join(',')
  window.open(`/teacher/codes?students=${encodeURIComponent(ids)}`)
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
  margin-bottom: 12px;
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
.student-name-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.grade-cell {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
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

.add-student-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background: #f8fafc;
  overflow: hidden;
  transition: all 150ms;
}

.add-student-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
}
.add-student-card-header:hover {
  background: #f1f5f9;
}

.add-student-card-link {
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 9px 0;
}

.add-student-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #2563eb;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.add-student-link-btn:hover {
  text-decoration: underline;
}
.add-student-link-btn.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.add-student-card--selected {
  outline: 2px solid var(--color-primary-600, #2563eb);
  background: #eff6ff;
}

.add-option-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.add-option-icon-individual {
  background: #fef9c3;
  color: #d97706;
}
.add-option-icon-bulk {
  background: #dcfce7;
  color: #16a34a;
}
.add-option-icon-sso {
  background: #dbeafe;
  color: #2563eb;
}

.add-option-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.add-option-title {
  font-size: 16px;
  font-weight: 500;
  color: #334155;
}
.add-option-desc {
  font-size: 12px;
  color: #64748b;
  line-height: 16px;
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
.profile-value--muted {
  color: var(--color-slate-400);
}

.profile-group-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.profile-group-name {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}
.profile-group-detail {
  font-size: 12px;
  color: #64748b;
}

/* Modal form fields */
.modal-form-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* CSV Upload */
.csv-actions-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.csv-template-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-primary-600, #2563eb);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.csv-template-link:hover {
  text-decoration: underline;
}
.csv-template-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.csv-info-text {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--color-slate-500);
  padding: 10px 12px;
  background: var(--color-slate-50, #f8fafc);
  border-radius: 8px;
}

/* Bulk Entry Table */
.bulk-entry-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bulk-entry-toolbar {
  display: flex;
  justify-content: flex-end;
}
.bulk-entry-table-wrapper {
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}
.bulk-entry-table {
  width: 100%;
  border-collapse: collapse;
}
.bulk-entry-table th {
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-slate-500);
  padding: 8px 6px;
  border-bottom: 1px solid var(--color-slate-200);
  white-space: nowrap;
}
.bulk-entry-table td {
  padding: 4px 6px;
}
.bulk-input {
  width: 100%;
  font-size: 13px;
  padding: 6px 8px;
  border: 1px solid var(--color-slate-200);
  border-radius: 6px;
}
.bulk-delete-row {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: var(--color-slate-400);
  cursor: pointer;
  border-radius: 6px;
}
.bulk-delete-row:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* Assign groups modal */
.info-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #eff6ff;
  border-radius: 8px;
  font-size: 13px;
  color: #1d4ed8;
}
.assign-groups-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 300px;
  overflow-y: auto;
}
.assign-group-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 100ms;
}
.assign-group-row:hover {
  background: var(--color-slate-50, #f8fafc);
}
.assign-group-name {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  flex: 1;
}
.assign-group-detail {
  font-size: 12px;
  color: #64748b;
}

/* Login Code Modal */
.login-code-modal-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 16px 0;
}

.login-code-student-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #334155;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-slate-200);
  background: none;
  border-radius: 6px;
  color: var(--color-slate-400);
  cursor: pointer;
}
.copy-btn:hover {
  background: var(--color-slate-100);
  color: var(--color-slate-700);
}

.login-code-qr {
  padding: 16px;
  background: #fff;
  border: 1px solid var(--color-slate-200);
  border-radius: 12px;
}

.qr-placeholder {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-slate-400);
}

.login-code-passphrase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.passphrase-label {
  font-size: 12px;
  color: var(--color-slate-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.passphrase-value {
  font-size: 18px;
  font-weight: 600;
  color: #334155;
  letter-spacing: 0.1em;
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

  .section-header-actions {
    flex-wrap: wrap;
  }

  .bulk-entry-table-wrapper {
    margin: 0 -8px;
  }

  .assign-groups-list {
    max-height: 200px;
  }
}
</style>
