<template>
  <div v-if="iAmAnAdmin">
    <TabMenu
      :tabs="[
        { name: 'USER ROLES', background: '#2E9DF9', id:'roles', color: 'white' },
        { name: 'ITEM LIBRARY', background: '#1B1B83', id:'content', color: 'white' },
        { spacer: true, width: 1 },
        { name: 'PILA STUDIES', background: '#6BEAC9', id:'studies', color: 'black', icon: '/mascotte.png' }
      ]"
      :current="tab"
      @select="tab = $event"
    />

    <AdminRoleManager v-if="tab === 'roles'" />
    <ContentLibrary
      v-else-if="tab === 'content'"
      :header_tag_types="['expert']"
    />
    <AdminStudyManager v-else-if="tab === 'studies'" />
  </div>
  <div v-else>
    Admin Role Required
  </div>
</template>

<script>
  import TabMenu from '../../components/tab-menu.vue'
  import AdminRoleManager from './roles.vue'
  import AdminStudyManager from './studies.vue'
  import ContentLibrary from '../../components/content-library.vue'

  export default {
    components: {
      TabMenu,
      AdminRoleManager,
      AdminStudyManager,
      ContentLibrary
    },
    data() {
      return {
        tab: 'roles'
      }
    },
    computed: {
      iAmAnAdmin() {
        return this.$store.getters['roles/role'](this.$store.state.user) === 'admin'
      }
    }
  }

</script>