<template>
  <div class="page-container admin-page">
    <h1 class="page-heading page-heading--sr">{{ t('student-and-group-management') }}</h1>

    <div class="admin-layout" :class="{ 'admin-layout--groups-expanded': groupsExpanded }">
      <!-- Left column: Students -->
      <div class="student-section content-card">
        <div class="section-header">
          <div class="section-header-left">
            <LucideIcon name="user" :size="20" class="section-icon" />
            <div>
              <h2 class="card-section-title">{{ t('my-students') }} ({{ studentHeaderCount }})</h2>
              <p class="card-section-subtitle">{{ t('manage-student-accounts') }}</p>
            </div>
          </div>
          <div class="section-header-actions">
            <PButton
              v-if="!selectedStudents.length"
              icon="lucide:plus"
              variant="primary"
              :text="t('add-students')"
              size="sm"
              @click="showAddStudentPicker = true"
            />
            <template v-else>
              <PButton
                v-if="hasEncryptionKey"
                icon="lucide:printer"
                variant="secondary"
                :text="t('print-login-codes')"
                size="sm"
                @click="printLoginCodes"
              />
              <PButton
                v-if="selectedActiveStudents.length"
                icon="lucide:user-plus"
                variant="secondary"
                :text="t('add-students-to-group')"
                size="sm"
                @click="showAddToGroupsModal = true; selectedGroupsForAssign = []; groupSearchQuery = ''"
              />
              <PButton
                v-if="selectedActiveStudents.length"
                icon="lucide:archive"
                variant="secondary"
                :text="`${t('archive')} (${selectedActiveStudents.length})`"
                size="sm"
                @click="archiveSelectedConfirm = true"
              />
              <PButton
                v-if="selectedArchivedStudents.length"
                icon="lucide:archive-restore"
                variant="secondary"
                :text="`${t('restore')} (${selectedArchivedStudents.length})`"
                size="sm"
                @click="restoreSelectedConfirm = true"
              />
            </template>
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
              :label="t('show-archived')"
              icon="badge-check"
              :options="statusFilterOptions"
              v-model="activeStatusFilters"
            />
            <PUnifiedFilterSection
              id="group"
              :label="t('groups')"
              icon="list-tree"
              :options="groupFilterOptions"
              v-model="activeGroupFilters"
              searchable
            />
          </PUnifiedFilter>
        </div>

        <PAlert
          v-if="showEncryptionBanner"
          variant="warning"
          icon="lucide:triangle-alert"
          closable
          class="encryption-key-banner"
          @close="encryptionBannerDismissed = true"
        >
          <div class="encryption-key-banner-body">
            <span>{{ encryptionBannerText }}</span>
            <button
              type="button"
              class="encryption-key-banner-cta"
              @click="showNamePasswordModal = true"
            >
              {{ t('enter-encryption-key-word') }}
            </button>
          </div>
        </PAlert>

        <!-- Student table -->
        <PTable
            :headers="studentHeaders"
            :items="filteredStudents"
            item-key="id"
            selectable
            :selected="selectedStudents"
            @update:selected="setSelectedStudents"
            :row-class="studentRowClass"
            :items-per-page="25"
            :items-per-page-options="studentTablePerPageOptions"
            :no-data-text="t('you-currently-have-no-students')"
            :items-per-page-text="t('rows-per-page')"
            draggable-rows
            :get-drag-label="studentDragLabel"
            :format-drag-count="formatStudentDragCount"
          >
            <template #item.displayName="{ item }">
              <div class="student-name-cell">
                <DecryptedName :user="item.id" />
                <PBadge
                  v-if="item.archived"
                  variant="warning"
                  :text="t('archived')"
                  class="student-archived-badge"
                />
              </div>
            </template>
            <template #item.grade="{ item }">
              <span class="grade-cell">{{ item.grade || '--' }}</span>
            </template>
            <template #item.lastLogin="{ item }">
              <span class="last-login-cell">{{ formatLastLogin(item.id) }}</span>
            </template>
            <template #item.groupNames="{ item }">
              <PTooltip :text="item.groupNames" only-if-overflow>
                <span class="groups-cell">{{ item.groupNames || '--' }}</span>
              </PTooltip>
            </template>
            <template #item.more="{ item }">
              <div v-if="selectedStudents.length <= 1" class="action-cell">
                <!-- Archived students still get profile access (UIUX-102) -->
                <PMenu align-right>
                  <template #activator="{ props }">
                    <PButton variant="icon" size="xsm" icon="lucide:ellipsis-vertical" iconOnly @click="props.onClick" />
                  </template>
                  <PMenuItem
                    :title="t('student-info')"
                    prepend-icon="lucide:user"
                    @click="openStudentProfile(item.id)"
                  />
                  <template v-if="!item.archived">
                    <PMenuItem
                      :title="t('edit')"
                      prepend-icon="lucide:pencil"
                      @click="userModalUser = item.id"
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
                  </template>
                  <PMenuItem
                    v-else
                    :title="t('restore')"
                    prepend-icon="lucide:archive-restore"
                    @click="confirmRestoreStudent(item)"
                  />
                </PMenu>
              </div>
            </template>
          </PTable>

      </div>

      <!-- Right column: Groups -->
      <div class="group-section content-card">
        <div class="group-section-header">
          <div class="group-section-header-top">
            <div class="section-header-left">
              <LucideIcon name="users" :size="20" class="section-icon" />
              <div>
                <h2 class="card-section-title">{{ t('groups') }} ({{ groupHeaderCount }})</h2>
                <p class="card-section-subtitle">{{ t('organise-students-into-groups') }}</p>
              </div>
            </div>
            <PButton
              class="group-expand-btn"
              variant="ghost"
              size="sm"
              :icon="groupsExpanded ? 'lucide:x' : 'lucide:maximize-2'"
              iconOnly
              :title="groupsExpanded ? t('close') : t('groups')"
              :aria-label="groupsExpanded ? t('close') : t('groups')"
              @click="toggleGroupsExpanded"
            />
          </div>
          <PButton
            class="group-add-btn"
            icon="lucide:plus"
            variant="primary"
            :text="t('add-group')"
            size="sm"
            @click="openCreateGroupModal"
          />
        </div>

        <div class="search-and-filters group-filters">
          <PUnifiedFilter
            v-model:searchQuery="groupSearchFilter"
            :placeholder="t('search-group')"
          >
            <PUnifiedFilterSection
              id="group-status"
              :label="t('show-archived')"
              icon="badge-check"
              :options="groupStatusFilterOptions"
              v-model="groupStatusFilters"
            />
          </PUnifiedFilter>
          <div class="group-sort">
            <PSelect
              v-model="groupSort"
              :placeholder="t('sort')"
              :items="groupSortOptions"
            />
          </div>
        </div>

        <div class="group-cards-scroll">
          <div class="group-cards-list" :class="{ 'group-cards-list--split': groupsListSplit }">
            <GroupCard
              v-for="groupId in paginatedGroupIds"
              :key="groupId"
              :group-id="groupId"
              :students="students"
              :archived="archivedGroupIdSet.has(groupId)"
              @manage="openManageStudents(groupId)"
              @edit="openEditGroup(groupId)"
              @archive="confirmArchiveGroup(groupId)"
              @unarchive="confirmRestoreGroup(groupId)"
              @drop-student="handleDropStudent(groupId, $event)"
              @print-login-codes="handlePrintGroupLoginCodes(groupId)"
            />

            <p v-if="!filteredGroups.length && groupSearchFilter.trim()" class="no-results-text">
              {{ t('no-results') }}
            </p>
          </div>
        </div>
        <PPagination
          v-if="!groupsExpanded && filteredGroups.length > groupsPerPage"
          :total-items="filteredGroups.length"
          v-model:current-page="groupListPage"
          :per-page="groupsPerPage"
          :per-page-options="[]"
          layout="stacked"
          :show-row-count="false"
          class="group-list-pagination"
        />
      </div>
    </div>

    <!-- Modals -->
    <UserInfoModal
      v-if="userModalUser"
      :id="userModalUser"
      @close="userModalUser = null"
      @saved="showSuccessDialog(t('student-updated-successfully'))"
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
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('students-profile') }}</h2>
        </div>
      </template>
      <template #body>
        <!-- Basic Information -->
        <div class="profile-section">
          <div class="profile-section-header">
            <LucideIcon name="user" :size="16" class="profile-section-icon" />
            <span class="profile-section-label">{{ t('basic-information') }}</span>
          </div>
          <div class="profile-grid">
            <div class="profile-cell">
              <span class="profile-label">{{ t('name') }}</span>
              <span class="profile-value">{{ profileStudentInfo?.name || '...' }}</span>
            </div>
            <div class="profile-cell" v-if="profileStudentInfo?.nickname">
              <span class="profile-label">{{ t('nickname') }}</span>
              <span class="profile-value">{{ profileStudentInfo.nickname }}</span>
            </div>
            <div class="profile-cell" v-if="profileUserGrade">
              <span class="profile-label">{{ t('grade') }}</span>
              <span class="profile-value">{{ profileUserGrade }}</span>
            </div>
            <div class="profile-cell">
              <span class="profile-label">{{ t('account-status') }}</span>
              <PBadge
                class="profile-status-badge"
                :variant="profileUserArchived ? 'warning' : 'info'"
                :text="profileUserArchived ? t('archived') : t('active')"
              />
            </div>
          </div>
        </div>

        <!-- Account Activity -->
        <div class="profile-section">
          <div class="profile-section-header">
            <LucideIcon name="clock" :size="16" class="profile-section-icon" />
            <span class="profile-section-label">{{ t('account-activity') }}</span>
          </div>
          <div class="profile-grid">
            <div class="profile-cell">
              <span class="profile-label">{{ t('account-created') }}</span>
              <span class="profile-value" :class="{ 'profile-value--muted': !profileCreatedDate }">{{ profileCreatedDate || '—' }}</span>
            </div>
            <div class="profile-cell">
              <span class="profile-label">{{ t('last-login') }}</span>
              <span
                class="profile-value"
                :class="{ 'profile-value--muted': !getLastLoginTimestamp(viewProfileUser) }"
              >{{ formatLastLogin(viewProfileUser) }}</span>
            </div>
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
        <PButton variant="secondary" color="danger" :text="t('cancel')" @click="viewProfileUser = null" />
        <PButton
          v-if="viewProfileUser && !profileUserArchived"
          variant="secondary"
          :text="t('download-login-code')"
          @click="openLoginCodeModal(profileStudentItem); viewProfileUser = null"
        />
        <PButton
          v-if="viewProfileUser && !profileUserArchived"
          variant="secondary"
          :text="t('archive')"
          @click="confirmArchiveStudent(profileStudentItem); viewProfileUser = null"
        />
        <PButton
          v-if="viewProfileUser && profileUserArchived"
          variant="secondary"
          :text="t('restore')"
          @click="confirmRestoreStudent(profileStudentItem); viewProfileUser = null"
        />
        <PButton
          v-if="viewProfileUser && !profileUserArchived"
          variant="primary"
          :text="t('edit-student')"
          @click="userModalUser = viewProfileUser; viewProfileUser = null"
        />
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
          </div>

          <!-- Card 3: Share join link so existing students can link to this teacher (/join/:teacher) -->
          <div
            class="add-student-card add-student-card--short"
            :class="{ 'add-student-card--selected': selectedPickerOption === 'sso' }"
          >
            <button class="add-student-card-header" @click="selectedPickerOption = 'sso'">
              <div class="add-option-icon add-option-icon-sso">
                <LucideIcon name="link" :size="16" />
              </div>
              <div class="add-option-text">
                <span class="add-option-title">{{ t('link-students-to-you') }}</span>
                <span class="add-option-desc">{{ t('share-this-link-with-your-students') }}</span>
              </div>
            </button>
          </div>
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" color="danger" :text="t('cancel')" @click="showAddStudentPicker = false; selectedPickerOption = null" />
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
        <PButton variant="secondary" :text="t('back')" @click="showCreateStudentForm = false; showAddStudentPicker = true" />
        <div style="flex: 1" />
        <PButton variant="secondary" color="danger" :text="t('cancel')" @click="showCreateStudentForm = false" />
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
          <PMultiSelect
            v-model="newGroupSubjects"
            :label="t('subject')"
            :items="subjectOptions"
            :placeholder="t('select-one-or-more-subjects')"
          />
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" color="danger" :text="t('cancel')" @click="showCreateGroupModal = false" />
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
          <p class="text-sm text-slate-500 mt-0.5">{{ t('modify-the-group-details') }}</p>
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
          <PMultiSelect
            v-model="editGroupSubjects"
            :label="t('subject')"
            :items="subjectOptions"
            :placeholder="t('select-one-or-more-subjects')"
          />
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" color="danger" :text="t('cancel')" @click="editGroupId = null" />
        <PButton variant="primary" :text="t('save')" @click="handleSaveGroup" :disabled="!editGroupName.trim()" :loading="savingGroup" />
      </template>
    </PModal>

    <!-- Duplicate student name guard -->
    <PAlertDialog
      v-if="studentDuplicatePrompt"
      variant="warning"
      :title="t('duplicate-name-title')"
      :description="duplicateStudentDescription"
      :confirm-text="t('continue')"
      :cancel-text="t('cancel')"
      @confirm="confirmStudentDuplicateProceed"
      @cancel="cancelStudentDuplicateProceed"
    />

    <!-- Bulk upload duplicate student name guard -->
    <PAlertDialog
      v-if="bulkDuplicatePrompt"
      variant="warning"
      :title="t('duplicate-name-title')"
      :description="bulkDuplicateDescription"
      :confirm-text="t('continue')"
      :cancel-text="t('cancel')"
      :confirm-loading="bulkDuplicateConfirmLoading"
      @confirm="confirmBulkDuplicateProceed"
      @cancel="cancelBulkDuplicateProceed"
    />

    <!-- Duplicate group name guard -->
    <PAlertDialog
      v-if="duplicatePrompt"
      variant="warning"
      :title="t('duplicate-name-title')"
      :description="duplicateGroupDescription"
      :confirm-text="t('continue')"
      :cancel-text="t('cancel')"
      @confirm="confirmDuplicateProceed"
      @cancel="cancelDuplicateProceed"
    />

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

    <!-- Archive Group Confirmation -->
    <PAlertDialog
      v-if="archiveConfirmGroup"
      variant="warning"
      :title="archiveGroupConfirmTitle"
      :description="archiveGroupConfirmDescription"
      :confirm-text="t('archive')"
      :cancel-text="t('cancel')"
      @confirm="executeArchiveGroup"
      @cancel="archiveConfirmGroup = null"
    />

    <!-- Bulk Archive Selected Confirmation -->
    <PAlertDialog
      v-if="archiveSelectedConfirm"
      variant="warning"
      :title="bulkArchiveConfirmTitle"
      :description="bulkArchiveConfirmDescription"
      :confirm-text="t('archive')"
      :cancel-text="t('cancel')"
      @confirm="executeArchiveSelected"
      @cancel="archiveSelectedConfirm = false"
    />

    <!-- Bulk Restore Selected Confirmation -->
    <PAlertDialog
      v-if="restoreSelectedConfirm"
      variant="notification"
      :title="bulkRestoreConfirmTitle"
      :description="bulkRestoreConfirmDescription"
      :confirm-text="t('restore')"
      :cancel-text="t('cancel')"
      @confirm="executeRestoreSelected"
      @cancel="restoreSelectedConfirm = false"
    />

    <!-- Restore Student Confirmation -->
    <PAlertDialog
      v-if="restoreConfirmStudent"
      variant="notification"
      :title="t('restore-student-confirm-title')"
      :description="t('restore-student-confirm-description')"
      :confirm-text="t('restore')"
      :cancel-text="t('cancel')"
      @confirm="executeRestoreStudent"
      @cancel="restoreConfirmStudent = null"
    />

    <!-- Restore Group Confirmation -->
    <PAlertDialog
      v-if="restoreConfirmGroup"
      variant="notification"
      :title="restoreGroupConfirmTitle"
      :description="t('restore-group-confirm-description')"
      :confirm-text="t('restore')"
      :cancel-text="t('cancel')"
      @confirm="executeRestoreGroup"
      @cancel="restoreConfirmGroup = null"
    />

    <!-- Group created — add students or continue -->
    <PAlertDialog
      v-if="groupCreatedPromptId"
      variant="success"
      :title="t('group-created-successfully')"
      :description="t('you-can-now-add-students-to-this-group')"
      :confirm-text="t('add-students-to-group')"
      :cancel-text="t('continue-without-adding')"
      @confirm="openGroupManageAfterCreate"
      @cancel="groupCreatedPromptId = null"
    />

    <!-- Success Confirmation -->
    <PAlertDialog
      v-if="successDialog.show"
      variant="success"
      :title="successDialog.message"
      :description="successDialog.subtitle"
      :confirm-text="t('done')"
      cancel-text=""
      @confirm="dismissSuccessDialog"
      @cancel="dismissSuccessDialog"
    />

    <!-- Add to Groups Result Dialog (UIUX-128: title depends on skips) -->
    <PAlertDialog
      v-if="addToGroupsResults"
      :variant="addToGroupsHasSkipped ? 'warning' : 'success'"
      :title="addToGroupsResultTitle"
      :confirm-text="t('continue')"
      cancel-text=""
      width="512px"
      @confirm="addToGroupsResults = null"
      @cancel="addToGroupsResults = null"
    >
      <p class="result-summary">
        {{ t('students-added-skipped-summary')
          .replace('{added}', String(addToGroupsResults[0]?.added || 0))
          .replace('{skipped}', String(addToGroupsResults[0]?.skipped || 0)) }}
      </p>
    </PAlertDialog>

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
            accept=".csv,.xlsx,.xls"
            :label="t('drop-csv-file-here')"
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
            <span>{{ t('csv-required-columns') }}: Name ({{ t('required') }}), Nickname, Grade ({{ t('required') }})</span>
          </div>
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('back')" @click="showCSVUploadModal = false; showAddStudentPicker = true" />
        <div style="flex: 1" />
        <PButton variant="secondary" color="danger" :text="t('cancel')" @click="showCSVUploadModal = false" />
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
        </div>
      </template>
      <template #body>
        <div class="bulk-entry-container">
          <div class="bulk-entry-toolbar">
            <PButton variant="secondary" size="sm" icon="lucide:plus" :text="t('add-row')" @click="addBulkRow" />
          </div>
          <div class="bulk-entry-table-wrapper">
            <table class="bulk-entry-table">
              <thead>
                <tr>
                  <th>{{ t('name') }} <span class="required-label">* Required</span></th>
                  <th>{{ t('nickname') }}</th>
                  <th>{{ t('grade') }} <span class="required-label">* Required</span></th>
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
                      <LucideIcon name="trash-2" :size="14" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('back')" @click="showBulkEntryModal = false; showCSVUploadModal = true" />
        <div style="flex: 1" />
        <PButton variant="secondary" color="danger" :text="t('cancel')" @click="showBulkEntryModal = false" />
        <PButton variant="primary" :text="t('create-all-accounts')" :disabled="!validBulkRows" :loading="creatingBulk" @click="handleBulkCreate" />
      </template>
    </PModal>

    <!-- Google/Microsoft directory import — disabled until backend SSO OAuth (UIUX-32) -->
    <!--
    <PModal
      v-if="showSSOModal"
      :title="t('link-via-sso')"
      width="460px"
      @close="showSSOModal = false"
    >
      ...
    </PModal>
    -->

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
          <p class="text-sm text-slate-500 mt-0.5">{{ addToGroupsSelectedLabel }}</p>
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
          <div v-if="selectedGroupsForAssign.length" class="selected-group-chips">
            <span
              v-for="gid in selectedGroupsForAssign"
              :key="gid"
              class="selected-group-chip"
            >
              {{ store.state.groups.groups[gid]?.name || t('unnamed') }}
              <button type="button" class="chip-remove" @click="toggleGroupForAssign(gid)">×</button>
            </span>
          </div>
          <div class="assign-groups-list">
            <label
              v-for="gid in filteredGroupsForAssign"
              :key="gid"
              class="assign-group-row"
            >
              <PCheckbox
                :modelValue="selectedGroupsForAssign.includes(gid)"
                size="sm"
                @update:modelValue="() => toggleGroupForAssign(gid)"
              />
              <LucideIcon name="users" :size="14" class="assign-group-type-icon" />
              <span class="assign-group-name">{{ store.state.groups.groups[gid]?.name || t('unnamed') }}</span>
              <span v-if="store.state.groups.groups[gid]?.grade" class="assign-group-detail">{{ store.state.groups.groups[gid].grade }}</span>
              <span
                v-if="formatGroupSubjects(store.state.groups.groups[gid]?.subject)"
                class="assign-group-detail assign-group-detail--subject"
                :title="formatGroupSubjects(store.state.groups.groups[gid]?.subject)"
              >{{ formatGroupSubjects(store.state.groups.groups[gid]?.subject) }}</span>
            </label>
          </div>
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" color="danger" :text="t('cancel')" @click="showAddToGroupsModal = false" />
        <PButton
          variant="primary"
          :text="addToGroupsButtonLabel"
          :disabled="!selectedGroupsForAssign.length"
          :loading="addingToGroups"
          @click="handleAddToGroups"
        />
      </template>
    </PModal>

    <!-- Login Code / QR Modal -->
    <PModal
      v-if="loginCodeStudent"
      :title="t('pila-login-code')"
      width="500px"
      @close="loginCodeStudent = null"
    >
      <template #title>
        <div>
          <h2 class="text-lg font-semibold text-zinc-950">{{ t('pila-login-code') }}</h2>
        </div>
      </template>
      <template #body>
        <div class="login-code-modal-body">
          <div class="login-code-student-name">
            <span><DecryptedName :user="loginCodeStudent.id" /></span>
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
            <span class="passphrase-label">{{ t('pila-login-code') }}</span>
            <div class="passphrase-icons" :aria-label="t('pila-login-code')">
              <i
                v-for="(char, index) in loginCodePassphraseIcons"
                :key="index"
                :class="codeCharToIcon[char]"
                class="passphrase-icon"
              />
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <PButton variant="secondary" color="danger" :text="t('close')" @click="loginCodeStudent = null" />
        <PButton variant="primary" :text="t('download-login')" @click="downloadLoginCard" />
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
      <template #footer>
        <PButton
          variant="secondary"
          color="danger"
          :text="t('close')"
          @click="showLinkStudentModal = false"
        />
      </template>
    </PModal>

    <EncryptionKeyModal
      v-if="showNamePasswordModal"
      @close="closeNamePasswordModal"
    />

    <TeacherStudentAgreementModal
      v-if="showAcceptStudentAgreementModal"
      @agreed="onAgreementAccepted"
      @close="onAgreementModalClose"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useStore } from 'vuex'

