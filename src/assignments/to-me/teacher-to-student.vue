<template>
  <div v-if="assignment">
    <h1>
      {{ assignment.name }}
    </h1>
    <p>
      {{ assignment.description }}
    </p>
    <button @click="playing = true">play</button>
    <div
      class="assignment-overlay"
      v-if="playing"
    >
      <vueEmbedComponent
        :id="this.id"
        @close="playing = false"
      />
    </div>
  </div>
  <div v-else>
    ...
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
        playing: false,
        assignment: null,
        assigned_item: null
      }
    },
    async created() {
      const assignment = await Agent.state(this.id)
      this.assignment = assignment
      this.assigned_item = await Agent.state(assignment.item_id)
    }
  }

</script>

<style scoped>

  .assignment-overlay
  {
    position: fixed;
    top: 0;
    left: 0;
    background: white;
    width: 100vw;
    height: 100vh;
  }

</style>
