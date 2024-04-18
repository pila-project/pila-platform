<template>
  <div class="dashboard-wrapper">
    <Dashboard
      :users="users"
      :content="assignment.content"
    />
  </div>
</template>

<script setup>
  import Dashboard from '../../../components/NewDashboard/Dashboard.vue'

  const props = defineProps({ assignmentId: String })

  const assignment = await Agent.state(props.assignmentId)
  const users = store.getters['assignments/assignedStudents'](props.assignmentId, 'teacher-to-student')

</script>

<style scoped>

  .dashboard-wrapper
  {
    position: relative;
    height: 75vh;
  }

</style>