import { PButton, PTable, PBadge, PAvatar, PModal, PMenu, PMenuItem, PDivider, PAlert, PAlertDialog, PInput, PSelect, PMultiSelect, PUnifiedFilter, PUnifiedFilterSection, PFileUpload, PTooltip, PCheckbox, PPagination } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import DecryptedName from '@/components/common/decrypted-name.vue'

import UserInfoModal from '@/components/users/user-info-modal.vue'
import LinkStudentModal from '@/components/groups/link-student-modal.vue'
import TeacherStudentAgreementModal from './teacher-student-agreement-modal.vue'
import GroupCard from '@/components/groups/GroupCard.vue'
import QRCodeDisplay from '@/components/common/qrcode.vue'
import ManageStudentsModal from '@/components/groups/ManageStudentsModal.vue'
import codeCharToIcon from '@/utils/code-char-to-icon.js'
import { createUser, resetUserSecret } from '@/utils/user-utils.js'
import { formatStudentPreferredName } from '@/utils/student-display-name.js'
import { useFeedback } from '@/composables/useFeedback.js'
import { tablePerPageOptions } from '@/utils/pagination-options.js'
import { glyphForCodeChar } from '@/utils/login-code-symbols.js'
import {
  normalizeGroupSubjects,
  formatGroupSubjects,
  serializeGroupSubjects,
} from '@/utils/group-subjects.js'
import { useBulkSelection } from '@/composables/useBulkSelection.js'
import { useDuplicateGuard, partitionBulkStudentRows, findDuplicateName } from '@/composables/useDuplicateGuard.js'
import { useEncryptionKey } from '@/utils/useEncryptionKey.js'
import EncryptionKeyModal from '@/components/common/EncryptionKeyModal.vue'
import {
  defaultActiveStatusFilters,
  buildStatusFilterOptions,
  matchesStatusFilter,
  filterGroupIdsByStatus,
  includesArchivedStatus,
} from '@/utils/status-filter.js'
import { activeStudentCountInGroup } from '@/utils/group-student-counts.js'

