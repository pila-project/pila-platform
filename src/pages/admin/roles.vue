<template>
  <div v-if="isThailandDomain">
    TODO: render new roles and role request table
  </div>
  <OldRoles v-else />
</template>

<script setup>
  import { useStore } from 'vuex'
  import OldRoles from './old-roles.vue'

  const store = useStore()
  const { isThailandDomain } = store.state
</script>