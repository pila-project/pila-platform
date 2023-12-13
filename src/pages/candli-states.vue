<template>
  <div>
    <h3>Reset States For</h3>
    <div v-for="id, label in resetableStates">
      {{label}} <button @click="reset(id)">reset</button>
      <button @click="showing[id] = !showing[id]">
        {{ showing[id] ? 'hide' : 'show'}}
      </button>
      <pre v-if="showing[id]"><vueScopeComponent :id="id" /></pre>
    </div>
  </div>
</template>

<script>
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'

  export default{
    components: { vueScopeComponent },
    data() {
      return {
        resetableStates: {
          'All Achievements': 'candli/attributes',
          'Candli Tutorial': 'candli/games/tutorial',
          'Candli Level 1': 'candli/games/level1',
          'Candli Level 2': 'candli/games/level2',
          'Candli Level 3': 'candli/games/level3'
        },
        showing: {}
      }
    },
    methods: {
      reset(id) {
        Agent.reset(id)
      }
    }
  }

</script>