const store = useStore()
const groupsExpanded = ref(false)
const groupsListSplit = ref(false)
let groupsExpandTimer = null

function toggleGroupsExpanded() {
  clearTimeout(groupsExpandTimer)
  if (groupsExpanded.value) {
    groupsListSplit.value = false
    groupsExpanded.value = false
    return
  }
  groupsExpanded.value = true
  groupsExpandTimer = setTimeout(() => {
    groupsListSplit.value = true
  }, 240)
}

function t(slug) { return store.getters.t(slug) }
const studentTablePerPageOptions = computed(() => tablePerPageOptions(t))

// ── State ──
const siteOrigin = window.location.origin
const users = reactive({})
const userModalUser = ref(null)
const viewProfileUser = ref(null)

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
/** Multi-select subjects (UIUX-110); always an array in the form */
const editGroupSubjects = ref([])
const newGroupName = ref('')
const newGroupGrade = ref('')
const newGroupSubjects = ref([])
const searchQuery = ref('')
const groupSearchFilter = ref('')
const groupSort = ref('newest')
const groupListPage = ref(1)
const groupsPerPage = 4
const pendingAfterAgreement = ref(null)
const addToGroupsResults = ref(null)
/** UIUX-128: any skip → non-success title (Sophie copy). */
const addToGroupsHasSkipped = computed(() =>
  !!addToGroupsResults.value?.some(r => (r.summary ? r.skipped > 0 : r.status === 'skipped')),
)
const addToGroupsResultTitle = computed(() => {
  if (addToGroupsHasSkipped.value) {
    return t('one-or-more-students-were-not-added-to-selected-groups')
  }
  return t('students-successfully-added-to-the-groups')
})
const addToGroupsSelectedLabel = computed(() => {
  const n = selectedStudents.value.length
  return t('n-students-selected').replace('{num}', String(n))
})
const addToGroupsButtonLabel = computed(() => {
  const n = selectedGroupsForAssign.value.length
  if (n === 1) return t('add-to-n-group').replace('{num}', '1')
  return t('add-to-n-groups').replace('{num}', String(n))
})
const manageGroupId = ref(null)
const activeGradeFilters = ref([])
const activeStatusFilters = ref(defaultActiveStatusFilters())
const activeGroupFilters = ref([])
const groupStatusFilters = ref(defaultActiveStatusFilters())
const archiveConfirmStudent = ref(null)
const archiveSelectedConfirm = ref(false)
const restoreSelectedConfirm = ref(false)

