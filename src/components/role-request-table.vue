<template>
  <v-container>
    <div class="text-h3">
      {{ t('role-requests') }}
    </div>
    <v-data-table
      sticky
      :items="roleRequests"
      :headers="headers"
      :no-data-text="t('no-role-requests-yet')"
      :footerProps="{itemsPerPageText: 'hello world'}"
      :items-per-page-text="t('items-per-page')"
      :items-per-page-options="[
        {value: 10, title: '10'},
        {value: 25, title: '25'},
        {value: 50, title: '50'},
        {value: 100, title: '100'},
        {value: -1, title: t('all')}
      ]"
    >
      <template v-slot:item.user="data">
        <DecryptedName
          avatar
          :user="data.item.user"
        />
      </template>
      <template v-slot:item.id="data">
       {{ data.item.user }}
      </template>
      <template v-slot:item.trainer="data">
       <DecryptedName
          avatar
          :user="data.item.trainer"
        />
      </template>
      <template v-slot:item.granted="data">
        <v-btn
          @click="grantRole(data.item.role, data.item.user)"
          :text="t('grant')"
        />
      </template>
    </v-data-table>
  </v-container>
</template>

<script setup>
  import { computed } from 'vue'
  import { useStore } from 'vuex'
  import DecryptedName from './decrypted-name.vue'
  import { ADMIN_TAG, TRAINER_TAG, TEACHER_TAG } from '../constants.js'

  const roleToTagMap = {
    admin: ADMIN_TAG,
    trainer: TRAINER_TAG,
    teacher: TEACHER_TAG
  }

  const store = useStore()

  function t(slug) { return store.getters.t(slug) }

  const emit = defineEmits(['tag'])
  const props = defineProps({
    showTrainer: {
      type: Boolean,
      default: false
    }
  })

  const headers = [
    { key: 'user', title: t('user') },
    { key: 'role', title: t('role') },
    { key: 'updated', title: t('requested') },
    { key: 'id', title: t('user-id') }
  ]

  if (props.showTrainer) headers.push({ key: 'trainer', title: t('trainer') })

  headers.push({ key: 'granted', title: '' })

  const roleRequests = computed(() => (
    Object
      .entries(store.getters['roles/requests']())
      .map(([user, { role, updated }]) => ({ user, role, updated }))
      .filter(({ user, role }) => !store.getters['roles/hasPermission'](user, role))
  ))

  async function grantRole(role, user) {
    const tag = roleToTagMap[role]
    const target = user
    const value = true
    emit('tag', { tag, target, value })
    store.dispatch('roles/loadAssignments')
    store.dispatch('roles/removeRequest', user)
  }
</script>