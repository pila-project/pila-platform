<template>
  <pre v-if="state">{{value}}</pre>
  <span v-else>loading...</span>
</template>

<script>

  export default {
  	props: {
  	  id: String,
      path: {
        type: Array,
        default: []
      }
  	},
  	data() {
  	  return {
  	  	state: null
  	  }
  	},
  	created() {
  	  Agent.watch(this.id, ({ state }) => this.state = state)
  	},
    computed: {
      value() {
        if (this.path.length === 0) return this.state

        return (
          this
            .path
            .reduce((acc, field) => acc?.[field], this.state)
        )
      }
    }
  }

</script>