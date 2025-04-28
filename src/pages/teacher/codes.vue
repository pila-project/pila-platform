<script setup>
  import UserInfoCard from '../../components/user-info-card.vue'
  const users = await Agent.state('users')

  setTimeout(() => {
    window.print()
    //window.close()
  }, 500)
</script>

<template>
  <div>
    <UserInfoCard
      v-for="_, id in users"
      :key="id"
      :id="id"
    />
  </div>
</template>