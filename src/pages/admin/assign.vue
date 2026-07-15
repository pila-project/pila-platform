<template>
  <v-container>
    <div class="text-h3 mb-6">
      Assign
    </div>

    <v-row>
      <v-col cols="12" md="5">
        <v-card class="mb-4">
          <v-card-title>Teacher-level content</v-card-title>
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis">
              Select content imported in the Content tab, then choose which teachers should receive it.
            </p>
          </v-card-text>
        </v-card>

        <v-progress-linear v-if="loadingContent" indeterminate />
        <v-alert v-else-if="contentLoadError" type="error" variant="tonal">
          <div>{{ contentLoadError }}</div>
          <v-btn class="mt-2" size="small" variant="text" @click="fetchAdminContent">
            Retry
          </v-btn>
        </v-alert>
        <div v-else-if="!adminContent.length" class="text-medium-emphasis">
          Add content in the Content tab first.
        </div>
        <v-row v-else>
          <v-col
            v-for="id in adminContent"
            :key="id"
            cols="12"
          >
            <TaggedContentCard
              :id="id"
              :selected="selectedContent === id"
              :removable="false"
              @click="selectedContent = id"
              @preview="previewing = id"
            />
          </v-col>
        </v-row>
      </v-col>

      <v-col class="assignment-column" cols="12" md="7">
        <v-card class="assignment-card">
          <v-card-title>Assign to teachers</v-card-title>
          <v-card-text v-if="!selectedContent" class="text-medium-emphasis">
            Select content to manage teacher assignments.
          </v-card-text>
          <v-card-text v-else>
            <v-progress-linear v-if="loadingTeachers || loadingAssignments" indeterminate />
            <v-alert v-else-if="teacherLoadError" type="error" variant="tonal">
              <div>{{ teacherLoadError }}</div>
              <v-btn class="mt-2" size="small" variant="text" @click="retryTeachers">
                Retry
              </v-btn>
            </v-alert>
            <div v-else-if="!teachers.length" class="text-medium-emphasis">
              No approved teachers found.
            </div>
            <template v-else>
              <v-alert
                v-if="assignmentLoadError"
                class="mb-4"
                type="error"
                variant="tonal"
              >
                <div>{{ assignmentLoadError }}</div>
                <v-btn
                  class="mt-2"
                  size="small"
                  variant="text"
                  @click="refreshTeacherAssignments"
                >
                  Retry
                </v-btn>
              </v-alert>

              <p class="text-body-2 text-medium-emphasis mb-4">
                Start and end are optional and use your local time. Each change overrides the latest change from any admin.
              </p>

              <v-alert
                v-if="bulkAssignmentError"
                class="mb-4"
                type="error"
                variant="tonal"
                closable
                @click:close="bulkAssignmentError = ''"
              >
                {{ bulkAssignmentError }}
              </v-alert>

              <div class="assign-all-control mb-4">
                <v-btn
                  color="primary"
                  prepend-icon="fa-solid fa-users"
                  :loading="assigningAllTeachers"
                  :disabled="!canAssignAllTeachers"
                  @click="assignAllTeachers"
                >
                  Assign to all current teachers
                </v-btn>
                <span class="text-caption text-medium-emphasis">
                  {{ assignAllStatus }}
                </span>
              </div>

              <v-table class="assignment-table">
                <thead>
                  <tr>
                    <th>Assigned</th>
                    <th>Teacher</th>
                    <th>User ID</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="teacher in teachers" :key="teacher">
                    <td>
                      <div class="assignment-toggle-cell">
                        <v-progress-circular
                          v-if="isUpdating(teacher)"
                          indeterminate
                          size="24"
                          width="3"
                          color="primary"
                        />
                        <v-checkbox
                          v-else
                          hide-details
                          density="compact"
                          color="primary"
                          :model-value="isTeacherAssigned(teacher)"
                          :disabled="!assignmentsReady || assigningAllTeachers"
                          :aria-label="assignmentToggleLabel(teacher)"
                          @update:model-value="assigned => toggleTeacherAssignment(teacher, assigned)"
                        />
                        <div class="assignment-status">
                          <span class="text-caption text-medium-emphasis">
                            {{ assignmentStatus(teacher) }}
                          </span>
                          <span
                            v-if="winningGrants[teacher]"
                            class="text-caption text-medium-emphasis"
                          >
                            {{ grantOwnerLabel(winningGrants[teacher]) }}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <DecryptedName
                        avatar
                        :user="teacher"
                      />
                    </td>
                    <td>{{ teacher }}</td>
                    <td>
                      <DateTimePicker
                        :model-value="scheduleDraftFor(teacher).starts_at"
                        :label="`Start time for ${teacher}`"
                        :disabled="scheduleDisabled(teacher)"
                        @update:model-value="value => setScheduleField(teacher, 'starts_at', value)"
                      />
                    </td>
                    <td>
                      <DateTimePicker
                        :model-value="scheduleDraftFor(teacher).ends_at"
                        :label="`End time for ${teacher}`"
                        :disabled="scheduleDisabled(teacher)"
                        @update:model-value="value => setScheduleField(teacher, 'ends_at', value)"
                      />
                    </td>
                    <td class="assignment-actions-cell">
                      <v-btn
                        size="small"
                        color="primary"
                        variant="tonal"
                        :loading="isUpdating(teacher)"
                        :disabled="!canSaveSchedule(teacher)"
                        @click="saveSchedule(teacher)"
                      >
                        Save dates
                      </v-btn>
                      <div
                        v-if="draftValidationError(teacher)"
                        class="text-caption text-error mt-1"
                      >
                        {{ draftValidationError(teacher) }}
                      </div>
                      <div
                        v-else-if="teacherErrors[teacher]"
                        class="text-caption text-error mt-1"
                      >
                        {{ teacherErrors[teacher] }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </template>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <PreviewModal
      v-if="previewing"
      :id="previewing"
      width="90vw"
      height="90vh"
      @close="previewing = null"
    />
  </v-container>
</template>

<script setup>
  import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
  import { useStore } from 'vuex'
  import DateTimePicker from '../../components/date-time-picker.vue'
  import DecryptedName from '../../components/decrypted-name.vue'
  import PreviewModal from '../../components/PreviewModal.vue'
  import TaggedContentCard from '../../components/tagged-content-card.vue'
  import {
    adminTeacherGrantsForContent,
    isAdminContentTagged,
    mergeAdminTeacherGrant,
    writeAdminTeacherGrant
  } from '../../admin-teacher-grants.js'
  import { ADMIN_CONTENT_TAG, TEACHER_TAG } from '../../constants.js'

  const store = useStore()
  const partition = store.getters.tagPartition
  const currentUser = store.state.user

  const adminContent = ref([])
  const selectedContent = ref(null)
  const previewing = ref(null)
  const teachers = ref([])
  const loadingContent = ref(true)
  const loadingTeachers = ref(true)
  const loadingAssignments = ref(false)
  const contentLoadError = ref('')
  const teacherLoadError = ref('')
  const assignmentLoadError = ref('')
  const bulkAssignmentError = ref('')
  const loadedAssignmentsForContent = ref(null)
  const assigningAllTeachers = ref(false)
  const updatingTeachers = reactive({})
  const teacherErrors = reactive({})
  const winningGrants = reactive({})
  const scheduleDrafts = reactive({})
  let assignmentRefreshId = 0
  let initializing = true
  let backgroundRefreshInFlight = false
  let backgroundRefreshTimer = null

  const assignmentsReady = computed(() => (
    !loadingAssignments.value
    && !assignmentLoadError.value
    && loadedAssignmentsForContent.value === selectedContent.value
  ))

  const unassignedTeachers = computed(() => (
    teachers.value.filter(teacherId => !isTeacherAssigned(teacherId))
  ))

  const canAssignAllTeachers = computed(() => (
    assignmentsReady.value
    && !assigningAllTeachers.value
    && unassignedTeachers.value.length > 0
    && Object.keys(updatingTeachers).length === 0
  ))

  const assignAllStatus = computed(() => {
    const count = unassignedTeachers.value.length
    if (!count) return 'All current teachers are assigned.'
    return `${count} current teacher${count === 1 ? '' : 's'} will be assigned.`
  })

  watch(selectedContent, () => {
    clearReactiveRecord(teacherErrors)
    bulkAssignmentError.value = ''
    if (!initializing) void refreshTeacherAssignments()
  })

  void initialize()

  onMounted(() => {
    backgroundRefreshTimer = window.setInterval(() => {
      const canRefresh = !initializing
        && !!selectedContent.value
        && !loadingAssignments.value
        && !backgroundRefreshInFlight
        && Object.keys(updatingTeachers).length === 0

      if (!canRefresh) return

      backgroundRefreshInFlight = true
      void refreshTeacherAssignments({ background: true })
        .finally(() => backgroundRefreshInFlight = false)
    }, 10_000)
  })

  onBeforeUnmount(() => {
    if (backgroundRefreshTimer) window.clearInterval(backgroundRefreshTimer)
  })

  async function initialize() {
    await Promise.all([fetchAdminContent(), fetchTeachers()])
    initializing = false
    await refreshTeacherAssignments()
  }

  function isUpdating(teacherId) {
    return !!updatingTeachers[teacherId]
  }

  function isTeacherAssigned(teacherId) {
    const grant = winningGrants[teacherId]
    return !!grant && grant.archived === false
  }

  function assignmentToggleLabel(teacherId) {
    return `${isTeacherAssigned(teacherId) ? 'Cancel' : 'Assign'} content for ${teacherId}`
  }

  function assignmentStatus(teacherId) {
    if (isUpdating(teacherId)) return 'Saving...'
    if (!winningGrants[teacherId]) return 'Not assigned'
    return isTeacherAssigned(teacherId) ? 'Assigned' : 'Cancelled'
  }

  function grantOwnerLabel(grant) {
    const owner = grant.assigned_by === currentUser ? 'you' : grant.assigned_by
    const updated = formatUpdated(grant.updated)
    return `Last changed by ${owner}${updated ? ` ${updated}` : ''}`
  }

  function formatUpdated(value) {
    if (!value) return ''
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
  }

  function scheduleDisabled(teacherId) {
    return !assignmentsReady.value
      || assigningAllTeachers.value
      || isUpdating(teacherId)
  }

  function scheduleDraftFor(teacherId) {
    if (!scheduleDrafts[teacherId]) {
      scheduleDrafts[teacherId] = createScheduleDraft(winningGrants[teacherId])
    }
    return scheduleDrafts[teacherId]
  }

  function createScheduleDraft(grant) {
    const startsAt = toDateTimeLocal(grant?.starts_at)
    const endsAt = toDateTimeLocal(grant?.ends_at)
    return {
      starts_at: startsAt,
      ends_at: endsAt,
      original_starts_at: startsAt,
      original_ends_at: endsAt,
      dirty_starts_at: false,
      dirty_ends_at: false
    }
  }

  function setScheduleField(teacherId, field, value) {
    const draft = scheduleDraftFor(teacherId)
    draft[field] = value || ''
    draft[`dirty_${field}`] = draft[field] !== draft[`original_${field}`]
    delete teacherErrors[teacherId]
  }

  function scheduleHasChanges(teacherId) {
    const draft = scheduleDraftFor(teacherId)
    return draft.dirty_starts_at || draft.dirty_ends_at
  }

  function canSaveSchedule(teacherId) {
    return !scheduleDisabled(teacherId)
      && !!winningGrants[teacherId]
      && scheduleHasChanges(teacherId)
      && !draftValidationError(teacherId)
  }

  function draftValidationError(teacherId) {
    const draft = scheduleDraftFor(teacherId)
    return dateRangeError(draft.starts_at, draft.ends_at, dateInputToTimestamp)
  }

  async function toggleTeacherAssignment(teacherId, assigned) {
    const changes = { archived: !assigned }

    if (assigned) {
      try {
        Object.assign(changes, scheduleChanges(teacherId))
      } catch (error) {
        teacherErrors[teacherId] = error.message
        return
      }
    }

    await mutateGrant(
      teacherId,
      changes,
      assigned ? 'assign this content' : 'cancel this assignment'
    )
  }

  async function saveSchedule(teacherId) {
    let changes
    try {
      changes = scheduleChanges(teacherId)
    } catch (error) {
      teacherErrors[teacherId] = error.message
      return
    }

    if (!Object.keys(changes).length) return
    await mutateGrant(teacherId, changes, 'save these dates')
  }

  async function assignAllTeachers() {
    if (!canAssignAllTeachers.value) return

    const contentId = selectedContent.value
    let bulkTeacherIds = []
    assigningAllTeachers.value = true
    bulkAssignmentError.value = ''

    try {
      if (!(await isAdminContent(contentId))) {
        await handleRemovedContent(contentId)
      }

      const latestGrants = await queryWinningGrants(contentId)
      const latestByTeacher = Object.fromEntries(
        latestGrants.map(grant => [grant.teacher_id, grant])
      )
      const teacherIds = teachers.value.filter(teacherId => (
        latestByTeacher[teacherId]?.archived !== false
      ))
      bulkTeacherIds = teacherIds

      if (!teacherIds.length) {
        await refreshTeacherAssignments({ background: true })
        return
      }

      teacherIds.forEach(teacherId => {
        updatingTeachers[teacherId] = true
        delete teacherErrors[teacherId]
      })

      const results = await Promise.allSettled(
        teacherIds.map(teacherId => writeAdminTeacherGrant(
          Agent,
          mergeAdminTeacherGrant(
            latestByTeacher[teacherId],
            teacherId,
            contentId,
            { archived: false }
          )
        ))
      )

      await Agent.synced()

      if (!(await isAdminContent(contentId))) {
        await handleRemovedContent(contentId)
      }

      const failedTeacherIds = []
      results.forEach((result, index) => {
        const teacherId = teacherIds[index]
        if (result.status === 'rejected') {
          failedTeacherIds.push(teacherId)
          teacherErrors[teacherId] = actionableError('assign this content', result.reason)
        } else {
          delete scheduleDrafts[teacherId]
        }
      })

      if (selectedContent.value === contentId) {
        const refreshed = await refreshTeacherAssignments({ background: true })
        if (!refreshed) {
          throw new Error('Some changes may have saved, but the current assignments could not be reloaded.')
        }
      }

      if (failedTeacherIds.length) {
        const count = failedTeacherIds.length
        if (selectedContent.value === contentId) {
          bulkAssignmentError.value = `${count} teacher${count === 1 ? '' : 's'} could not be assigned. Review the affected rows and try again.`
        }
      }
    } catch (error) {
      console.warn('Unable to assign content to all current teachers.', error)
      if (selectedContent.value === contentId) {
        bulkAssignmentError.value = actionableError(
          'assign content to all current teachers',
          error
        )
      }
    } finally {
      bulkTeacherIds.forEach(teacherId => delete updatingTeachers[teacherId])
      assigningAllTeachers.value = false
    }
  }

  function scheduleChanges(teacherId) {
    const draft = scheduleDraftFor(teacherId)
    const rangeError = draftValidationError(teacherId)
    if (rangeError) throw new Error(rangeError)

    const changes = {}
    if (draft.dirty_starts_at) {
      changes.starts_at = dateInputToTimestamp(draft.starts_at)
    }
    if (draft.dirty_ends_at) {
      changes.ends_at = dateInputToTimestamp(draft.ends_at)
    }
    return changes
  }

  async function mutateGrant(teacherId, changes, action) {
    if (assigningAllTeachers.value || isUpdating(teacherId)) return

    const contentId = selectedContent.value
    if (!contentId) return

    updatingTeachers[teacherId] = true
    delete teacherErrors[teacherId]

    try {
      if (!(await isAdminContent(contentId))) {
        await handleRemovedContent(contentId)
      }

      // Always merge the intended change into the latest winner, not the row
      // that happened to be visible when the admin started editing.
      const winner = await fetchWinningGrant(contentId, teacherId)
      const nextGrant = mergeAdminTeacherGrant(
        winner,
        teacherId,
        contentId,
        changes
      )

      const rangeError = persistedDateRangeError(nextGrant.starts_at, nextGrant.ends_at)
      if (rangeError) throw new Error(rangeError)

      await writeAdminTeacherGrant(Agent, nextGrant)
      await Agent.synced()

      if (!(await isAdminContent(contentId))) {
        await handleRemovedContent(contentId)
      }

      if (selectedContent.value === contentId) {
        delete scheduleDrafts[teacherId]
        const refreshed = await refreshTeacherAssignments({ background: true })
        if (!refreshed) {
          throw new Error('The change may have saved, but the current assignments could not be reloaded. Retry the assignment list before making another change.')
        }
      }
    } catch (error) {
      console.warn(`Unable to ${action} for teacher ${teacherId}.`, error)
      teacherErrors[teacherId] = actionableError(action, error)
    } finally {
      delete updatingTeachers[teacherId]
    }
  }

  async function fetchWinningGrant(contentId, teacherId) {
    const grants = await queryWinningGrants(contentId)
    return grants.find(grant => grant.teacher_id === teacherId) || null
  }

  async function refreshTeacherAssignments({ background = false } = {}) {
    const refreshId = ++assignmentRefreshId
    const contentId = selectedContent.value

    if (!contentId || !teachers.value.length) {
      clearReactiveRecord(winningGrants)
      clearReactiveRecord(scheduleDrafts)
      assignmentLoadError.value = ''
      loadedAssignmentsForContent.value = contentId
      loadingAssignments.value = false
      return true
    }

    const contentChanged = loadedAssignmentsForContent.value !== contentId
    if (!background) loadedAssignmentsForContent.value = null
    if (!background) assignmentLoadError.value = ''
    if (!background) loadingAssignments.value = true

    if (contentChanged) {
      clearReactiveRecord(winningGrants)
      clearReactiveRecord(scheduleDrafts)
    }

    try {
      const grants = await queryWinningGrants(contentId)
      if (refreshId !== assignmentRefreshId) return true

      assignmentLoadError.value = ''
      replaceWinningGrants(grants)
      syncScheduleDrafts()
      loadedAssignmentsForContent.value = contentId
      return true
    } catch (error) {
      if (refreshId !== assignmentRefreshId) return true
      console.warn(`Unable to load assignments for content ${contentId}.`, error)
      if (!background) {
        assignmentLoadError.value = actionableError('load assignments', error)
      }
      return false
    } finally {
      if (refreshId === assignmentRefreshId && !background) {
        loadingAssignments.value = false
      }
    }
  }

  async function queryWinningGrants(contentId) {
    return adminTeacherGrantsForContent(Agent, contentId)
  }

  async function isAdminContent(contentId) {
    return isAdminContentTagged(Agent, partition, ADMIN_CONTENT_TAG, contentId)
  }

  async function handleRemovedContent(contentId) {
    await fetchAdminContent()
    throw new Error('This content was removed from the admin library. Its saved grants are currently inactive.')
  }

  function replaceWinningGrants(grants) {
    clearReactiveRecord(winningGrants)
    grants.forEach(grant => {
      if (grant.teacher_id) winningGrants[grant.teacher_id] = grant
    })
  }

  function syncScheduleDrafts() {
    const teacherSet = new Set(teachers.value)

    Object.keys(scheduleDrafts).forEach(teacherId => {
      if (!teacherSet.has(teacherId)) delete scheduleDrafts[teacherId]
    })

    teachers.value.forEach(teacherId => {
      const grant = winningGrants[teacherId]
      const latest = createScheduleDraft(grant)
      const existing = scheduleDrafts[teacherId]

      if (!existing) {
        scheduleDrafts[teacherId] = latest
        return
      }

      ;['starts_at', 'ends_at'].forEach(field => {
        if (!existing[`dirty_${field}`]) existing[field] = latest[field]
        existing[`original_${field}`] = latest[field]
        existing[`dirty_${field}`] = existing[field] !== latest[field]
      })
    })
  }

  function toDateTimeLocal(value) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    return localDate.toISOString().slice(0, 16)
  }

  function dateInputToTimestamp(value) {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) throw new Error('Enter a valid date and time.')
    return date.toISOString()
  }

  function persistedDateRangeError(startsAt, endsAt) {
    return dateRangeError(startsAt, endsAt, value => {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) throw new Error('The saved assignment contains an invalid date. Reload the page and try again.')
      return date.toISOString()
    })
  }

  function dateRangeError(startsAt, endsAt, normalize) {
    if (!startsAt || !endsAt) return ''
    try {
      if (new Date(normalize(startsAt)).getTime() >= new Date(normalize(endsAt)).getTime()) {
        return 'Start must be before end.'
      }
      return ''
    } catch (error) {
      return error.message
    }
  }

  function actionableError(action, error) {
    const detail = typeof error === 'string' ? error : error?.message
    return detail
      ? `Could not ${action}: ${detail}`
      : `Could not ${action}. Check your connection and try again.`
  }

  function clearReactiveRecord(record) {
    Object.keys(record).forEach(key => delete record[key])
  }

  async function fetchAdminContent() {
    loadingContent.value = true
    contentLoadError.value = ''
    try {
      adminContent.value = await Agent
        .query('taggings-for-tag', [partition, ADMIN_CONTENT_TAG], 'tags.knowlearning.systems')
        .then(taggings => taggings.map(({ target }) => target))

      if (!adminContent.value.includes(selectedContent.value)) {
        selectedContent.value = adminContent.value[0] || null
      }
    } catch (error) {
      console.warn('Unable to load admin content.', error)
      contentLoadError.value = actionableError('load content', error)
    } finally {
      loadingContent.value = false
    }
  }

  async function fetchTeachers() {
    loadingTeachers.value = true
    teacherLoadError.value = ''
    try {
      teachers.value = await Agent
        .query('taggings-for-tag', [partition, TEACHER_TAG], 'tags.knowlearning.systems')
        .then(taggings => taggings.map(({ target }) => target))
    } catch (error) {
      console.warn('Unable to load approved teachers.', error)
      teacherLoadError.value = actionableError('load approved teachers', error)
    } finally {
      loadingTeachers.value = false
    }
  }

  async function retryTeachers() {
    await fetchTeachers()
    if (!teacherLoadError.value) await refreshTeacherAssignments()
  }
</script>

<style scoped>
  .assignment-column,
  .assignment-card,
  .assignment-table {
    min-width: 0;
  }

  .assignment-table {
    max-width: 100%;
  }

  .assignment-table :deep(table) {
    min-width: 1120px;
  }

  .assign-all-control {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .assignment-toggle-cell {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 180px;
  }

  .assignment-status {
    display: flex;
    flex-direction: column;
    max-width: 180px;
  }

  .assignment-actions-cell {
    min-width: 180px;
    vertical-align: middle;
  }
</style>
