<template>
  <div v-if="assignment && assignment.content" class="wrapper">
    <vueEmbedComponent
      :id="assignment.content"
      @close="closeAssignment"
    />
  </div>
  <div v-else-if="assignment">
    {{ t('there-is-an-issue-with-your-assignment-please-ask-your-teacher-to-ensure-they-have-assigned-the-intended-content') }}
  </div>
  <div v-else>
    ... {{ t('loading') }} ...
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
      this.assignment = await Agent.state(id)
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) },
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