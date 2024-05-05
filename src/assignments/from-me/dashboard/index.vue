<template>
  <div class="dashboard-wrapper">
    <BettyDashboard
      v-if="isBettyDashboard"
      :users="users"
      :assignment="props.assignment"
    />
    <Dashboard
      v-else
      :users="users"
      :assignment="props.assignment"
    />
  </div>
</template>

<script setup>
  import Dashboard from '../../../components/NewDashboard/Dashboard.vue'
  import BettyDashboard from './betty-dashboard.vue'

  const props = defineProps({ assignment: String })

  const users = store.getters['assignments/assignedStudents'](props.assignment, 'teacher-to-student')

  const content = (await Agent.state(props.assignment)).content
  const isBettyDashboard = (await Agent.state(content)).id?.startsWith?.('https://bettysbrain.knowlearning.systems/')
</script>

<style scoped>

  .dashboard-wrapper
  {
    position: absolute;
    width: 100%;
    height: 100%;
  }

</style>