const selectedActiveStudents = computed(() =>
  selectedStudents.value.filter(s => !s.archived),
)
const selectedArchivedStudents = computed(() =>
  selectedStudents.value.filter(s => s.archived),
)
const archiveConfirmGroup = ref(null)
const restoreConfirmStudent = ref(null)
const restoreConfirmGroup = ref(null)
const groupCreatedPromptId = ref(null)
const resetPasswordStudent = ref(null)
const loginCodeStudent = ref(null)


const showCSVUploadModal = ref(false)
const csvFile = ref(null)
const showBulkEntryModal = ref(false)
const showAddToGroupsModal = ref(false)
const selectedGroupsForAssign = ref([])
const groupSearchQuery = ref('')
const bulkEntryRows = ref([
  { name: '', nickname: '', grade: '' },
  { name: '', nickname: '', grade: '' },
  { name: '', nickname: '', grade: '' },
])
// ── Feedback (success modal, error toast) ──
const {
  successDialog,
  success: showSuccessDialog,
  dismissSuccess: dismissSuccessDialog,
  error: toastError,
  info: toastInfo,
} = useFeedback()

const {
  duplicatePrompt,
  runWithGuard,
  confirmDuplicateProceed,
  cancelDuplicateProceed,
} = useDuplicateGuard({
  getExistingNames: () =>
    Object.values(store.state.groups.groups)
      .filter(g => !g.archived)
      .map(g => g.name || ''),
})

const {
  duplicatePrompt: studentDuplicatePrompt,
  runWithGuard: runStudentWithGuard,
  confirmDuplicateProceed: confirmStudentDuplicateProceed,
  cancelDuplicateProceed: cancelStudentDuplicateProceed,
} = useDuplicateGuard({
  // Legal names + grade (UIUX-49): hard = same name+grade; soft = same name, other grade
  getExistingStudents: () => getStudentExistingRoster(),
})

const duplicateGroupDescription = computed(() => {
  if (!duplicatePrompt.value) return ''
  return `${t('duplicate-name-description')} "${duplicatePrompt.value.existingName}" ${t('already-exists-continue')}`
})

const duplicateStudentDescription = computed(() => {
  const p = studentDuplicatePrompt.value
  if (!p) return ''
  if (p.type === 'soft') {
    // FE default only — no new backend string required
    return t('duplicate-student-different-grade')
      .replace('{name}', p.existingName || p.name || '')
      .replace('{grade}', p.existingGrade || '—')
  }
  return `${t('duplicate-name-description')} "${p.existingName}" ${t('already-exists-continue')}`
})

const bulkDuplicatePrompt = ref(null)
const bulkDuplicateConfirmLoading = ref(false)

/** Roster rows for grade-aware student duplicate checks. */
function getStudentExistingRoster() {
  return students.value
    .map(s => ({
      name: decryptedLegalNames.get(s.id),
      grade: s.grade || users[s.id]?.grade || '',
    }))
    .filter(s => s.name && s.name !== '…')
}

/** @deprecated name-only list — prefer getStudentExistingRoster */
function getStudentExistingNames() {
  return getStudentExistingRoster().map(s => s.name)
}

function cacheStudentDisplayName(id, info) {
  decryptedNames.set(id, formatStudentPreferredName(info) || '')
  decryptedLegalNames.set(id, String(info?.name ?? '').trim())
}

async function ensureDecryptedStudentNames() {
  await Promise.all(
    students.value.map(async ({ id }) => {
      const cached = decryptedNames.get(id)
      if (cached && cached !== '…') return
      try {
        const info = await store.getters.decryptUserInfo(id, false)
        cacheStudentDisplayName(id, info)
      } catch {
        decryptedNames.set(id, '')
        decryptedLegalNames.set(id, '')
      }
    }),
  )
}

function getOtherGroupNames(excludeGroupId) {
  return Object.entries(store.state.groups.groups)
    .filter(([id, g]) => !g.archived && id !== excludeGroupId)
    .map(([, g]) => g.name || '')
}

function runEditGroupNameGuard(name, excludeGroupId, proceed) {
  const match = findDuplicateName(name, getOtherGroupNames(excludeGroupId))
  if (match) {
    duplicatePrompt.value = { name, existingName: match, proceed }
    return false
  }
  proceed()
  return true
}

const bulkDuplicateDescription = computed(() => {
  const prompt = bulkDuplicatePrompt.value
  if (!prompt) return ''

  const duplicateCount = prompt.skippedExisting.length + prompt.skippedBatch.length
  const softCount = prompt.softConflicts?.length || 0
  const parts = []

  if (duplicateCount > 0) {
    parts.push(
      t('bulk-duplicate-students-intro').replace('{count}', String(duplicateCount)),
    )
  }

  if (prompt.skippedExisting.length) {
    const names = prompt.skippedExisting
      .map((item) => {
        const g = item.grade || item.existingGrade
        return g ? `"${item.existingName}" (${item.name}, ${g})` : `"${item.existingName}" (${item.name})`
      })
      .join(', ')
    parts.push(`${t('bulk-duplicate-already-exists')} ${names}`)
  }

  if (prompt.skippedBatch.length) {
    const names = prompt.skippedBatch.map((item) => {
      const g = item.grade
      return g ? `"${item.name}" (${g})` : `"${item.name}"`
    }).join(', ')
    parts.push(`${t('bulk-duplicate-repeated-in-upload')} ${names}`)
  }

  // Soft: same name, different grade — will still be created (not blocked)
  if (softCount > 0) {
    const names = prompt.softConflicts
      .map((item) => {
        const eg = item.softConflict?.existingGrade || '—'
        return `"${item.name}" (${item.grade || '—'}; ${t('duplicate-soft-existing-grade').replace('{grade}', eg)})`
      })
      .join(', ')
    parts.push(`${t('bulk-duplicate-soft-grade-note').replace('{count}', String(softCount))} ${names}`)
  }

  if (duplicateCount > 0 || softCount > 0) {
    parts.push(
      t('bulk-duplicate-students-summary')
        .replace('{create}', String(prompt.toCreate.length))
        .replace('{skip}', String(duplicateCount)),
    )
  }

  return parts.join(' ')
})

function confirmBulkDuplicateProceed() {
  const prompt = bulkDuplicatePrompt.value
  if (!prompt?.proceed) return
  bulkDuplicateConfirmLoading.value = true
  Promise.resolve(prompt.proceed())
    .finally(() => {
      bulkDuplicateConfirmLoading.value = false
      bulkDuplicatePrompt.value = null
    })
}

function cancelBulkDuplicateProceed() {
  bulkDuplicatePrompt.value = null
}

function promptBulkDuplicates(partition, proceed) {
  const softCount = partition.softConflicts?.length || 0
  // Show modal for hard skips and/or soft same-name-different-grade notes
  if (!partition.skippedCount && !softCount) {
    proceed(partition.toCreate, 0)
    return
  }
  bulkDuplicatePrompt.value = {
    ...partition,
    proceed: () => proceed(partition.toCreate, partition.skippedCount),
  }
}

// ── Loading states ──
const creatingStudent = ref(false)
const creatingBulk = ref(false)
const importingCSV = ref(false)
const creatingGroup = ref(false)
const savingGroup = ref(false)
const resettingPassword = ref(false)
const addingToGroups = ref(false)

