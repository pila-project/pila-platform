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
    <ContentLibrary v-else-if="tab === 'content'" />
    <AdminStudyManager v-else-if="tab === 'studies'" />
  </div>
  <div v-else>
    Admin Role Required
  </div>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { useStore } from 'vuex'
  import TabMenu from '../../components/tab-menu.vue'
  import AdminRoleManager from './roles.vue'
  import AdminStudyManager from './studies.vue'
  import ContentLibrary from '../../components/content-library.vue'

  const store = useStore()
  const { user, isThailandDomain } = store.state

  const tab = ref('roles')

  function oldRolesIsAdmin() { return store.getters['roles/role'](user) === 'admin' }

  async function newRolesIsAdmin() {
    return await new Promise(r => r(true))
  }

  const iAmAnAdmin = await isThailandDomain ? newRolesIsAdmin() : oldRolesIsAdmin()
</script>