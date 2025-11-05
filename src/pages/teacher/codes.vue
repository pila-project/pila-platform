<script setup>
  import { onMounted, nextTick } from 'vue'
  import UserInfoCard from '../../components/user-info-card.vue'
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
        Print Codes
      </v-btn>
    </v-row>

    <div v-else class="text-center mt-8">
      <h3>No active users with login codes.</h3>
    </div>

    <UserInfoCard
      v-for="id in visibleUsers"
      :key="id"
      :id="id"
    />
  </v-container>
</template>