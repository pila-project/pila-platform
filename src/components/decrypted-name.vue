<template>
  <span>
    {{ info.name }}
  </span>
</template>

<script>
  export default {
    props: {
      user: String
    },
    data() {
      return {
        info: {
          name: '...'
        }
      }
    },
    async created() {
      this.info = await this.$store.getters.decryptUserInfo(this.user)
    }
  }
</script>