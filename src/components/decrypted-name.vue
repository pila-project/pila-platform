<template>
  <span>
    {{ info.name }}
  </span>
</template>

<script>
  export default {
    props: {
      user: String,
      alias: {
        type: Boolean,
        default: false
      }
    },
    data() {
      return {
        info: {
          name: '...'
        }
      }
    },
    async created() {
      this.info = await this.$store.getters.decryptUserInfo(this.user, this.alias)
    },
    watch: {
      async user() {
        this.info = {}
        this.info = await this.$store.getters.decryptUserInfo(this.user, this.alias)
      }
    }
  }
</script>