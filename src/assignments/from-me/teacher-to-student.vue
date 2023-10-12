<template>
  <div v-if="loading">
    ...
  </div>
  <div v-else>
    <div>
      <h4>Give your assignement a name*</h4>
      <input v-model="assignment.name" />
      <h4>Give your assignement a description</h4>
      <textarea v-model="assignment.description" />
    </div>
    <div style="display: flex; justify-content: center;">
      <div>
        <div style="margin: 8px;">
          <h4>Select the content to assign*</h4>
        </div>
        <div style="flex-grow: 1; display: flex;">
          <div style="display; flex; flex-direction: column; margin: 8px;">
            <div>
              <h4>Your Content</h4>
            </div>
            <div style="background: #6BEAC9; flex-grow: 1; min-height: 128px; min-width: 192px"></div>
          </div>
          <div style="display; flex; flex-direction: column; margin: 8px;">
            <div>
              <h4>Expert Content</h4>
            </div>
            <div style="background: #2E9DF9; flex-grow: 1; min-height: 128px; min-width: 192px"></div>
          </div>
          <div></div>
        </div>
      </div>
      <div style="margin: 8px;">
        <h4>Select Classes for the Assignment*</h4>
        <GroupAssigner
          :id="id"
          :groups="$store.getters['groups/groups']('class')"
          assignment_type="teacher-to-student"
        />
      </div>
    </div>
  </div>
</template>

<script>
  import { v4 as uuid, validate as isUUID } from 'uuid'
  import Dashboard from './dashboard/index.vue'
  import GroupAssigner from '../../components/groups/assigner.vue'

  export default {
    props: {
      id: String
    },
    components: {
      Dashboard,
      GroupAssigner
    },
    data() {
      return {
        loading: true,
        assignment: null
      }
    },
    async created() {
      this.assignment = await Agent.state(this.id)
      this.loading = false
    },
    computed: {
      hasValidContent() {
        return this.assignment && isUUID(this.assignment.content)
      }
    }
  }

</script>
