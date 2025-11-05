<template>
  <div v-if="assignment && assignment.content" class="wrapper">
    <vueEmbedComponent
      :id="assignment.content"
      @close="closeAssignment"
      :namespace="route.params.id"
      :environmentProxy="addVariables"
      allow="camera;microphone;fullscreen"
    />
  </div>
  <div v-else-if="assignment">
    {{ t('there-is-an-issue-with-your-assignment-please-as') }}
  </div>
  <div v-else>
    ... {{ t('loading') }} ...
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
import studyEnvironmentVariableProxy from '../../study-environment-variable-proxy.js'

const route = useRoute()
const store = useStore()

const { id } = route.params
const assignment = ref(await Agent.state(id))

const t = slug => store.getters.t(slug)
const closeAssignment = () => Agent.close()

const addVariables = await studyEnvironmentVariableProxy()

</script>

<style scoped>
.wrapper {
  position: absolute;
  background: white;
  width: 100vw;
  height: calc(var(--vh, 1vh) * 100);
  top: 0;
  left: 0;
}
</style>