// ── Encryption key ──
const {
  namePassword,
  hasEncryptionKey,
  needsEncryptionAttention,
  isEncryptionKeyInvalid,
  revalidateEncryptionKey,
  showEncryptionKeyModal: showNamePasswordModal,
  closeEncryptionKeyModal: closeNamePasswordModal,
} = useEncryptionKey(store)
// Auto-open only when key is empty (not when wrong — soft signal uses banner)
showNamePasswordModal.value = !hasEncryptionKey.value
// Session-only dismiss — resets on full page reload
const encryptionBannerDismissed = ref(false)

const showEncryptionBanner = computed(() =>
  needsEncryptionAttention.value && !encryptionBannerDismissed.value
)
const encryptionBannerText = computed(() =>
  isEncryptionKeyInvalid.value
    ? t('encryption-key-invalid-banner')
    : t('encryption-key-missing-banner')
)

// ── Users watcher ──
let unwatchUsers
onMounted(() => {
  unwatchUsers = Agent.watch('users', ({ state }) => {
    Object.entries(state).forEach(([key, value]) => users[key] = value)
  })
})
onBeforeUnmount(() => {
  clearTimeout(groupsExpandTimer)
  if (unwatchUsers) unwatchUsers()
})

// ── Decrypted student names (preferred labels for sort/search/drag; legal for duplicates) ──
const decryptedNames = reactive(new Map())
const decryptedLegalNames = reactive(new Map())

// ── Students ──
const myPILAUsers = computed(() => Object.keys(users))

const students = computed(() => {
  const ids = [
    ...myPILAUsers.value,
    ...store.getters['groups/myStudents']().filter(id => !myPILAUsers.value.includes(id)),
  ]
  return ids.map(id => {
    const groupIds = activeGroups.value.filter(gid => store.getters['groups/belongs'](id, gid))
    const groupNames = groupIds.map(gid => store.state.groups.groups[gid]?.name || '').filter(Boolean).join(', ')
    return {
      id,
      displayName: decryptedNames.get(id) || '…',
      archived: !!users[id]?.archived,
      grade: users[id]?.grade || '',
      groupNames,
      groupIds,
    }
  })
})

watch(
  () => students.value.map(s => s.id),
  (ids) => {
    for (const id of ids) {
      if (decryptedNames.has(id)) continue
      store.getters.decryptUserInfo(id, false)
        .then(info => { cacheStudentDisplayName(id, info) })
        .catch(() => {
          decryptedNames.set(id, '')
          decryptedLegalNames.set(id, '')
        })
    }
    // Soft-probe key health when we have student ids (wrong vs empty key)
    revalidateEncryptionKey(ids)
  },
  { immediate: true }
)

// Re-fetch decrypted names when the encryption key is set or changed
watch(namePassword, async (newKey) => {
  if (newKey) {
    decryptedNames.clear()
    decryptedLegalNames.clear()
    const currentIds = students.value.map(s => s.id)
    for (const id of currentIds) {
      try {
        const info = await store.getters.decryptUserInfo(id, false)
        cacheStudentDisplayName(id, info)
      } catch {
        decryptedNames.set(id, '')
        decryptedLegalNames.set(id, '')
      }
    }
    await revalidateEncryptionKey(currentIds)
  } else {
    await revalidateEncryptionKey([])
  }
})

function applyStudentListFilters(items) {
  let result = items
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(s => {
      const legal = (decryptedLegalNames.get(s.id) || '').toLowerCase()
      return s.displayName.toLowerCase().includes(q)
        || legal.includes(q)
        || s.id.toLowerCase().includes(q)
        || s.groupNames.toLowerCase().includes(q)
    })
  }
  if (activeGradeFilters.value.length) {
    const allowed = activeGradeFilters.value.filter(g => validGrades.has(g))
    if (allowed.length) {
      result = result.filter(s => s.grade && allowed.includes(s.grade))
    }
  }
  result = result.filter(s =>
    matchesStatusFilter(activeStatusFilters.value, s.archived),
  )
  if (activeGroupFilters.value.length) {
    result = result.filter(s =>
      activeGroupFilters.value.some(gName => s.groupNames.toLowerCase().includes(gName.toLowerCase())),
    )
  }
  return result
}

const filteredStudents = computed(() => {
  const items = applyStudentListFilters(students.value)
  return [...items].sort((a, b) => {
    if (a.archived === b.archived) return 0
    return a.archived ? 1 : -1
  })
})

/** Header count: active by default; +archived when status chip is on (ignores search/grade/group filters). */
const studentHeaderCount = computed(() =>
  students.value.filter(s => matchesStatusFilter(activeStatusFilters.value, s.archived)).length,
)

const {
  selected: selectedStudents,
  setSelected: setSelectedStudents,
} = useBulkSelection(filteredStudents, 'id')

function studentRowClass(item) {
  return item.archived ? 'table-row-archived' : ''
}

function getLastLoginTimestamp(id) {
  const u = users[id]
  if (!u) return null
  return u.lastLogin ?? u.last_login ?? u.lastlogin ?? null
}

