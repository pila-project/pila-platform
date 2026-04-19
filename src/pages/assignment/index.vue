<template>
  <div v-if="assignment && assignment.content && addVariables" class="wrapper">
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
import studyEnvironmentVariableProxy from '@/utils/study-environment-variable-proxy.js'

const route = useRoute()
const store = useStore()

const { id } = route.params
const assignment = ref(null)
const addVariables = ref(null)

const t = slug => store.getters.t(slug)
const closeAssignment = () => Agent.close()

onMounted(async () => {
  try {
    assignment.value = await Agent.state(id)
    const { owner: teacher } = await Agent.metadata(id)
    addVariables.value = await studyEnvironmentVariableProxy({}, teacher)
  } catch (e) {
    console.error('[Assignment] failed to load', id, e)
  }
})

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
