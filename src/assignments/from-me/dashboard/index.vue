<template>
  <div v-if="!dashboardConfigId">...</div>
  <div v-else class="dashboard-wrapper">
    <vueEmbedComponent :id="`https://${dashboardDomain}/${dashboardConfigId}`" />
  </div>
</template>

<script>
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'

  export default {
    props: {
      assignmentId: String
    },
    components: {
      vueEmbedComponent
    },
    data() {
      return {
        dashboardDomain: null,
        dashboardConfigId: null
      }
    },
    async created() {
      //  construct dashboard data acording to https://docs.knowlearning.systems/embedding/recommended-dashboard-scaffold/
      this.assignment = await Agent.state(this.assignmentId)
      const dashboardConfigName = `dashboard-config-for-${this.assignmentId}`
      const dashboardConfig = await Agent.state(this.dashboardConfigId)
      const dcMeta = await Agent.metadata(this.dashboardConfigId)
      const acMeta = await Agent.metadata(this.assignment.content)
      if (dcMeta.active_type !== 'application/json;type=dashboard-config') dcMeta.active_type = 'application/json;type=dashboard-config'

      this.dashboardDomain = acMeta.domain

      if (!dashboardConfig[this.assignment.content]) {
        dashboardConfig[this.assignment.content] = {
          states: {},
          embedded: {}
        }
      }

      //  initialize states for all assigned students
      this
        .$store
        .getters['assignments/assignedStudents'](this.assignmentId, 'teacher-to-student')
        .filter(user => !dashboardConfig[this.assignment.content].states[user])
        .filter(user => dashboardConfig[this.assignment.content].states[user] = null)

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
      
      const md = await Agent.metadata(dashboardConfigName)
      if (md.active_type !== 'application/json;type=dashboard-config') md.active_type = 'application/json;type=dashboard-config'
      this.dashboardConfigId = md.id
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
