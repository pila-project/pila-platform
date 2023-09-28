<template>
  <div v-if="loading">...</div>
  <table v-else>
    <thead>
      <tr>
        <th>
          user
        </th>
        <th v-for="{ name } in orderedTaskMetadata">
          {{ name }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="assignee in assignees">
        <td>
          {{ assignee }}
          <span v-if="lastAssigneeInteractionTimes[assignee]">
            last activity: {{ Math.round((now - lastAssigneeInteractionTimes[assignee])/1000) }} seconds ago
          </span>
          <span v-else> --- </span>
          <ScopeWatcher
            v-if="assigneeMapScopes[assignee]"
            :id="assigneeMapScopes[assignee]"
          />
        </td>
        <td
          v-for="task in orderedTasks"
        >
          <ScopeValue
            :scope="assigneeMapScopes[assignee]"
            :path="['taskTimes', task]"
          />
          <ScopeWatcher
            v-if="assigneeTasksToScopes[assignee][task]"
            :id="assigneeTasksToScopes[assignee][task]"
          />
          <span v-else> - </span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
  import ScopeWatcher from '../../components/scope-watcher.vue'
  import ScopeValue from '../../components/scope-value.vue'

  export default {
    props: {
      assignmentId: String
    },
    components: {
      ScopeWatcher,
      ScopeValue,
    },
    data() {
      return {
        loading: true,
        assignment: null,
        mutatedScopesInContext: [],
        map: null,
        taskMetadata: {},
        users: [],
        now: Date.now(),
        lastAssigneeInteractionTimes: {}
      }
    },
    async created() {
      const updateNow = () => {
        this.now = Date.now()
        setTimeout(updateNow, 1000)
      }
      updateNow()

      Agent
        .query('mutated-in-context', [this.assignmentId])
        .then(results => this.mutatedScopesInContext = results)

      this.assignment = await Agent.state(this.assignmentId)
      this.loading = false

      console.log('>>>>>>>>>>>>>>>>>>>>>>>>', this.assignment)

      this.map = await Agent.state(this.assignment.content)
      Object
        .keys(this.map.nodes)
        .forEach(async nodeId => {
          this.taskMetadata[nodeId] = await Agent.metadata(nodeId)
        })
    },
    watch: {
      assigneeMapScopes() {
        // Watch map scope for each user to get last interaction time.
        // This works since the map implements a heartbeat.
        Object
          .entries(this.assigneeMapScopes)
          .forEach(async ([assignee, scope]) => {
            if (this.lastAssigneeInteractionTimes[assignee] === undefined) {
              this.lastAssigneeInteractionTimes[assignee] = null
              const { updated } = await Agent.metadata(scope)
              this.lastAssigneeInteractionTimes[assignee] = updated
              let ignoreFirst = true
              Agent
                .watch(scope, () => {
                  if (ignoreFirst) {
                    ignoreFirst = false
                    return
                  }
                  console.log('Updating assignee\'s time...', assignee, scope, Date.now())
                  this.lastAssigneeInteractionTimes[assignee] = Date.now()
                })
            }
          })
      }
    },
    computed: {
      orderedTasks() {
        return this.map ? Object.keys(this.map.nodes) : []
      },
      orderedTaskMetadata() {
        if(this.map) return (
            this.orderedTasks.map(nodeId => this.taskMetadata[nodeId] || { name: '...' })
        )
        else return []
      },
      assignees() {
        return Array.from(new Set(
          this
            .mutatedScopesInContext
            .map(({ owner }) => owner)
        ))
      },
      assigneeMapScopes() {
        const assigneeMapScopes = {}

        this
          .mutatedScopesInContext
          .forEach(({ owner, target, context }) => {
            if (context.length === 2) {
              const map = context[1]
              assigneeMapScopes[owner] = target
            }
          })

        return assigneeMapScopes
      },
      assigneeTasksToScopes() {
        const assigneeTasksToScopes = {}
        this
          .assignees
          .forEach(id => assigneeTasksToScopes[id] = {})

        this
          .mutatedScopesInContext
          .forEach(({ owner, target, context }) => {
            if (context.length === 3) {
              const task = context[2]
              assigneeTasksToScopes[owner][task] = target
            }
          })

        return assigneeTasksToScopes
      }

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