function formatLastLogin(id) {
  const ts = getLastLoginTimestamp(id)
  if (!ts) return '—'
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

const studentHeaders = computed(() => [
  { key: 'displayName', title: t('name') },
  { key: 'grade', title: t('grade') },
  { key: 'lastLogin', title: t('last-login'), sortable: false },
  { key: 'groupNames', title: t('groups') },
  { key: 'more', title: '', sortable: false, width: '60px' },
])

// Canonical grades only (UIUX-138: never unique-collect raw users[].grade into filters)
const VALID_GRADE_VALUES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const validGrades = new Set(VALID_GRADE_VALUES)

const gradeOptions = computed(() =>
  VALID_GRADE_VALUES.map(g => ({ value: g, label: g })),
)

const gradeFilterOptions = computed(() => {
  const present = new Set(
    students.value.map(s => s.grade).filter(g => validGrades.has(g)),
  )
  return VALID_GRADE_VALUES
    .filter(g => present.has(g))
    .map(g => ({ value: g, label: g }))
})

const statusFilterOptions = computed(() => buildStatusFilterOptions(t))

const groupStatusFilterOptions = computed(() => buildStatusFilterOptions(t))

const groupFilterOptions = computed(() =>
  activeGroups.value.map(gid => {
    const name = store.state.groups.groups[gid]?.name || t('unnamed')
    return { value: name, label: name }
  })
)

// ── Subject options (multi-select) ──
const subjectOptions = computed(() => [
  { value: 'Mathematics', title: t('subject-mathematics') },
  { value: 'English', title: t('subject-english') },
  { value: 'Science', title: t('subject-science') },
  { value: 'Social Studies', title: t('subject-social-studies') },
  { value: 'Art', title: t('subject-art') },
  { value: 'Music', title: t('subject-music') },
  { value: 'Physical Education', title: t('subject-physical-education') },
  { value: 'Other', title: t('subject-other') },
])

// ── Profile helpers ──
const profileStudentInfo = ref(null)

const profileStudentPreferredName = computed(() =>
  formatStudentPreferredName(profileStudentInfo.value) || '',
)

const profileUserArchived = computed(() => {
  if (!viewProfileUser.value) return false
  return !!users[viewProfileUser.value]?.archived
})

/** Item shape for archive/restore/login actions (viewProfileUser is an id string). */
const profileStudentItem = computed(() => {
  if (!viewProfileUser.value) return null
  const fromList = students.value.find(s => s.id === viewProfileUser.value)
  if (fromList) return fromList
  return {
    id: viewProfileUser.value,
    archived: profileUserArchived.value,
    grade: users[viewProfileUser.value]?.grade || '',
  }
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
      const subjectLabel = formatGroupSubjects(groupData.subject)
      const detail = [groupData.grade, subjectLabel].filter(Boolean).join(' | ')
      return {
        id: gid,
        name: groupData.name || t('unnamed'),
        detail,
        memberCount: activeStudentCountInGroup(gid, students.value, store),
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

const archivedGroupIdSet = computed(() => new Set(archivedGroups.value))

/** Header count: active groups by default; +archived when status chip is on (ignores search). */
const groupHeaderCount = computed(() => {
  const n = activeGroups.value.length
  if (includesArchivedStatus(groupStatusFilters.value)) {
    return n + archivedGroups.value.length
  }
  return n
})

const groupSortOptions = computed(() => [
  { title: t('newest-first'), value: 'newest' },
  { title: t('oldest-first'), value: 'oldest' },
  { title: t('name-a-z'), value: 'name-asc' },
  { title: t('name-z-a'), value: 'name-desc' },
])

function groupCreatedMs(gid) {
  const g = store.state.groups.groups[gid]
  const raw = g?.created || g?.updated
  const ms = raw ? new Date(raw).getTime() : 0
  return Number.isFinite(ms) ? ms : 0
}

function sortGroupIds(ids, mode = groupSort.value) {
  const list = [...ids]
  if (mode === 'name-asc') {
    return list.sort((a, b) =>
      (store.state.groups.groups[a]?.name || '').localeCompare(
        store.state.groups.groups[b]?.name || '',
        undefined,
        { sensitivity: 'base' },
      ),
    )
  }
  if (mode === 'name-desc') {
    return list.sort((a, b) =>
      (store.state.groups.groups[b]?.name || '').localeCompare(
        store.state.groups.groups[a]?.name || '',
        undefined,
        { sensitivity: 'base' },
      ),
    )
  }
  if (mode === 'oldest') {
    return list.sort((a, b) => groupCreatedMs(a) - groupCreatedMs(b))
  }
  return list.sort((a, b) => groupCreatedMs(b) - groupCreatedMs(a))
}

const filteredGroups = computed(() =>
  sortGroupIds(
    filterGroupIdsByStatus({
      activeIds: activeGroups.value,
      archivedIds: archivedGroups.value,
      archivedIdSet: archivedGroupIdSet.value,
      selectedStatuses: groupStatusFilters.value,
      searchQuery: groupSearchFilter.value,
      getSearchText: (gid) => store.state.groups.groups[gid]?.name || '',
    }),
  ),
)

const paginatedGroupIds = computed(() => {
  const ids = filteredGroups.value
  if (groupsExpanded.value) return ids
  const start = (groupListPage.value - 1) * groupsPerPage
  return ids.slice(start, start + groupsPerPage)
})

watch([groupSearchFilter, groupStatusFilters, groupSort], () => {
  groupListPage.value = 1
})

watch(filteredGroups, (ids) => {
  const totalPages = Math.max(1, Math.ceil(ids.length / groupsPerPage))
  if (groupListPage.value > totalPages) groupListPage.value = totalPages
})

function openGroupManageAfterCreate() {
  const id = groupCreatedPromptId.value
  groupCreatedPromptId.value = null
  if (!id) return
  manageGroupId.value = id
}

async function handleCreateGroup() {
  const name = newGroupName.value.trim()
  if (!name) return
  runWithGuard(name, () => executeCreateGroup(name))
}

function openCreateGroupModal() {
  newGroupName.value = ''
  newGroupGrade.value = ''
  newGroupSubjects.value = []
  showCreateGroupModal.value = true
}

async function executeCreateGroup(name) {
  creatingGroup.value = true
  try {
    const id = await store.dispatch('groups/add', { type: 'class', name })
    const groupState = await Agent.state(id)
    if (newGroupGrade.value) groupState.grade = newGroupGrade.value
    const subjects = serializeGroupSubjects(newGroupSubjects.value)
    if (subjects) groupState.subject = subjects
    await Agent.synced()
    await store.dispatch('groups/loadGroups')
    newGroupName.value = ''
    newGroupGrade.value = ''
    newGroupSubjects.value = []
    showCreateGroupModal.value = false
    groupCreatedPromptId.value = id
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
  // Legacy string subjects → [string]; already-array stays multi
  editGroupSubjects.value = normalizeGroupSubjects(groupData.subject)
}

async function handleSaveGroup() {
  const name = editGroupName.value.trim()
  if (!name || !editGroupId.value) return
  runEditGroupNameGuard(name, editGroupId.value, () => executeSaveGroup(name))
}

async function executeSaveGroup(name) {
  savingGroup.value = true
  try {
    const groupState = await Agent.state(editGroupId.value)
    groupState.name = name
    groupState.grade = editGroupGrade.value || undefined
    groupState.subject = serializeGroupSubjects(editGroupSubjects.value)
    await Agent.synced()
    await store.dispatch('groups/loadGroups')
    editGroupId.value = null
    showSuccessDialog(t('group-updated-successfully'))
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    savingGroup.value = false
  }
}

function confirmArchiveGroup(id) {
  archiveConfirmGroup.value = id
}

async function executeArchiveGroup() {
  if (!archiveConfirmGroup.value) return
  await store.dispatch('groups/archive', archiveConfirmGroup.value)
  archiveConfirmGroup.value = null
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
    await Agent.synced()
  }
}

const qrContainerRef = ref(null)

const loginCodePassphraseIcons = computed(() => {
  if (!loginCodeStudent.value) return ''
  return users[loginCodeStudent.value.id]?.secret || ''
})

const archiveGroupConfirmTitle = computed(() => {
  if (!archiveConfirmGroup.value) return ''
  const name = store.state.groups.groups[archiveConfirmGroup.value]?.name || ''
  return t('archive-group-confirm-title').replace('{name}', name)
})

const archiveGroupConfirmDescription = computed(() => {
  if (!archiveConfirmGroup.value) return ''
  const count = store.getters['groups/members'](archiveConfirmGroup.value).length
  return t('archive-group-confirm-description').replace('{count}', String(count))
})

const bulkArchiveConfirmTitle = computed(() => {
  const n = selectedActiveStudents.value.length
  return t('bulk-archive-students-confirm-title').replace('{count}', String(n))
})

const bulkArchiveConfirmDescription = computed(() => t('bulk-archive-students-confirm-description'))

const bulkRestoreConfirmTitle = computed(() => {
  const n = selectedArchivedStudents.value.length
  return t('bulk-restore-students-confirm-title').replace('{count}', String(n))
})

const bulkRestoreConfirmDescription = computed(() => t('bulk-restore-students-confirm-description'))

const restoreGroupConfirmTitle = computed(() => {
  if (!restoreConfirmGroup.value) return ''
  const name = store.state.groups.groups[restoreConfirmGroup.value]?.name || ''
  return t('restore-group-confirm-title').replace('{name}', name)
})

function openLoginCodeModal(item) {
  loginCodeStudent.value = item
}

function truncateCanvasText(ctx, text, maxWidth) {
  if (!text) return ''
  if (ctx.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (truncated.length > 1 && ctx.measureText(`${truncated}...`).width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return truncated.length < text.length ? `${truncated}...` : truncated
}

async function resolveLoginCodeStudentName(student) {
  const fromItem = student?.displayName
  if (fromItem && fromItem !== '…') return fromItem

  const cached = decryptedNames.get(student.id)
  if (cached && cached !== '…') return cached

  try {
    const info = await store.getters.decryptUserInfo(student.id, false)
    cacheStudentDisplayName(student.id, info)
    return formatStudentPreferredName(info) || ''
  } catch {
    return ''
  }
}

async function downloadLoginCard() {
  if (!qrContainerRef.value || !loginCodeStudent.value) return
  const svg = qrContainerRef.value.querySelector('svg')
  if (!svg) return

  const student = loginCodeStudent.value
  const studentId = student.id
  const studentName = await resolveLoginCodeStudentName(student)
  const svgData = new XMLSerializer().serializeToString(svg)
  const canvas = document.createElement('canvas')
  const width = 400
  const height = 520
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const img = new Image()
  img.onload = () => {
    const qrSize = 180
    const horizontalPadding = 24
    const nameY = 40
    const qrY = studentName ? 64 : 40
    const codeY = qrY + qrSize + 44

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    if (studentName) {
      ctx.fillStyle = '#334155'
      ctx.font = '600 18px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        truncateCanvasText(ctx, studentName, width - horizontalPadding * 2),
        width / 2,
        nameY,
      )
    }

    ctx.drawImage(img, (width - qrSize) / 2, qrY, qrSize, qrSize)

    ctx.fillStyle = '#64748b'
    ctx.font = '500 12px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(t('pila-login-code'), width / 2, codeY - 18)
    const secret = users[studentId]?.secret || ''
    const glyphs = [...secret].map(ch => glyphForCodeChar(ch)).join('  ')
    ctx.fillStyle = '#334155'
    ctx.font = '600 22px system-ui, sans-serif'
    ctx.fillText(glyphs, width / 2, codeY + 16)

    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `login-${studentId.slice(0, 8)}.png`
      a.click()
      URL.revokeObjectURL(url)
    })
  }
  img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
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
    showSuccessDialog(
      t('password-reset-successfully'),
      t('new-login-code-is-ready'),
      () => { loginCodeStudent.value = { id: studentId } }
    )
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    resettingPassword.value = false
  }
}

async function executeArchiveSelected() {
  const toArchive = selectedActiveStudents.value
  if (!toArchive.length) {
    archiveSelectedConfirm.value = false
    return
  }
  const usersState = await Agent.state('users')
  for (const s of toArchive) {
    if (usersState[s.id]) usersState[s.id].archived = true
  }
  await Agent.synced()
  archiveSelectedConfirm.value = false
  selectedStudents.value = []
  showSuccessDialog(t('students-archived-successfully'))
}

async function executeRestoreSelected() {
  const toRestore = selectedArchivedStudents.value
  if (!toRestore.length) {
    restoreSelectedConfirm.value = false
    return
  }
  const usersState = await Agent.state('users')
  for (const s of toRestore) {
    if (usersState[s.id]) usersState[s.id].archived = false
  }
  await Agent.synced()
  restoreSelectedConfirm.value = false
  selectedStudents.value = []
  showSuccessDialog(t('students-restored-successfully'))
}

function confirmRestoreStudent(item) {
  restoreConfirmStudent.value = item
}

async function executeRestoreStudent() {
  if (!restoreConfirmStudent.value) return
  await toggleArchiveStudent(restoreConfirmStudent.value)
  restoreConfirmStudent.value = null
}

function confirmRestoreGroup(id) {
  restoreConfirmGroup.value = id
}

async function executeRestoreGroup() {
  if (!restoreConfirmGroup.value) return
  store.dispatch('groups/unarchive', restoreConfirmGroup.value)
  restoreConfirmGroup.value = null
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
    showLinkStudentModal.value = true
  }
}

async function handleAddStudentIndividual() {
  showAddStudentPicker.value = false
  selectedPickerOption.value = null
  if (!hasEncryptionKey.value) {
    showNamePasswordModal.value = true
    return
  }
  // Always show consent step before create (not once-per-teacher)
  pendingAfterAgreement.value = 'individual'
  showAcceptStudentAgreementModal.value = true
}

function openCreateStudentForm() {
  newStudentName.value = ''
  newStudentNickname.value = ''
  newStudentGrade.value = ''
  showCreateStudentForm.value = true
}

async function handleAddStudent() {
  if (!hasEncryptionKey.value) {
    showNamePasswordModal.value = true
    return
  }
  await createUserAndLaunchModal()
}

async function createStudentAccount() {
  // Consent already collected when opening the form (every create flow).
  const name = newStudentName.value.trim()
  if (!name) return
  const grade = newStudentGrade.value || ''
  // name + grade: hard dup confirm, soft (same name other grade) confirm, else create
  runStudentWithGuard(name, () => executeCreateStudentAccount(), grade)
}

async function executeCreateStudentAccount() {
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
    await Agent.synced()
    showCreateStudentForm.value = false
    newStudentName.value = ''
    newStudentNickname.value = ''
    newStudentGrade.value = ''
    showSuccessDialog(
      t('student-account-created'),
      null,
      () => { loginCodeStudent.value = { id } }
    )
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    creatingStudent.value = false
  }
}

