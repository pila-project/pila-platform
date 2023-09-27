<template>
  <div v-if="loading">
    ...
  </div>
  <div v-else>
    <div>
      Name
      <input v-model="assignment.name" />
    </div>
    <div>
      Description
      <textarea v-model="assignment.description" />
    </div>
    <div>
      Content
      <input v-model="assignment.content" />
    </div>
  </div>
  <pre>{{ mutatedScopesInContext }}</pre>
  <GroupAssigner
    :id="id"
    :groups="$store.getters['groups/groups']('class')"
    assignment_type="teacher-to-student"
  />
</template>

<script>
  import { v4 as uuid } from 'uuid'
  import { vuePersistentComponent } from '@knowlearning/agents/vue.js'
  import GroupAssigner from '../../components/groups/assigner.vue'

  export default {
    props: {
      id: String
    },
    components: {
      GroupAssigner,
      vuePersistentComponent
    },
    data() {
      return {
        loading: true,
        selectedFile: 'UNSELECTED',
        assignment: null,
        mutatedScopesInContext: []
      }
    },
    async created() {
      console.log(this.id)
      Agent
        .query('mutated-in-context', [this.id])
        .then(results => this.mutatedScopesInContext = results)
      this.assignment = await Agent.state(this.id)
      this.loading = false
    }
  }

</script>

<style>

.assignment-tables {
  display: flex;
  justify-content: space-around;
  align-items: top;
}

</style>