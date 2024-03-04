<template>
  <TeacherAgreement v-if="!hasTeacherAgreement" />
  <div
    class="teacher-view"
    v-else-if="$store.getters['roles/hasPermission']($store.state.user, 'teacher')"
  >

    <TabMenu
      :tabs="[
        { name: t('my-classes'), background: '#2E9DF9', id:'classes', color: 'white' },
        // { spacer: true, width: 1 },
        { name: t('dashboard') === 'no slug dashboard' ? 'DASHBOARD' : t('dashboard'), background: '#1E6DB8', id:'dashboard', color: 'white' },
        { name: t('assignments'), background: '#2E32DB', id:'assignments-from-me', color: 'white' },
        { name: t('item-library'), background: '#1B1B83', id:'content', color: 'white' },
        { spacer: true, width: 1 },
        { name: t('pila-studies'), background: '#6BEAC9', id:'assignments-to-me', color: 'black', icon: '/mascotte.png' }
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
    <StudiesNotAvailable
      v-if="tab === 'assignments-to-me' && hideStudies"
    />
    <AssignmentsToMe
      v-else-if="tab === 'assignments-to-me'"
      type="researcher-to-teacher"
    />

  </div>

  <RoleRequester v-else role="teacher" />
</template>

<script>
  import TeacherAgreement from './teacher-agreement.vue'
  import RoleRequester from '../../components/roles/requester.vue'
  import Groups from '../../components/groups/viewer.vue'
  import TabMenu from '../../components/tab-menu.vue'
  import ContentLibrary from '../../components/content-library.vue'
  import AssignmentsToMe from '../../assignments/to-me/all.vue'
  import AssignmentsFromMe from '../../assignments/from-me/all.vue'
  import StudiesNotAvailable from '../../components/studies-not-available.vue'

  export default {
    name: 'teacher',
    components: {
      TeacherAgreement,
      Groups,
      ContentLibrary,
      RoleRequester,
      AssignmentsFromMe,
      TabMenu,
      AssignmentsToMe,
      StudiesNotAvailable
    },
    data() {
      return {
        tab: 'classes',
        hideStudies: true // For December Demo
      }
    },
    computed: {
      hasTeacherAgreement() {
        return this.$store.getters.hasAcceptedTeacherAgreement()
      },
      currentTabName() {
        const tab = this.tabs.find(tab => tab.id === this.tab);
        return tab ? tab.name : '';
      },
      students() {
        // students are anybody who has added you to a group of type "my-teachers"
        const { getters, state: { user } } = this.$store
        return  (
          this
            .$store
            .getters['groups/groups']('my-teachers')
            .filter(gid => getters['groups/belongs'](this.$store.state.user, gid))
            .map(gid => getters['groups/owner'](gid))
        )
      }
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) },
      getTabDisplayName(tab) {
        return tab.name === 'dashboard' ? 'DASHBOARD' : tab.name;
    },
    }
  }
</script>

<style scoped>
.teacher-view {
  display: flex;
  flex-direction: column;
  height: 100%;  
}
.tab-wrapper {
    font-weight: bold;
  }
</style>