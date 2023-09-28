<template>
  <span>{{ name }}</span>
</template>

<script>

export default {
  props: {
    user: String
  },
  computed: {
    name() {
      return 'Anonymous_' + this.user.substr(0, 4)
    }
  }
}

</script>