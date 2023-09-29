<template>
  <div v-if="loading">
    ...
  </div>
  <div v-else>
    <div>
      <h3>Name</h3>
      <input v-model="assignment.name" />
      <br>
      <br>
    </div>
    <div>
      <h3>Description</h3>
      <textarea v-model="assignment.description" />
      <br>
      <br>
    </div>
    <div>
      <h3>Content</h3>
      <input v-model="assignment.content" />
      <br>
      <br>
    </div>
  </div>
  <h3>Dashboard</h3>
  <Dashboard
    v-if="hasValidContent"
    :assignmentId="id"
  />
  <br>
  <br>
  <h3>Assigned Groups</h3>
  <br>
  <GroupAssigner
    :id="id"
    :groups="$store.getters['groups/groups']('class')"
    assignment_type="teacher-to-student"
  />
</template>

<script>
  import { v4 as uuid, validate as isUUID } from 'uuid'
  import Dashboard from './dashboard/index.vue'
  import GroupAssigner from '../../components/groups/assigner.vue'

  export default {
    props: {
      id: String
    },
    components: {
      Dashboard,
      GroupAssigner
    },
    data() {
      return {
        loading: true,
        assignment: null
      }
    },
    async created() {
      this.assignment = await Agent.state(this.id)
      this.loading = false
    },
    computed: {
      hasValidContent() {
        return this.assignment && isUUID(this.assignment.content)
      }
    }
  }

</script>
