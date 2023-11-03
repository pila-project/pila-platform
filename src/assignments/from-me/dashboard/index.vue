<template>
  <div v-if="loading">...</div>

  <table v-else>
    <thead>
      <tr>
        <th>
          user
        </th>
        <th></th><!--placeholder for active -->
        <th v-for="{ name } in orderedTaskData">
          {{ name }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="assignee in assignees">
        <td @click="logAssigneeState(assignee)">
          Anonymous_{{ assignee.substr(0, 4) }}
        </td>
        <td>
          <div :class="{
            'active-status': true,
            'active': userIsActive(assignee)
          }"></div>
        </td>
        <td
          v-for="task in orderedTasks"
          :class="{
            'item-cell' : true,
            'active' : userIsActive(assignee) && taskIdForNode(assigneeMapScopeStates[assignee]?.selected) === task
          }"

        >
          <TaskCell
            v-if="assigneeMapScopeStates[assignee]?.taskTimes?.[task]"
            :task="task"
            :scope="assigneeTasksToScopes[assignee][task]"
            :timeOnTask="assigneeMapScopeStates[assignee].taskTimes[task]"
          />
          <span v-else> - </span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
  import TaskCell from './cell-types/index.vue'

  export default {
    props: {
      assignmentId: String
    },
    components: {
      TaskCell
    },
    data() {
      return {
        loading: true,
        assignment: null,
        mutatedScopesInContext: [],
        map: null,
        taskData: {},
        users: [],
        now: Date.now(),
        lastAssigneeInteractionTimes: {},
        assigneeMapScopeStates: {}
      }
    },
    async created() {
      console.log('assignmentId', this.assignmentId)
      const updateNow = () => {
        this.now = Date.now()
        setTimeout(updateNow, 1000)
      }
      updateNow()

      Agent
        .query('mutated-in-context', [this.assignmentId])
        .then(results => this.mutatedScopesInContext = results)
        .then(() => console.log('mmmm', this.mutatedScopesInContext))

      this.assignment = await Agent.state(this.assignmentId)
      this.map = await Agent.state(this.assignment.content)
      this.loading = false

      Object
        .values(this.map.graph.nodes)
        .forEach(async ({ taskId }) => {
          this.taskData[taskId] = await Agent.state(taskId)
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
                .watch(scope, ({ state }) => {
                  if (ignoreFirst) ignoreFirst = false
                  else this.lastAssigneeInteractionTimes[assignee] = Date.now()

                  this.assigneeMapScopeStates[assignee] = state
                })
            }
          })
      }
    },
    computed: {
      orderedTasks() {
        return this.map ? Object.values(this.map.graph.nodes).map(({ taskId }) => taskId) : []
      },
      orderedTaskData() {
        if(this.map) return (
            this.orderedTasks.map(taskId => this.taskData[taskId] || { name: '...' })
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
        if (!this.assignment?.content) return {}

        const assigneeMapScopes = {}
        const { content } = this.assignment

        this
          .mutatedScopesInContext
          .forEach(({ owner, target, context }) => {
            if (context.length === 2 && context[1] === content) {
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

    },
    methods: {
      userIsActive(user) {
        return this.now - this.lastAssigneeInteractionTimes[user] < 5000
      },
      taskIdForNode(nodeId) {
        return this.map.graph.nodes[nodeId]?.taskId
      },
      logAssigneeState(assignee) {
        console.log('ASSIGNEE STATE', this.assigneeMapScopeStates[assignee])
      }
    }
  }

</script>

<style scoped>

.assignment-tables {
  display: flex;
  justify-content: space-around;
  align-items: top;
}

.active-status {
  width: 12px;
  height: 12px;
  border-radius: 10px;
  margin: 0 10px;
  background: lightgrey;
}
.active-status.active {
  background: #adff2f;
}
.item-cell {
  border: 2px solid transparent;
}
.item-cell.active {
  border: 2px solid orange;
}
</style>

