<template>
  <div v-if="!dashboardReference">...</div>
  <div v-else class="dashboard-wrapper">
    <vueEmbedComponent
      :id="dashboardReference"
      :environmentProxy="proxyEnvironmentCall"
      :namespace="assignmentId"
    />
  </div>
</template>

<script setup>
  import { ref, onBeforeUnmount } from 'vue'
  import { useStore } from 'vuex'
  import { v4 as uuid } from 'uuid'
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'

  const store = useStore()

  const POLL_INTERVAL = 2500

  const props = defineProps({ assignmentId: String })
  const dashboardReference = ref(null)
  const noContent = ref(false)

  //  construct dashboard data acording to https://docs.knowlearning.systems/embedding/recommended-dashboard-scaffold/
  const assignment = await Agent.state(props.assignmentId)
  const dashboardConfigId = uuid()
  const dashboardConfig = await Agent.state(dashboardConfigId)
  const dcMeta = await Agent.metadata(dashboardConfigId)

  let latestPollTimeout

  if (dcMeta.active_type !== 'application/json;type=dashboard-config') dcMeta.active_type = 'application/json;type=dashboard-config'

  if (!assignment.content) {
    noContent.value = true
  }
  else {

    dashboardConfig[assignment.content] = { states: {}, embedded: {} }

    //  initialize states for all assigned students
    store
      .getters['assignments/assignedStudents'](props.assignmentId, 'teacher-to-student')
      .filter(user => !dashboardConfig[assignment.content].states[user])
      .filter(user => dashboardConfig[assignment.content].states[user] = null)

    const pollForContext = () => {
      Agent
        .query('mutated-in-context', [props.assignmentId])
        .then(results => {
          results
            .filter(({ context }) => context[0] === props.assignmentId && context[1] === assignment.content)
            .forEach(({ context, owner, target }) => {
              let embeddedReference = dashboardConfig
              context
                .slice(1) // start after referene to assignment
                .forEach((contentId, index) => {
                  if (!embeddedReference[contentId]) embeddedReference[contentId] = { states: {}, embedded: {} }
                  if (index < context.length - 2) embeddedReference = embeddedReference[contentId].embedded
                })
              const content = context[context.length-1]
              embeddedReference[content].states[owner] = target
            })
        })
        .catch(error => console.warn('Error in poll call', error))
        .finally(() => latestPollTimeout = setTimeout(pollForContext, POLL_INTERVAL))
    }

    pollForContext()
    
    if (dcMeta.active_type !== 'application/json;type=dashboard-config') dcMeta.active_type = 'application/json;type=dashboard-config'

    if (assignment.content.startsWith('https://bettysbrain.knowlearning.systems/')) {
      const moduleName = assignment.content.split('/')[4].split('?')[0]
      dashboardReference.value = `https://bettysbrain-dashboard.knowlearning.systems/bb-dash/${moduleName}/OverviewView?oecd=true&dashboard-config=${dashboardConfigId}`
    }
    else if (assignment.content === '1d77b2e0-f214-4c28-a06e-2186b7f1e0b2' || assignment.content.startsWith('https://pila.cand.li/')) {
      dashboardReference.value = `https://pila.cand.li/pila.html?dashboard&dashboard-config=${dashboardConfigId}`
    }
    else {
      dashboardReference.value = `https://the-karel-project.netlify.app/${dashboardConfigId}`
    }

    onBeforeUnmount(() => clearTimeout(latestPollTimeout))
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
    position: relative;
    height: 75vh;
  }

</style>
