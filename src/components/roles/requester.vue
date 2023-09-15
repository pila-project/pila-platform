<template>
  <div v-if="requestedRole">
    You have requested to be a {{ role }}. Please wait for admin approval.
    <button
      v-if="requestedRole === role"
      @click="requestRole(null)"
    >
      Undo
    </button>
  </div>
  <div v-if="requestedRole !== role">
    <button @click="requestRole(role)">
      Request "{{ role }}" Role
    </button>
  </div>
</template>

<script>

  export default {
    props: {
      role: String
    },
    computed: {
      requestedRole() {
        return this.$store.getters['roles/request'](this.$store.state.user)
      },
      validResearcher() {
        return false
      }
    },
    methods: {
      requestRole(role) {
        this.$store.dispatch('roles/request', role)
      }
    }
  }

</script>