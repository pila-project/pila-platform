<template>
  <div v-if="loading">
    ...
  </div>
  <div v-else>
    <div>
      Name
      <br>
      <input v-model="assignment.name" />
      <br>
      <br>
    </div>
    <div>
      Description
      <br>
      <textarea v-model="assignment.description" />
      <br>
      <br>
    </div>
    <div>
      Content
      <br>
      <input v-model="assignment.content" />
      <br>
      <br>
    </div>
  </div>
  Dashboard
  <Dashboard
    v-if="hasValidContent"
    :assignmentId="id"
  />
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
