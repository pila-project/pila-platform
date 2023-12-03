<template>
  <tr v-if="loading">
    <td>-</td>
    <td>-</td>
    <td>-</td>
    <td>-</td>
  </tr>
  <tr v-else>
    <td><vueScopeComponent :id="assignedItemId" :path="['name']" /></td>
    <td><vueScopeComponent :id="assignedItemId" :path="['description']" /></td>
    <td><DecryptedName :user="assignmentMetadata.owner" /></td>
    <td><button @click="$emit('play')">{{ t('play') }}</button></td>
  </tr>

</template>

<script>
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import DecryptedName from '../../components/decrypted-name.vue'

  export default {
    props: {
      id: String
    },
    components: {
      vueScopeComponent,
      DecryptedName
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
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) }
    }
  }
</script>