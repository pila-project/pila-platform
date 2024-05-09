<template>
  <div class="dashboard-wrapper">
    <BettyDashboard
      v-if="bettyModuleId"
      :users="users"
      :assignment="props.assignment"
      :module="bettyModuleId"
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
  const id = (await Agent.state(content)).id
  //  Betty assignment content might be embedded, or a direct link
  const isBettyLink = str => str?.startsWith?.('https://bettysbrain.knowlearning.systems/')

  let bettyLink
  if (isBettyLink(id)) bettyLink = id
  else if (isBettyLink(content)) bettyLink = content

  const bettyModuleId = bettyLink ? (new URL(bettyLink)).pathname.split('/')[2] : null
</script>

<style scoped>

  .dashboard-wrapper
  {
    position: absolute;
    width: 100%;
    height: 100%;
  }

</style>
