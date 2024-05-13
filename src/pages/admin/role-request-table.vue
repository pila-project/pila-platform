<template>
  <v-container>
    <div class="text-h3">
      Role Requests
    </div>
    <v-data-table
      sticky
      :items="roleRequests"
      :headers="headers"
      no-data-text="No role requests yet"
    >
      <template v-slot:item.user="data">
        <DecryptedName :user="data.item.user" />
      </template>
      <template v-slot:item.id="data">
       {{ data.item.user }}
      </template>
      <template v-slot:item.granted="data">
        <v-btn
          @click="grantRole(data.item.role, data.item.user)"
          text="Grant"
        />
      </template>
    </v-data-table>
  </v-container>
</template>

<script setup>
  import { computed } from 'vue'
  import { useStore } from 'vuex'
  import DecryptedName from '../../components/decrypted-name.vue'

  const props = defineProps({
    roleToTagMap: Object
  })

  const emit = defineEmits(['tag'])

  const headers = [
    { key: 'user', title: 'User' },
    { key: 'role', title: 'Role' },
    { key: 'updated', title: 'Requested' },
    { key: 'id', title: 'User Id' },
    { key: 'granted', title: '' }
  ]

  const store = useStore()

  const roleRequests = computed(() => (
    Object
      .entries(store.getters['roles/requests']())
      .map(([user, { role, updated }]) => ({ user, role, updated }))
  ))

  async function grantRole(role, user) {
    const tag = props.roleToTagMap[role]
    const target = user
    const value = true
    emit('tag', { tag, target, value })
  }
</script>