<template>
  <span v-if="loaded">
    {{ metadata.name }}
  </span>
  <span v-else>loading...</span>
</template>

<script>

export default {
  props: { id: String },
  data() {
    return { loaded: false, metadata: null }
  },
  async created() {
    this.metadata = await Agent.metadata(this.id) || {}
    this.loaded = true
  }
}

</script>