/**
 * Consent accepted for this create action — resume pending flow.
 * Skip re-showing agreement (consentJustAccepted) so bulk/csv can proceed.
 */
const consentJustAccepted = ref(false)

function onAgreementAccepted() {
  showAcceptStudentAgreementModal.value = false
  const pending = pendingAfterAgreement.value
  pendingAfterAgreement.value = null
  consentJustAccepted.value = true
  if (pending === 'individual') {
    openCreateStudentForm()
    consentJustAccepted.value = false
    return
  }
  if (pending === 'bulk') {
    void handleBulkCreate().finally(() => { consentJustAccepted.value = false })
    return
  }
  if (pending === 'csv') {
    void handleCSVImport().finally(() => { consentJustAccepted.value = false })
    return
  }
  consentJustAccepted.value = false
}

/** User cancelled consent — do not create. */
function onAgreementModalClose() {
  showAcceptStudentAgreementModal.value = false
  // If agreed already cleared pending, leave alone; else cancel
  if (!consentJustAccepted.value) {
    pendingAfterAgreement.value = null
  }
}

// ── Bulk / SSO handlers ──

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

function parseCSVLine(line) {
  const cols = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cols.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cols.push(current.trim())
  return cols
}

function formatBulkCreateResultMessage(created, skipped) {
  if (skipped > 0) {
    const reason = t('bulk-duplicate-skipped-reason')
    return `${created} ${t('student')} ${t('created')}, ${skipped} ${t('skipped')} (${reason})`
  }
  return `${created} ${t('student')} ${t('created')}`
}

function parseCSVStudentRows(lines) {
  const header = lines[0].toLowerCase()
  const hasHeader = header.includes('name')
  const dataLines = hasHeader ? lines.slice(1) : lines
  const candidateRows = []
  let invalidSkipped = 0

  for (const line of dataLines) {
    const cols = parseCSVLine(line)
    const name = cols[0] || ''
    const nickname = cols[1] || ''
    const grade = cols[2] || ''
    if (!name.trim()) {
      invalidSkipped++
      continue
    }
    if (grade && !validGrades.has(grade)) {
      invalidSkipped++
      continue
    }
    candidateRows.push({ name, nickname, grade })
  }

  return { candidateRows, invalidSkipped }
}

async function executeCSVImport(rows, duplicateSkipped, invalidSkipped = 0) {
  importingCSV.value = true
  try {
    let created = 0
    let failed = 0
    for (const row of rows) {
      try {
        await createSingleStudent(row.name, row.nickname, row.grade)
        created++
      } catch (e) {
        console.error('Failed to create student from CSV row:', e)
        failed++
      }
    }
    if (created > 0) await Agent.synced()
    showCSVUploadModal.value = false
    csvFile.value = null
    const skipped = invalidSkipped + duplicateSkipped + failed
    const msg = formatBulkCreateResultMessage(created, skipped)
    if (created > 0) {
      showSuccessDialog(msg)
    } else {
      toastError(msg)
    }
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    importingCSV.value = false
  }
}

async function handleCSVImport() {
  if (!csvFile.value) return
  const providerSecret = localStorage.getItem(`zkek-${store.state.user}`)
  if (!providerSecret) {
    showCSVUploadModal.value = false
    showNamePasswordModal.value = true
    return
  }
  // Always require consent for this import (unless we just accepted for this action)
  if (!consentJustAccepted.value) {
    showCSVUploadModal.value = false
    pendingAfterAgreement.value = 'csv'
    showAcceptStudentAgreementModal.value = true
    return
  }
  try {
    const fileName = (csvFile.value?.name || '').toLowerCase()
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      toastError(
        t('excel-save-as-csv-first')
      )
      return
    }
    const text = await csvFile.value.text()
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) {
      toastError(t('something-went-wrong'))
      return
    }
    const { candidateRows, invalidSkipped } = parseCSVStudentRows(lines)
    await ensureDecryptedStudentNames()
    const partition = partitionBulkStudentRows(candidateRows, getStudentExistingRoster())
    promptBulkDuplicates(partition, (toCreate, duplicateSkipped) =>
      executeCSVImport(toCreate, duplicateSkipped, invalidSkipped),
    )
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  }
}

async function executeBulkCreate(rows, duplicateSkipped) {
  creatingBulk.value = true
  try {
    let created = 0
    for (const row of rows) {
      await createSingleStudent(row.name, row.nickname, row.grade)
      created++
    }
    if (created > 0) await Agent.synced()
    showBulkEntryModal.value = false
    bulkEntryRows.value = [
      { name: '', nickname: '', grade: '' },
      { name: '', nickname: '', grade: '' },
      { name: '', nickname: '', grade: '' },
    ]
    const msg = formatBulkCreateResultMessage(created, duplicateSkipped)
    if (created > 0) {
      showSuccessDialog(msg)
    } else {
      toastError(msg)
    }
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
  } finally {
    creatingBulk.value = false
  }
}

