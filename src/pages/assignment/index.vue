<template>
  <div v-if="assignment?.content" class="wrapper">
    <vueEmbedComponent
      :id="assignment.content"
      @close="closeAssignment"
      :namespace="id"
    />
  </div>
  <div v-else-if="assignment">
    There is an issue with your assignment. Please ask your teacher to ensure they have assigned the intended content.
  </div>
  <div v-else>
    ... loading ...
  </div>
</template>

<script>
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'

  export default {
    props: {
      id: String
    },
    components: {
      vueEmbedComponent
    },
    data() {
      return {
        assignment: null
      }
    },
    async created() {
      this.assignment = await Agent.state(this.id)
    },
    methods: {
      closeAssignment() {
        Agent.close()
      }
    }
  }
</script>

<style scoped>

.wrapper {
  position: absolute;
  background: white;
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
}

</style>