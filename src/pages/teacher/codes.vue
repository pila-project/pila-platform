<script setup>
  import UserInfoCard from '../../components/user-info-card.vue'
  const users = await Agent.state('users')

  const visibleUsers = Object.keys(users).filter(id => !users[id].archived)

  setTimeout(() => {
    if (visibleUsers.length) window.print()
    //window.close()
  }, 500)
</script>

<template>
  <div>
    <div v-if="visibleUsers.length === 0">
      <h3>No active users with login codes.</h3>
    </div>
    <UserInfoCard
      v-for="id in visibleUsers"
      :key="id"
      :id="id"
    />
  </div>
</template>