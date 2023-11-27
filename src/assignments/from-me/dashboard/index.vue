<template>
  <div v-if="!dashboardReference">...</div>
  <div v-else class="dashboard-wrapper">
    <vueEmbedComponent :id="dashboardReference" />
  </div>
</template>

<script>
  import { v4 as uuid } from 'uuid'
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'

  const POLL_INTERVAL = 2500

  export default {
    props: {
      assignmentId: String
    },
    components: {
      vueEmbedComponent
    },
    data() {
      return {
        dashboardReference: null,
        noContent: false
      }
    },
    async created() {
      //  construct dashboard data acording to https://docs.knowlearning.systems/embedding/recommended-dashboard-scaffold/
      this.assignment = await Agent.state(this.assignmentId)
      const dashboardConfigId = uuid()
      const dashboardConfig = await Agent.state(dashboardConfigId)
      const dcMeta = await Agent.metadata(dashboardConfigId)
      if (dcMeta.active_type !== 'application/json;type=dashboard-config') dcMeta.active_type = 'application/json;type=dashboard-config'

      if (!this.assignment.content) {
        this.noContent = true
        return
      }

      dashboardConfig[this.assignment.content] = {
        states: {},
        embedded: {}
      }

      //  initialize states for all assigned students
      this
        .$store
        .getters['assignments/assignedStudents'](this.assignmentId, 'teacher-to-student')
        .filter(user => !dashboardConfig[this.assignment.content].states[user])
        .filter(user => dashboardConfig[this.assignment.content].states[user] = null)

      const pollForContext = () => {
        Agent
          .query('mutated-in-context', [this.assignmentId])
          .then(results => {
            results
              .filter(({ context }) => context[0] === this.assignmentId && context[1] === this.assignment.content)
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
          .then(() => this.latestPollTimeout = setTimeout(pollForContext, POLL_INTERVAL))

      }

      pollForContext()
      
      if (dcMeta.active_type !== 'application/json;type=dashboard-config') dcMeta.active_type = 'application/json;type=dashboard-config'

      if (this.assignment.content.startsWith('https://bettysbrain.knowlearning.systems/')) {
        const moduleName = this.assignment.content.split('/')[4].split('?')[0]
        this.dashboardReference = `https://bettysbrain-dashboard.knowlearning.systems/bb-dash/${moduleName}/OverviewView?dashboard-config=${dashboardConfigId}`
      }
      else if (this.assignment.content.startsWith('https://pila.cand.li/')) {
        this.dashboardReference = `https://pila.cand.li/pila.html?dashboard&dashboard-config=${dashboardConfigId}`
      }
      else {
        this.dashboardReference = `https://the-karel-project.netlify.app/${dashboardConfigId}`
      }

    },
    beforeUnmount() {
      clearTimeout(this.latestPollTimeout)
    }
  }

</script>

<style scoped>

  .dashboard-wrapper
  {
    position: relative;
    height: 75vh;
  }

</style>
