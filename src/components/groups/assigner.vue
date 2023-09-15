<template>
  <div class="assignment-tables">
    <div>
      <table>
        <tr>
          <th>Group</th>
          <th></th>
        </tr>
        <tr
          v-for="assignment_id in assignmentsFor(id)"
          :key="assignment_id"
        >
          <td>
            {{ groupForAssignment(assignment_id) }}
          </td>
          <td>
            <button @click="removeAssignment(assignment_id)">x</button>
          </td>
        </tr>
      </table>
    </div>
    <div>
      <table>
        <tr>
          <th></th>
          <th>Group</th>
        </tr>
        <tr
          v-for="group_id in groups"
          :key="group_id"
        >
          <td>
            <button @click="makeAssignment(group_id, id, assignment_type)">+</button>
          </td>
          <td>{{ group_id }}</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script>
  import UserInfo from '../user-info.vue'
  import ScopeValue from '../scope-value.vue'

  export default {
    props: {
      id: String,
      groups: Object,
      assignment_type: String
    },
    components: {
      ScopeValue,
      UserInfo
    },
    methods: {
      assignmentsFor(item_id) {
        return this.$store.getters['assignments/assignments'](item_id, this.assignment_type)
      },
      groupForAssignment(assignment_id) {
        return this.$store.getters['assignments/get'](assignment_id).group_id
      },
      makeAssignment(group_id, item_id, assignment_type) {
        console.dir({ group_id, item_id, assignment_type })
        this.$store.dispatch('assignments/assign', { group_id, item_id, assignment_type })
      },
      removeAssignment(assignment_id) {
        this.$store.dispatch('assignments/unassign', assignment_id)
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