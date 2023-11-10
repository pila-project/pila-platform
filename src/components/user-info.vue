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
      return this.t('anonymous') + '_' + this.user.substr(0, 4)
    }
  },
  methods: {
    t(slug) { return this.$store.getters.t(slug) }
  }
}

</script>