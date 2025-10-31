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
import {
  TREATMENT_TAG,
  CONTROL_TAG,
  OPT_OUT_TAG,
  HOST_TO_PARTITION,
  HOST_TO_FORCED_ASSIGNMENT_LANGUAGE
} from '../../constants.js'

const route = useRoute()
const store = useStore()

const { id } = route.params
const assignment = ref(await Agent.state(id))

const t = slug => store.getters.t(slug)
const closeAssignment = () => Agent.close()

const partition = HOST_TO_PARTITION[window.location.host]

const { auth: { user } } = await Agent.environment()

const [ treatmentTagging, optOutTagging ] = await Promise.all([
  Agent.query('tagging-for-target', [partition, TREATMENT_TAG, user], 'tags.knowlearning.systems'),
  Agent.query('tagging-for-target', [partition, OPT_OUT_TAG, user], 'tags.knowlearning.systems')
])

const isInTreatment = treatmentTagging.length > 0 && optOutTagging.length === 0

async function addVariables(e) {
  const env = await Agent.environment(e)
  if (!env.variables) return env

  const variables = {
    ...env.variables,
    TREATMENT: isInTreatment
  }
  const forcedLang = HOST_TO_FORCED_ASSIGNMENT_LANGUAGE[window.location.host]
  if (forcedLang) variables.FORCED_LANGUAGE = forcedLang

  return { ...env, variables }
}

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
