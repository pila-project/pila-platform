<template>
  <div class="wrapper">
    <table>
      <thead>
        <tr>
          <th>{{ t('name') }}</th>
          <th>{{ t('description') }}</th>
          <th>{{ t('assigner') }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <AssignmentRow
          v-for="id in assignments"
          :key="id"
          :id="id"
          @play="play(id)"
        />
      </tbody>
    </table>
  </div>
  <div
    class="assignment-overlay"
    v-if="playing"
  >
    <vueEmbedComponent
      :id="playing"
      @close="playing = null"
    />
  </div>
</template>

<script>
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import AssignmentRow from './assignment-row.vue'

  export default {
    components: {
      vueEmbedComponent,
      AssignmentRow
    },
    props: {
      type: String
    },
    data() {
      return {
        playing: null
      }
    },
    computed: {
      assignments() {
        const me = this.$store.state.user
        return this.$store.getters['assignments/to'](me, this.type)
      }
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) },
      async play(assignment_id) {
        const assignment = await Agent.state(assignment_id)
        this.playing = assignment.item_id
      }
    }
  }
</script>

<style scoped>

.wrapper table {
  margin: auto;
}

.assignment-overlay
{
  position: fixed;
  top: 0;
  left: 0;
  background: white;
  width: 100vw;
  height: 100vh;
}

</style>