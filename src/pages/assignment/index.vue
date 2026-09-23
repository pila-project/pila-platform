<template>
  <div v-if="assignment && playableId && addVariables" class="wrapper">
    <vueEmbedComponent
      :id="playableId"
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
import studyEnvironmentVariableProxy from '@/utils/study-environment-variable-proxy.js'
import { primaryAssignmentContentId } from '@/utils/dashboard-sequence-items.js'
import { isStudentVisibleAssignment } from '@/utils/assignment-status.js'
import { SEQUENCE_SYNC_TIMEOUT_MS, withTimeout } from '@/utils/sequence-items.js'
import {
  contentOwnsSequencePerformance,
  ensureLeafPerformance,
  finishLeafPerformance,
  leafPerformancePath,
  tickLeafPerformance,
} from '@/utils/leaf-performance.js'

const route = useRoute()
const store = useStore()

const { id } = route.params
const assignment = ref(null)
const addVariables = ref(null)
const playableId = computed(() => primaryAssignmentContentId(assignment.value))

const t = slug => store.getters.t(slug)

let leafTimer = null
let leafContentId = null
let playClosed = false

function stopLeafTimer() {
  if (!leafTimer) return
  clearInterval(leafTimer)
  leafTimer = null
}

async function startLeafPerformance(contentId) {
  if (!contentId) return
  try {
    const contentState = await Agent.state(contentId)
    if (contentOwnsSequencePerformance(contentState)) return
  } catch {
    // Still record. A missing content document is not a matching sequence.
  }
  if (playClosed) {
    try {
      const perf = await Agent.state(leafPerformancePath(id, contentId))
      finishLeafPerformance(perf, contentId)
    } catch (e) {
      console.warn('[Assignment] failed to record play', id, contentId, e)
    }
    return
  }
  leafContentId = contentId
  try {
    const perf = await Agent.state(leafPerformancePath(id, contentId))
    if (playClosed) {
      finishLeafPerformance(perf, contentId)
      return
    }
    ensureLeafPerformance(perf, contentId)
    leafTimer = setInterval(() => tickLeafPerformance(perf, contentId), 1000)
  } catch (e) {
    leafContentId = null
    console.warn('[Assignment] failed to record play', id, contentId, e)
  }
}

async function closeAssignment(info) {
  playClosed = true
  stopLeafTimer()
  if (leafContentId) {
    try {
      const perf = await Agent.state(leafPerformancePath(id, leafContentId))
      finishLeafPerformance(perf, leafContentId, info)
      await withTimeout(
        Agent.synced(),
        SEQUENCE_SYNC_TIMEOUT_MS,
        'leaf performance sync timed out',
      )
    } catch (e) {
      console.warn('[Assignment] failed to record close', id, leafContentId, e)
    }
  }
  Agent.close()
}

onBeforeUnmount(stopLeafTimer)

onMounted(async () => {
  try {
    const state = await Agent.state(id)
    // `to` membership already implies a class record; still hide Draft / not-due Scheduled.
    if (!isStudentVisibleAssignment(state, { hasAssignedGroups: true })) {
      assignment.value = state
      return
    }
    assignment.value = state
    const { owner: teacher } = await Agent.metadata(id)
    addVariables.value = await studyEnvironmentVariableProxy({}, teacher)
    await startLeafPerformance(primaryAssignmentContentId(state))
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
