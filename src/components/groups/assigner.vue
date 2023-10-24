<template>
  <div class="assignment-tables">
    <table>
      <tbody>
        <tr
          v-for="group_id in groups"
          :key="group_id"
        >
          <td>
            <input
              type="checkbox"
              :checked="!!assignmentForGroup(group_id)"
              @click="toggleAssignment(group_id)"
            />
          </td>
          <td>
            <ScopeWatcher
              :id="group_id"
              :path="['name']"
            />
          </td>
        </tr>
        <tr
          v-for="n in Math.max(0, 6 - groups.length)"
          :key="n"
        >
          <td>-</td>
          <td>-</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
  import UserInfo from '../user-info.vue'
  import ScopeWatcher from '../scope-watcher.vue'

  export default {
    props: {
      id: String,
      groups: Array,
      assignment_type: String
    },
    components: {
      ScopeWatcher,
      UserInfo
    },
    computed: {
      assignments() {
        return this.$store.getters['assignments/assignments'](this.id, this.assignment_type)
      }
    },
    methods: {
      groupForAssignment(assignment_id) {
        return this.$store.getters['assignments/get'](assignment_id).group_id
      },
      makeAssignment(group_id, item_id, assignment_type) {
        this.$store.dispatch('assignments/assign', { group_id, item_id, assignment_type })
      },
      removeAssignment(assignment_id) {
        this.$store.dispatch('assignments/unassign', assignment_id)
      },
      assignmentForGroup(group_id) {
        return this.assignments.find(id => this.groupForAssignment(id) === group_id)
      },
      toggleAssignment(group_id) {
        const assignment_id = this.assignmentForGroup(group_id)
        if (assignment_id) this.removeAssignment(assignment_id)
        else this.makeAssignment(group_id, this.id, this.assignment_type)
      }
    }

  }

</script>

<style>

.assignment-tables {
  margin: 16px;
  display: flex;
  justify-content: space-around;
  align-items: top;
}

</style>