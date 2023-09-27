<template>
  <div v-if="assignment && assignment.content" class="wrapper">
    <vueEmbedComponent
      :id="assignment.content"
      @close="closeAssignment"
    />
  </div>
  <div v-else-if="assignment">
    There is an issue with your assignment.
    Please ask your teacher to ensure they have assigned the
    content they intended to.
  </div>
  <div v-else>
    ...loading...
  </div>
</template>

<script>
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'

  export default {
    components: {
      vueEmbedComponent
    },
    data() {
      return {
        assignment: null,
        metadata: null
      }
    },
    async created() {
      const { id } = this.$route.params
      Agent.state(id).then(async state => {
        this.assignment = await Agent.state(state.item_id)
      })
      Agent.metadata(id).then(meta => this.assignmentMeta = meta)
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
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
}

</style>