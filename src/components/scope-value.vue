<template>
  <span v-if="loaded">
    {{ value }}
  </span>
  <span v-else>...</span>
</template>

<script>

export default {
  props: {
    scope: String,
    path: Array
  },
  data() {
    return { loaded: false, state: {} }
  },
  async created() {
    Agent
      .watch(this.scope, update => {
        this.state = update.state
        this.loaded = true
      })
  },
  computed: {
    value() {
      return this.path.reduce((acc, field) => acc?.[field], this.state)
    }
  }
}

</script>