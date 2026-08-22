<script setup>
  import UserInfoCard from '../../components/user-info-card.vue'
  import { useStore } from 'vuex'

  const store = useStore()
  function t(slug) { return store.getters.t(slug) }

  const users = await Agent.state('users')

  const visibleUsers = Object.keys(users).filter(id => !users[id].archived)

  function print() { window.print() }

</script>

<template>
  <v-container>
    <v-row 
      v-if="visibleUsers.length"
      justify="center"
      class="my-4"
    >
      <v-btn
        color="primary"
        variant="tonal"
        size="large"
        rounded="xl"
        prepend-icon="fas fa-print"
        @click="print"
      >
        {{ t('print-codes') }}
      </v-btn>
    </v-row>

    <div v-else class="text-center mt-8">
      <h3>{{ t('no-active-users-with-login-codes') }}</h3>
    </div>

    <UserInfoCard
      v-for="id in visibleUsers"
      :key="id"
      :id="id"
    />
  </v-container>
</template>