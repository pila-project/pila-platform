<template>
  <div v-if="$store.getters['roles/hasPermission']($store.state.user, 'researcher')">
    <TabMenu
      :tabs="[
        { name: t('teacher-groups'), background: '#2E9DF9', id:'teacher-groups', color: 'white' },
        { name: t('content'), background: '#2E32DB', id:'content', color: 'white' },
        { name: t('files'), background: '#1B1B83', id:'files', color: 'white' },
        { spacer: true, width: 1 },
        { name: t('pila-studies'), background: '#6BEAC9', id:'studies', color: 'black', icon: '/mascotte.png' }
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
  import TabMenu from '@/components/common/tab-menu.vue'
  import Groups from '@/components/groups/group-viewer.vue'
  import RoleRequester from '@/components/roles/role-requester.vue'
  import Files from '@/components/content/file-browser.vue'
  import AssignmentsFromMe from '@/pages/assignments/from-me/assignments-list.vue'

  import ContentLibrary from '@/components/content/content-library.vue'

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
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) }
    }
  }
</script>
