<template>
  <pre v-if="state">{{state}}</pre>
  <span v-else>loading...</span>
</template>

<script>

  export default {
  	props: {
  	  id: String
  	},
  	data() {
  	  return {
  	  	state: null
  	  }
  	},
  	created() {
  	  Agent.watch(this.id, ({ state }) => this.state = state)
  	}
  }

</script>