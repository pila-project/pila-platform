<script setup>
  import { onMounted, nextTick } from 'vue'
  import UserInfoCard from '@/components/users/user-info-card.vue'
  const users = await Agent.state('users')

  const visibleUsers = Object.keys(users).filter(id => !users[id].archived)

  function print() { window.print() }

</script>

<template>
  <div class="p-6">
    <div
      v-if="visibleUsers.length"
      class="flex justify-center my-4"
    >
      <button
        class="btn btn-primary btn-lg"
        @click="print"
      >
        <i class="fas fa-print mr-2" />
        Print Codes
      </button>
    </div>

    <div v-else class="text-center mt-8">
      <h3>No active users with login codes.</h3>
    </div>

    <UserInfoCard
      v-for="id in visibleUsers"
      :key="id"
      :id="id"
    />
  </div>
</template>
