<template>
  <div class="p-6">
    <h2 class="text-xl font-semibold text-zinc-950 mb-4">
      {{ t('role-requests') }}
    </h2>
    <PTable
      :items="roleRequests"
      :headers="headers"
      :noDataText="t('no-role-requests-yet')"
      :itemsPerPageText="t('items-per-page')"
      :itemsPerPage="10"
      :itemsPerPageOptions="[
        {value: 10, title: '10'},
        {value: 25, title: '25'},
        {value: 50, title: '50'},
        {value: 100, title: '100'},
        {value: -1, title: t('all')}
      ]"
    >
      <template #item.user="{ item }">
        <DecryptedName
          avatar
          :user="item.user"
        />
      </template>
      <template #item.id="{ item }">
       {{ item.user }}
      </template>
      <template #item.trainer="{ item }">
       <DecryptedName
          avatar
          :user="item.trainer"
        />
      </template>
      <template #item.granted="{ item }">
        <PButton
          @click="grantRole(item.role, item.user)"
          variant="primary"
          size="sm"
          :text="t('grant')"
        />
      </template>
    </PTable>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useStore } from 'vuex'
  import DecryptedName from '@/components/common/decrypted-name.vue'
  import { ADMIN_TAG, TRAINER_TAG, TEACHER_TAG } from '@/utils/constants.js'
  import { PTable, PButton } from '@/components/ui/index.js'

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
      .map(([user, { trainer, role, updated }]) => ({ user, trainer, role, updated }))
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
