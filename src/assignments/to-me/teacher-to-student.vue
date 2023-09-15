<template>
  <div v-if="assignment">
    <h1>
      {{ assignment.name }}
    </h1>
    <p>
      {{ assignment.description }}
    </p>
    <button @click="$router.push(`/assignment/${this.id}`)">play</button>
  </div>
  <div v-else>
    ...
  </div>
</template>

<script>
  export default {
    props: {
      id: String
    },
    data() {
      return {
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