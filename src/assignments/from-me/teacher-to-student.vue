<template>
  <div v-if="loading">
    ...
  </div>
  <div style="margin: 16px;" v-else>
    <div>
      <h4>{{ t('give-your-assignment-a-name') }}</h4>
      <input
        v-model="assignment.name"
        class="rounded-grey"
        style="width: 50%;"
      />
      <h4>{{ t('give-your-assignment-a-description') }}</h4>
      <textarea
        v-model="assignment.description"
        class="rounded-grey"
        style="width: 70%; height: 64px;"
      />
    </div>
    <div style="display: flex; justify-content: center;">
      <div style="display: flex; flex-direction: column;">
        <div style="margin: 8px;">
          <h4>{{ t('select-the-content-to-assign') }}*</h4>
        </div>
        <div style="flex-grow: 1; display: flex;">
          <div style="display: flex; flex-direction: column; margin: 8px; margin-left: 32px; margin-bottom: 16px;">
            <div>
              <h4>{{ t('your-content') }}</h4>
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
              <h4>{{ t('expert-content') }}</h4>
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
        <h4>{{ t('select-classes-for-the-assignment') }}*</h4>
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
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) }
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