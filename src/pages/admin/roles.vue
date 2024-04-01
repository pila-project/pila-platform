<template>
  <v-container v-if="isThailandDomain">
    <v-data-table
      sticky
      :items="tagsAndContributors"
      :loading="loading"
    >
      <template v-slot:item.user="data">
        {{ data.item.user }}
      </template>
      <template v-slot:item.isAdmin="data">
        <v-checkbox
          v-model="data.item.isAdmin"
          disabled
        />
      </template>
      <template v-slot:item.adminContributor="data">
        {{ data.item.adminContributor }}
      </template>
      <template v-slot:item.isTrainer="data">
        <v-checkbox
          v-model="data.item.isTrainer"
          disabled
        />
      </template>
      <template v-slot:item.trainerContributor="data">
        {{ data.item.trainerContributor }}
      </template>
      <template v-slot:item.isTeacher="data">
        <v-checkbox
          v-model="data.item.isTeacher"
          disabled
        />
      </template>
      <template v-slot:item.teacherContributor="data">
        {{ data.item.teacherContributor }}
      </template>
    </v-data-table>
  </v-container>
  <OldRoles v-else />
</template>

<script setup>
  import { ref } from 'vue'
  import { useStore } from 'vuex'
  import OldRoles from './old-roles.vue'

  const store = useStore()
  const { isThailandDomain } = store.state
  const loading = ref(false)

  const tagsAndContributors = [
    {
      user: 'user-id',
      isAdmin: false,
      adminContributor: null,
      isTrainer: false,
      trainerContributor: null,
      isTeacher: true,
      teacherContributor: 'some-other-user'
    }
  ]
</script>