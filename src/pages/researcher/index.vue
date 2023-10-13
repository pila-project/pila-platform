<template>
  <div v-if="$store.getters['roles/hasPermission']($store.state.user, 'researcher')">
    <TabMenu
      :tabs="[
        { name: 'TEACHER GROUPS', background: '#2E9DF9', id:'teacher-groups', color: 'white' },
        { name: 'CONTENT', background: '#2E32DB', id:'content', color: 'white' },
        { name: 'FILES', background: '#1B1B83', id:'files', color: 'white' },
        { spacer: true, width: 1 },
        { name: 'PILA STUDIES', background: '#6BEAC9', id:'studies', color: 'black', icon: '/mascotte.png' }
      ]"
      :current="tab"
      @select="tab = $event"
    />

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
  import TabMenu from '../../components/tab-menu.vue'
  import Groups from '../../components/groups/viewer.vue'
  import RoleRequester from '../../components/roles/requester.vue'
  import Files from '../../components/files.vue'
  import AssignmentsFromMe from '../../assignments/from-me/all.vue'

  import ContentLibrary from '../../components/content-library.vue'

  export default {
    components: {
      TabMenu,
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