async function handleBulkCreate() {
  const providerSecret = localStorage.getItem(`zkek-${store.state.user}`)
  if (!providerSecret) {
    showBulkEntryModal.value = false
    showNamePasswordModal.value = true
    return
  }
  // Always require consent for this bulk create (unless we just accepted for this action)
  if (!consentJustAccepted.value) {
    showBulkEntryModal.value = false
    pendingAfterAgreement.value = 'bulk'
    showAcceptStudentAgreementModal.value = true
    return
  }
  const rows = bulkEntryRows.value.filter(r => r.name.trim() && r.grade)
  if (!rows.length) return
  await ensureDecryptedStudentNames()
  const partition = partitionBulkStudentRows(rows, getStudentExistingRoster())
  promptBulkDuplicates(partition, executeBulkCreate)
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

const filteredGroupsForAssign = computed(() => {
  let groups = activeGroups.value
  if (groupSearchQuery.value) {
    const q = groupSearchQuery.value.toLowerCase()
    groups = groups.filter(gid => {
      const name = store.state.groups.groups[gid]?.name || ''
      return name.toLowerCase().includes(q)
    })
  }
  return sortGroupIds(groups)
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
    const studentsToAdd = selectedStudents.value.filter(s => !s.archived)
    const members = []
    for (const gid of selectedGroupsForAssign.value) {
      for (const student of studentsToAdd) {
        members.push({ user_id: student.id, group_id: gid })
      }
    }
    const { added, skipped } = await store.dispatch('groups/addMembersBulk', { members })
    showAddToGroupsModal.value = false
    selectedGroupsForAssign.value = []
    groupSearchQuery.value = ''
    addToGroupsResults.value = [{
      summary: true,
      added,
      skipped,
    }]
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

function studentDragLabel(item) {
  return item?.displayName || t('student')
}

function formatStudentDragCount(count) {
  return count === 1
    ? `1 ${t('student')}`
    : `${count} ${t('students')}`
}

/** Drop from student table → group card (supports multi-select drag). */
async function handleDropStudent(groupId, studentIds) {
  const ids = (Array.isArray(studentIds) ? studentIds : [studentIds]).filter(Boolean)
  if (!ids.length) return

  let added = 0
  let skipped = 0
  try {
    const result = await store.dispatch('groups/addMembersBulk', {
      members: ids.map(studentId => ({ user_id: studentId, group_id: groupId })),
    })
    added = result.added
    skipped = result.skipped
  } catch (e) {
    console.error(e)
    toastError(t('something-went-wrong'))
    return
  }

  const groupName = store.state.groups.groups[groupId]?.name || t('unnamed')
  showSuccessDialog(
    t('students-added-skipped-summary')
      .replace('{added}', String(added))
      .replace('{skipped}', String(skipped)),
    groupName,
  )
}

function handlePrintGroupLoginCodes(groupId) {
  const memberIds = store.getters['groups/members'](groupId)
  if (!memberIds.length) {
    toastError(t('no-students-in-group'))
    return
  }
  const withCodes = memberIds.filter(id => users[id]?.secret && !users[id]?.archived)
  if (!withCodes.length) {
    toastError(t('no-active-users-with-login-codes'))
    return
  }
  openLoginCodesPage(withCodes)
}

function printLoginCodes() {
  const ids = selectedStudents.value
    .filter(s => users[s.id]?.secret && !users[s.id]?.archived)
    .map(s => s.id)
  if (!ids.length) {
    toastError(t('no-active-users-with-login-codes'))
    return
  }
  openLoginCodesPage(ids)
}

function openLoginCodesPage(studentIds) {
  const q = new URLSearchParams()
  if (studentIds?.length) q.set('students', studentIds.join(','))
  const lang = store.getters.language()
  if (lang) q.set('lang', lang)
  window.open(`/teacher/codes?${q.toString()}`)
}
</script>

<style scoped>
.admin-page {
}

.admin-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

/* Student section (left) */
.student-section {
  box-sizing: border-box;
  flex: 0 0 auto;
  width: calc(100% - 333px);
  min-width: 0;
  transition: width 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.admin-layout--groups-expanded .student-section {
  width: 360px;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  min-width: 0;
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1 1 160px;
}

.table-row-archived {
  opacity: 0.85;
  background: #fffbeb;
}

.selected-group-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.selected-group-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--color-primary-50);
  color: var(--color-primary-800);
  font-size: 13px;
}

.chip-remove {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: inherit;
  padding: 0 2px;
}

.group-list-pagination {
  margin-top: 8px;
}

.section-icon {
  font-size: 16px;
  color: var(--color-primary-600);
}

.section-header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  flex: 1 1 220px;
}

.section-header-actions :deep(.btn) {
  white-space: normal;
  height: auto;
  min-height: 32px;
  line-height: 1.25;
  max-width: 100%;
}

.search-and-filters {
  margin-bottom: 12px;
}

.group-filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-sort {
  width: 100%;
}

.admin-layout--groups-expanded .group-filters {
  flex-direction: row;
  align-items: flex-start;
}

.admin-layout--groups-expanded .group-sort {
  width: 200px;
  flex-shrink: 0;
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
  min-width: 0;
}
.student-archived-badge {
  flex-shrink: 0;
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

/* Group section (right) */
.group-section {
  box-sizing: border-box;
  flex: 0 0 auto;
  width: 317px;
  min-width: 0;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  transition: width 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.admin-layout--groups-expanded .group-section {
  width: calc(100% - 376px);
}

.group-search-wrap {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.group-search-divider {
  height: 1px;
  background: #e2e8f0;
}

.group-search-input {
  height: 32px;
}

.group-section-header {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  min-width: 0;
}
.group-section-header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.group-expand-btn {
  flex-shrink: 0;
}
.group-add-btn {
  width: 100%;
}
.group-add-btn :deep(.btn) {
  width: 100%;
  justify-content: center;
}
.admin-layout--groups-expanded .group-section-header {
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.admin-layout--groups-expanded .group-section-header-top {
  flex: 1;
  min-width: 0;
}
.admin-layout--groups-expanded .group-add-btn,
.admin-layout--groups-expanded .group-add-btn :deep(.btn) {
  width: auto;
}

.group-section-header,
.group-filters,
.group-list-pagination {
  flex-shrink: 0;
}

.group-cards-scroll {
  overflow-x: hidden;
  overflow-y: auto;
  max-height: calc(100vh - 18rem);
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.group-cards-scroll::-webkit-scrollbar {
  display: none;
}

.group-cards-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.group-cards-list--split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  align-content: start;
}
.group-cards-list--split > * {
  min-width: 0;
}
.group-cards-list--split > :deep(.group-card) {
  min-width: 0;
}

.no-results-text {
  font-size: 13px;
  color: var(--color-slate-400);
  text-align: center;
  padding: 24px 0;
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

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
}
.profile-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

/* Pill hugs label text — avoid stretch from flex column parent */
.profile-status-badge {
  align-self: flex-start;
  width: fit-content;
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
  padding: 10px 10px;
  border-bottom: 1px solid var(--color-slate-200);
  white-space: nowrap;
}
.bulk-entry-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #f1f5f9;
}
.bulk-input {
  width: 100%;
  font-size: 13px;
  padding: 8px 12px;
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
.required-label {
  color: #dc2626;
  font-weight: 500;
  font-size: 11px;
}

/* Encryption key missing banner (UIUX-91) */
.encryption-key-banner {
  margin-bottom: 12px;
}
.encryption-key-banner-body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.encryption-key-banner-cta {
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-weight: 600;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
  white-space: nowrap;
}
.encryption-key-banner-cta:hover {
  opacity: 0.85;
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
.assign-group-type-icon {
  flex-shrink: 0;
  color: #64748b;
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
.assign-group-detail--subject {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  justify-content: center;
  gap: 8px;
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
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
.passphrase-label-secondary {
  margin-top: 8px;
}
.login-code-plain-text {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.12em;
  font-family: ui-monospace, monospace;
  color: #334155;
}
.passphrase-icons {
  display: flex;
  align-items: center;
  gap: 8px;
}
.passphrase-icon {
  font-size: 20px;
  color: #334155;
}

/* Tablet: stack students + groups before header buttons overflow the column */
@media (max-width: 1200px) {
  .admin-layout {
    flex-direction: column;
  }

  .student-section,
  .admin-layout--groups-expanded .student-section {
    width: 100%;
  }

  .group-section,
  .admin-layout--groups-expanded .group-section {
    width: 100%;
    max-height: min(70vh, calc(100vh - 40px));
  }
}

/* Mobile responsive */
@media (max-width: 1023px) {
  .admin-page {
    padding: 16px;
  }

  .admin-layout {
    flex-direction: column;
  }

  .student-section,
  .admin-layout--groups-expanded .student-section {
    width: 100%;
  }

  .group-section,
  .admin-layout--groups-expanded .group-section {
    width: 100%;
    max-height: min(70vh, calc(100vh - 40px));
  }

  .section-header {
    flex-direction: column;
    gap: 8px;
  }

  .section-header-actions {
    align-self: stretch;
    justify-content: flex-start;
    flex: 1 1 auto;
    width: 100%;
  }

  .group-cards-list:not(.group-cards-list--split) {
    flex-direction: row;
    overflow-x: auto;
    gap: 12px;
    padding-bottom: 4px;
  }

  .group-cards-list:not(.group-cards-list--split) > :deep(.group-card) {
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

@media (prefers-reduced-motion: reduce) {
  .student-section,
  .group-section {
    transition: none;
  }
}

/* Add to Groups result tiles */
.result-tile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  width: 100%;
}

.result-tile-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-tile-name {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
}

.result-tile-grade {
  font-size: 12px;
  color: #64748b;
}

.result-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.result-badge-added {
  background: #f0fdf4;
  border: 1px solid #16a34a;
  color: #16a34a;
}

.result-badge-skipped {
  background: #fefce8;
  border: 1px solid #ca8a04;
  color: #ca8a04;
}

.result-skipped-box {
  border: 1px solid #ca8a04;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.result-skipped-warning {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 14px;
  font-weight: 500;
  color: #ca8a04;
}
</style>
