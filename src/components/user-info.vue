<template>
  <span v-if="loaded">
    {{ name ? metadata.name || 'anonymous' : '' }}
    {{ email ? metadata.email : '' }}
  </span>
  <span v-else>LOADING........................</span>
</template>

<script>

export default {
  props: {
    user: String,
    name: Boolean,
    email: Boolean
  },
  data() {
    return { loaded: false, metadata: {} }
  },
  async created() {
    this.metadata = await Agent.state(this.user, 'metadata', 'core')
    this.loaded = true
  }
}

</script>