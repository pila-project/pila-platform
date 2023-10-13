<template>
  <div
    v-if="$store.getters['roles/hasPermission']($store.state.user, 'teacher')"
    style="display: flex; flex-direction: column; height: 100%;"
  >

    <TabMenu
      :tabs="[
        { name: 'MY CLASSES', background: '#2E9DF9', id:'classes', color: 'white' },
        { spacer: true, width: 1 },
        { name: 'ASSIGNMENTS', background: '#2E32DB', id:'assignments-from-me', color: 'white' },
        { name: 'ITEM LIBRARY', background: '#1B1B83', id:'content', color: 'white' },
        { spacer: true, width: 1 },
        { name: 'PILA STUDIES', background: '#6BEAC9', id:'assignments-to-me', color: 'black', icon: '/mascotte.png' }
      ]"
      :current="tab"
      @select="tab = $event"
    />

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
  import TabMenu from '../../components/tab-menu.vue'
  import ContentLibrary from '../../components/content-library.vue'
  import AssignmentsToMe from '../../assignments/to-me/all.vue'
  import AssignmentsFromMe from '../../assignments/from-me/all.vue'

  export default {
    components: {
      Groups,
      ContentLibrary,
      RoleRequester,
      AssignmentsFromMe,
      TabMenu,
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

<style scoped>
  .tab-wrapper
  {
    font-weight: bold;
  }
</style>