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
      :image="info.picture || '/mascotte.png'"
    />
    <span v-if="showName">
      {{ info.name }}
    </span>
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
      },
      showName: {
        type: Boolean,
        default: true
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

<style scoped>
  span {
    white-space: nowrap;
  }
</style>