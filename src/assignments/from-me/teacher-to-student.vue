<template>
  <div v-if="loading">
    ...
  </div>
  <div v-else>
    <div>
      Name
      <input v-model="assignment.name" />
    </div>
    <div>
      Description
      <textarea v-model="assignment.description" />
    </div>
    <div>
      Content
      <input v-model="assignment.content" />
    </div>
  </div>
  <table>
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
        </td>
        <td v-for="task in orderedTasks">
          <ScopeWatcher
            v-if="assigneeTasksToScopes[assignee][task]"
            :id="assigneeTasksToScopes[assignee][task]"
          />
          <span v-else> - </span>
        </td>
      </tr>
    </tbody>
  </table>
  <GroupAssigner
    :id="id"
    :groups="$store.getters['groups/groups']('class')"
    assignment_type="teacher-to-student"
  />
</template>

<script>
  import { v4 as uuid } from 'uuid'
  import { vuePersistentComponent } from '@knowlearning/agents/vue.js'
  import GroupAssigner from '../../components/groups/assigner.vue'
  import ScopeWatcher from '../../components/scope-watcher.vue'

  export default {
    props: {
      id: String
    },
    components: {
      GroupAssigner,
      vuePersistentComponent,
      ScopeWatcher
    },
    data() {
      return {
        loading: true,
        selectedFile: 'UNSELECTED',
        assignment: null,
        mutatedScopesInContext: [],
        map: null,
        taskMetadata: {},
        users: []
      }
    },
    async created() {
      Agent
        .query('mutated-in-context', [this.id])
        .then(results => this.mutatedScopesInContext = results)
      this.assignment = await Agent.state(this.id)
      this.loading = false

      this.map = await Agent.state(this.assignment.content)
      Object
        .keys(this.map.nodes)
        .forEach(async nodeId => {
          this.taskMetadata[nodeId] = await Agent.metadata(nodeId)
        })
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