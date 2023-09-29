<template>
  <tr v-if="loading">
    <td>-</td>
    <td>-</td>
    <td>-</td>
    <td>-</td>
  </tr>
  <tr v-else>
    <td><ScopeWatcher :id="assignedItemId" :path="['name']" /></td>
    <td><ScopeWatcher :id="assignedItemId" :path="['description']" /></td>
    <td><UserInfo :user="assignmentMetadata.owner" /></td>
    <td><button @click="$emit('play')">play</button></td>
  </tr>

</template>

<script>
  import ScopeWatcher from '../../components/scope-watcher.vue'
  import UserInfo from '../../components/user-info.vue'

  export default {
    props: {
      id: String
    },
    components: {
      ScopeWatcher,
      UserInfo
    },
    data() {
      return {
        loading: true,
        assignment: null,
        assignedItemId: null
      }
    },
    async created() {
      this.assignment = await Agent.state(this.id)
      this.assignmentMetadata = await Agent.metadata(this.id)
      this.assignedItemId = this.assignment.item_id
      this.loading = false
    }
  }
</script>