<template>
  <h1>Researcher</h1>
  <div v-if="$store.getters['roles/hasPermission']($store.state.user, 'researcher')">
    <div>
      <button @click="tab = 'teacher-groups'">Teacher Groups</button>
      <button @click="tab = 'content'">Content</button>
      <button @click="tab = 'files'">Files</button>
      <button @click="tab = 'studies'">Studies</button>
    </div>
    <Groups
      v-if="tab === 'teacher-groups'"
      type="teachers"
      :possibleMembers="teachers"
    />
    <div v-if="tab === 'content'">
      <ContentLibrary />
    </div>
    <div v-if="tab === 'files'">
      <Files />
    </div>
    <AssignmentsFromMe
      v-if="tab === 'studies'"
      assignable_item_type="researcher-created"
      assignment_type="researcher-to-teacher"
    />
  </div>
  <RoleRequester v-else role="researcher" />
</template>

<script>
  import Groups from '../../components/groups/viewer.vue'
  import RoleRequester from '../../components/roles/requester.vue'
  import Files from '../../components/files.vue'
  import AssignmentsFromMe from '../../assignments/from-me/all.vue'

  import ContentLibrary from '../../components/content-library.vue'

  export default {
    components: {
      Groups,
      ContentLibrary,
      Files,
      RoleRequester,
      AssignmentsFromMe
    },
    data() {
      return {
        tab: 'teacher-groups'
      }
    },
    computed: {
      teachers() {
        return this.$store.getters['roles/usersWithRole']('teacher')
      }
    }
  }
</script>
