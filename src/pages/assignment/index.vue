<template>
  <div v-if="assignment && assignment.content" class="wrapper">
    <vueContentComponent
      :id="assignment.content"
      @state="stateListener"
      @mutate="mutateListener"
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
  import { vueContentComponent } from '@knowlearning/agents'

  export default {
    components: {
      vueContentComponent
    },
    data() {
      return {
        assignment: null,
        metadata: null
      }
    },
    async created() {
      const id = this.$route.params.item_id
      Agent.state(id).then(state => this.assignment = state)
      Agent.metadata(id).then(meta => this.assignmentMeta = meta)
    },
    methods: {
      async stateListener(event) {
        console.log('STATE LISTENER!', event)
      },
      async mutateListener({ scope }) {
        // TODO: register this scope as part of an assignment
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