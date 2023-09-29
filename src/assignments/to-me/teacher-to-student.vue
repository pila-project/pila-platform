<template>
  <div v-if="assignment">
    <h1>
      {{ assignment.name }}
    </h1>
    <p>
      {{ assignment.description }}
    </p>
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
        assigned_item_id: null
      }
    },
    async created() {
      const assignment = await Agent.state(this.id)
      this.assignment = assignment
      this.assigned_item_id = assignment.item_id
    }
  }

</script>
