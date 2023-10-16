<template>
  <div v-if="loading">
    ...
  </div>
  <div style="margin: 16px;" v-else>
    <div>
      <h4>Give your assignement a name*</h4>
      <input
        v-model="assignment.name"
        style="
          padding: 8px 16px;
          margin: 16px 0;
          border-radius: 16px;
          border: none;
          width: 50%;
          background: #CCCCCC;
        "
      />
      <h4>Give your assignement a description</h4>
      <textarea
        v-model="assignment.description"
        style="
          padding: 8px 16px;
          margin: 16px 0;
          border-radius: 16px;
          border: none;
          resize: none;
          width: 70%;
          height: 64px;
          background: #CCCCCC;
        "
      />
    </div>
    <div style="display: flex; justify-content: center;">
      <div style="display: flex; flex-direction: column;">
        <div style="margin: 8px;">
          <h4>Select the content to assign*</h4>
        </div>
        <div style="flex-grow: 1; display: flex;">
          <div style="display: flex; flex-direction: column; margin: 8px; margin-left: 32px; margin-bottom: 16px;">
            <div>
              <h4>Your Content</h4>
            </div>
            <div style="background:  rgba(107, 234, 201, 0.33); flex-grow: 1; min-height: 128px; min-width: 192px">
              <div
                v-for="id in userContent"
                :key="id"
                :class="{
                  'content-entry': true,
                  selected: id === assignment.content
                }"
                @click="assignment.content = id"
              >
                <vueScopeComponent :id="id" :path="['name']" />&nbsp;
              </div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; margin: 8px; margin-bottom: 16px;">
            <div>
              <h4>Expert Content</h4>
            </div>
            <div style="background: rgba(46, 157, 249, 0.33); flex-grow: 1; min-height: 128px; min-width: 192px">
              <div
                v-for="id in expertContent"
                :key="id"
                :class="{
                  'content-entry': true,
                  selected: id === assignment.content
                }"
                @click="assignment.content = id"
              >
                <vueScopeComponent :id="id" :path="['name']" />
              </div>
            </div>
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
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'

  export default {
    props: {
      id: String
    },
    components: {
      Dashboard,
      GroupAssigner,
      vueScopeComponent
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
      },
      expertContent() {
        return this.$store.getters['pila_tags/withTag']('expert')
      },
      userContent() {
        return this.$store.getters['pila_tags/withTag']('tracked')
      }
    }
  }

</script>

<style>
  .content-entry
  {
    padding: 4px 8px;
    border: 1px solid transparent;
    border-radius: 16px;
  }
  .selected
  {
    border: 1px solid blue;
  }

</style>