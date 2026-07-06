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

      <v-col cols="12" md="7">
        <v-card>
          <v-card-title>Assign to teachers</v-card-title>
          <v-card-text v-if="!selectedContent" class="text-medium-emphasis">
            Select content to manage teacher assignments.
          </v-card-text>
          <v-card-text v-else>
            <v-progress-linear v-if="loadingTeachers" indeterminate />
            <div v-else-if="!teachers.length" class="text-medium-emphasis">
              No approved teachers found.
            </div>
            <v-table v-else>
              <thead>
                <tr>
                  <th>Assigned</th>
                  <th>Teacher</th>
                  <th>User ID</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="teacher in teachers" :key="teacher">
                  <td>
                    <div class="assignment-toggle-cell">
                      <v-progress-circular
                        v-if="updatingTeachers[teacher]"
                        indeterminate
                        size="24"
                        width="3"
                        color="primary"
                      />
                      <v-checkbox
                        v-else
                        hide-details
                        density="compact"
                        :model-value="isTeacherAssigned(teacher)"
                        @update:model-value="assigned => toggleTeacherAssignment(teacher, assigned)"
                      />
                      <span
                        v-if="updatingTeachers[teacher]"
                        class="text-caption text-medium-emphasis"
                      >
                        Updating...
                      </span>
                    </div>
                  </td>
                  <td>
                    <DecryptedName
                      avatar
                      :user="teacher"
                    />
                  </td>
                  <td>{{ teacher }}</td>
                </tr>
              </tbody>
            </v-table>
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
  import { reactive, ref } from 'vue'
  import { v5 as uuidv5 } from 'uuid'
  import { useStore } from 'vuex'
  import DecryptedName from '../../components/decrypted-name.vue'
  import PreviewModal from '../../components/PreviewModal.vue'
  import TaggedContentCard from '../../components/tagged-content-card.vue'
  import getName from '../../name-and-translation-for-content.js'
  import { ADMIN_CONTENT_TAG, TEACHER_TAG } from '../../constants.js'

  const TEACHER_ASSIGNMENT_TYPE = 'researcher-to-teacher'
  const ASSIGNABLE_ITEM_TYPE = 'application/json;type=study'
  const TEACHER_ASSIGNMENT_GROUP_TYPE = 'teachers'
  const ASSIGNABLE_ITEM_NAMESPACE = 'f4ab946c-51b1-4be1-a74e-0c9ae0bfd8f1'
  const TEACHER_GROUP_NAMESPACE = 'bca03b3f-f702-4a23-b25c-551b44c729a1'

  const store = useStore()
  const partition = store.getters.tagPartition

  const adminContent = ref([])
  const selectedContent = ref(null)
  const previewing = ref(null)
  const teachers = ref([])
  const loadingContent = ref(true)
  const loadingTeachers = ref(true)
  const updatingTeachers = reactive({})
  const optimisticTeacherAssignments = reactive({})

  fetchAdminContent()
  fetchTeachers()

  function assignableItemId(contentId) {
    return uuidv5(contentId, ASSIGNABLE_ITEM_NAMESPACE)
  }

  function teacherGroupId(teacherId) {
    return uuidv5(`${partition}:${teacherId}`, TEACHER_GROUP_NAMESPACE)
  }

  function assignmentForTeacher(teacherId) {
    if (!selectedContent.value) return null

    const groupId = teacherGroupId(teacherId)
    const itemId = assignableItemId(selectedContent.value)
    return store
      .getters['assignments/assignments'](itemId, TEACHER_ASSIGNMENT_TYPE)
      .find(id => store.getters['assignments/get'](id).group_id === groupId)
  }

  function assignmentStateKey(teacherId) {
    return JSON.stringify([selectedContent.value, teacherId])
  }

  function hasOptimisticAssignment(teacherId) {
    return Object.prototype.hasOwnProperty.call(
      optimisticTeacherAssignments,
      assignmentStateKey(teacherId)
    )
  }

  function isTeacherAssigned(teacherId) {
    if (hasOptimisticAssignment(teacherId)) {
      return optimisticTeacherAssignments[assignmentStateKey(teacherId)]
    }

    return !!assignmentForTeacher(teacherId)
  }

  async function toggleTeacherAssignment(teacherId, assigned) {
    const nextAssigned = !!assigned
    const key = assignmentStateKey(teacherId)
    const hadOptimisticAssignment = hasOptimisticAssignment(teacherId)
    const previousOptimisticAssignment = optimisticTeacherAssignments[key]
    optimisticTeacherAssignments[key] = nextAssigned
    updatingTeachers[teacherId] = true

    try {
      const assignmentId = assignmentForTeacher(teacherId)
      if (!nextAssigned && assignmentId) {
        await store.dispatch('assignments/unassign', assignmentId)
      } else if (nextAssigned && !assignmentId) {
        const itemId = await ensureAssignableItem(selectedContent.value)
        const groupId = await ensureTeacherGroup(teacherId)
        await store.dispatch('assignments/assign', {
          group_id: groupId,
          item_id: itemId,
          assignment_type: TEACHER_ASSIGNMENT_TYPE
        })
      }
    } catch (error) {
      if (hadOptimisticAssignment) {
        optimisticTeacherAssignments[key] = previousOptimisticAssignment
      } else {
        delete optimisticTeacherAssignments[key]
      }
      console.warn(`Unable to update teacher assignment for ${teacherId}.`, error)
    } finally {
      updatingTeachers[teacherId] = false
    }
  }

  async function ensureAssignableItem(contentId) {
    const id = assignableItemId(contentId)
    const [item, metadata] = await Promise.all([
      Agent.state(id),
      Agent.metadata(id)
    ])

    if (metadata.active_type !== ASSIGNABLE_ITEM_TYPE) {
      metadata.active_type = ASSIGNABLE_ITEM_TYPE
    }

    item.content = contentId
    item.name ||= await contentName(contentId)
    item.description ||= ''
    item.files ||= []

    await Agent.synced()
    await store.dispatch('pila_tags/tag', {
      content_id: id,
      tag_type: 'admin-approved'
    })
    return id
  }

  async function ensureTeacherGroup(teacherId) {
    const groupId = teacherGroupId(teacherId)
    const name = await teacherName(teacherId)
    await store.dispatch('groups/add', {
      id: groupId,
      type: TEACHER_ASSIGNMENT_GROUP_TYPE,
      name
    })
    await store.dispatch('groups/addMember', {
      group_id: groupId,
      user_id: teacherId
    })
    return groupId
  }

  async function contentName(contentId) {
    try {
      return await getName(contentId, store.getters.language()) || 'Teacher task'
    } catch (error) {
      console.warn(`Unable to load content name for ${contentId}.`, error)
      return 'Teacher task'
    }
  }

  async function teacherName(teacherId) {
    try {
      const info = await store.getters.decryptUserInfo(teacherId)
      return info?.name || teacherId
    } catch (error) {
      console.warn(`Unable to load teacher name for ${teacherId}.`, error)
      return teacherId
    }
  }

  async function fetchAdminContent() {
    loadingContent.value = true
    adminContent.value = await Agent
      .query('taggings-for-tag', [partition, ADMIN_CONTENT_TAG], 'tags.knowlearning.systems')
      .then(taggings => taggings.map(({ target }) => target))
    if (!selectedContent.value && adminContent.value.length) {
      selectedContent.value = adminContent.value[0]
    }
    loadingContent.value = false
  }

  async function fetchTeachers() {
    loadingTeachers.value = true
    teachers.value = await Agent
      .query('taggings-for-tag', [partition, TEACHER_TAG], 'tags.knowlearning.systems')
      .then(taggings => taggings.map(({ target }) => target))
    loadingTeachers.value = false
  }
</script>

<style scoped>
  .assignment-toggle-cell {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 112px;
  }
</style>
