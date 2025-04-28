<script setup>
  import UserInfoCard from '../../components/user-info-card.vue'
  const users = await Agent.state('users')

  //window.print()
  //window.close()
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