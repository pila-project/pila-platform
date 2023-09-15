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
  <GroupAssigner
    :id="id"
    :groups="$store.getters['groups/groups']('class')"
    assignment_type="teacher-to-student"
  />
  <div v-if="dashboardScope">
    <vueContentComponent
      :id="`https://dashboard.knowlearning.systems/${dashboardScope}`"
    />
  </div>
</template>

<script>
  import { v4 as uuid } from 'uuid'
  import { vueContentComponent } from '@knowlearning/agents'
  import GroupAssigner from '../../components/groups/assigner.vue'

  export default {
    props: {
      id: String
    },
    components: {
      GroupAssigner,
      vueContentComponent
    },
    data() {
      return {
        loading: true,
        selectedFile: 'UNSELECTED',
        assignment: null,
        dashboardScope: null
      }
    },
    async created() {
      this.assignment = await Agent.state(this.id)
      this.loading = false

      const id = uuid()
      const ds = await Agent.state(id)
      ds.scope = this.assignment.content
      const users = this.$store.getters['assignments/assignedStudents'](this.id, 'teacher-to-student')
      ds.users = users.reduce((acc, id) => (acc[id] = {}, acc), {})
      this.dashboardScope = id
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