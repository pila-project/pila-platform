<template>
  <div class="dashboard-wrapper">
    <vueEmbedComponent
      v-if="customDashboardUrl"
      :id="customDashboardUrl"
      :namespace="props.assignment"
      :environmentProxy="proxyEnvironmentCall"
    />
    <UrlDashboard
      v-else-if="props.url"
      :url="props.url"
      :users="users"
      :assignment="props.assignment"
      :module="content"
    />
    <RCTDashboard
      v-else-if="rctAssignment"
      :users="users"
      :assignment="props.assignment"
      :module="content"
    />
    <BettyDashboard
      v-else-if="bettyModuleId"
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
  import { ref } from 'vue'
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import Dashboard from '@/components/dashboard/dashboard.vue'
  import BettyDashboard from './betty-dashboard.vue'
  import RCTDashboard from './rct-dashboard.vue'
  import UrlDashboard from './url-dashboard.vue'
  import { primaryAssignmentContentId } from '@/utils/dashboard-sequence-items.js'

  const props = defineProps({ assignment: String, url: String })

  const users = store.getters['assignments/assignedStudents'](props.assignment, 'teacher-to-student')

  const assignmentState = await Agent.state(props.assignment)
  const content = primaryAssignmentContentId(assignmentState)
  const contentState = content ? await Agent.state(content) : null
  const id = contentState?.id ?? content
  const customDashboardUrl = ref(null)

  const isRCTAssignment = async () => {
    if (!content) return false
    const { domain } = await Agent.metadata(content)
    return domain === 'rct-problem-creator.pilaproject.org'
  }
  const isBettyLink = str => str?.startsWith?.('https://bettysbrain.knowlearning.systems/')

  let bettyLink
  if (isBettyLink(id)) bettyLink = id
  else if (isBettyLink(content)) bettyLink = content

  const rctAssignment = await isRCTAssignment()

  const bettyModuleId = bettyLink ? (new URL(bettyLink)).pathname.split('/')[2] : null

  const candliDashboardContent = [
    // '881f5110-a910-11f0-92ae-3f96e8a36c18'
    'e6b4b836-c4b9-46b7-b4bd-6da86d4d6b21',
    '2711888d-177e-4284-aa35-304275a487c5',
    'bb1e41e0-082b-4488-b03e-1a3829094bce'
  ]

  if (candliDashboardContent.includes(content)) {
    const dashboardConfigId = Agent.uuid()
    const dashboardConfig = await Agent.state(dashboardConfigId)
    dashboardConfig.placeholder = {
      states: Object.fromEntries(users.map(id => [id, 'placeholder']))
    }
    console.log('dashboard cofing!', dashboardConfig)
    await Agent.response()
    customDashboardUrl.value = `https://pila.cand.li/pila.html?dashboard&dashboard-config=${dashboardConfigId}`
  }

  async function proxyEnvironmentCall(user) {
    if (user) {
      const info = await store.getters.decryptUserInfo(user)
      return { auth: { user, info } }
    }
    else return Agent.environment()
  }
</script>

<style scoped>

  .dashboard-wrapper
  {
    position: absolute;
    width: 100%;
    height: 100%;
  }

</style>
