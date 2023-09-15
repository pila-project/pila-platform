<template>
  <h1>Teacher</h1>
  <div v-if="$store.getters['roles/hasPermission']($store.state.user, 'teacher')">
    <div>
      <button @click="tab = 'classes'">Classes</button>
      <button @click="tab = 'content'">Content</button>
      <button @click="tab = 'assignments-from-me'">Assignments</button>
      <button @click="tab = 'assignments-to-me'">Studies</button>
    </div>
    <Groups
      v-if="tab === 'classes'"
      type="class"
      :possibleMembers="students"
    />
    <div v-if="tab === 'content'">
      <ContentLibrary />
    </div>
    <AssignmentsFromMe
      v-if="tab === 'assignments-from-me'"
      assignable_item_type="teacher-created"
      assignment_type="teacher-to-student"
    />
    <AssignmentsToMe
      v-if="tab === 'assignments-to-me'"
      type="researcher-to-teacher"
    />
  </div>
  <RoleRequester v-else role="teacher" />
</template>

<script>
  import RoleRequester from '../../components/roles/requester.vue'
  import Groups from '../../components/groups/viewer.vue'
  import ContentLibrary from '../../components/content-library.vue'
  import AssignmentsToMe from '../../assignments/to-me/all.vue'
  import AssignmentsFromMe from '../../assignments/from-me/all.vue'

  export default {
    components: {
      Groups,
      ContentLibrary,
      RoleRequester,
      AssignmentsFromMe,
      AssignmentsToMe
    },
    data() {
      const { getters, state: { user } } = this.$store
      console.log('USER', user)
      return {
        tab: 'classes',
        // students are anybody who has added you to a group of type "teachers"
        students: (
          getters['groups/groups']('my-teachers')
            .filter(gid => getters['groups/belongs'](user, gid))
            .map(gid => getters['groups/owner'](gid))
        )
      }
    }
  }
</script>
