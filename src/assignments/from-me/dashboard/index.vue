<template>
  <div class="dashboard-wrapper">
    <Dashboard
      :users="users"
      :assignment="props.assignmentId"
    />
  </div>
</template>

<script setup>
  import Dashboard from '../../../components/NewDashboard/Dashboard.vue'

  const props = defineProps({ assignmentId: String })

  const users = store.getters['assignments/assignedStudents'](props.assignmentId, 'teacher-to-student')

</script>

<style scoped>

  .dashboard-wrapper
  {
    position: absolute;
    width: 100%;
    height: 100%;
  }

</style>
