<template>
  <span
      draggable
      @dragstart="$event.dataTransfer.setData('text', user)"
      @dragover.prevent
  >
    <v-avatar
      v-if="avatar"
      size="small"
      class="mr-2"
      :image="info.picture"
    />
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
      },
      avatar: {
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