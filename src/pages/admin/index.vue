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
    <AdminContentLibrary v-else-if="tab === 'content' && store.getters.isThailandDomain" />
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
  import AdminContentLibrary from './admin-content-library.vue'

  const ADMIN_TAG = "36e1b060-ed49-11ee-be89-5b04faf266ea"
  const TEACHER_TAG = "49bf66a0-ed49-11ee-be89-5b04faf266ea"
  const TRAINER_TAG = "8ae541e0-ed49-11ee-be89-5b04faf266ea"
  const PILA_CONTENT_TAG = "1a53db50-e248-11ee-ab5f-07f4a7408770"

  const store = useStore()
  const user = store.getters.user()
  const { isThailandDomain, tagPartition } = store.getters

  const tab = ref('roles')

  function oldRolesIsAdmin() { return store.getters['roles/role'](user) === 'admin' }

  async function newRolesIsAdmin() {
    const adminTagging = await Agent.query(
      'tagging-for-target',
      [tagPartition, ADMIN_TAG, user],
      'tags.knowlearning.systems'
    )
    return !!adminTagging.length
  }

  const iAmAnAdmin = await (isThailandDomain ? newRolesIsAdmin() : oldRolesIsAdmin())
</script>