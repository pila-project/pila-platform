<template>
  <div v-if="playMode === 'sequence' && localSequenceId && addVariables" class="wrapper sequence-play">
    <div class="sequence-bar">
      <button type="button" class="sequence-leave" @click="closeAssignment()">
        {{ t('close') }}
      </button>
    </div>
    <SequencePreviewBody
      :sequence-id="localSequenceId"
      :start-index="sequenceStartIndex"
      :environment-proxy="addVariables"
      :embed-namespace="sequenceEmbedNamespace"
      @header="onSequenceHeader"
      @item-close="onSequenceItemClose"
    />
  </div>
  <div v-else-if="playMode === 'embed' && playableId && addVariables" class="wrapper">
    <vueEmbedComponent
      :id="playableId"
      @close="closeAssignment"
      :namespace="route.params.id"
      :environmentProxy="addVariables"
      allow="camera;microphone;fullscreen"
    />
  </div>
  <div v-else-if="loadSettled">
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
import { SEQUENCE_SYNC_TIMEOUT_MS, normalizeSequenceItems, withTimeout } from '@/utils/sequence-items.js'
import { shouldPlaySameHostSequence } from '@/utils/same-host-sequence.js'
import SequencePreviewBody from '@/components/content/sequence-preview-body.vue'
import {
  contentOwnsSequencePerformance,
  ensureLeafPerformance,
  ensureSequencePerformance,
  finishLeafPerformance,
  finishSequenceItemPerformance,
  leafPerformancePath,
  tickLeafPerformance,
  tickSequencePerformance,
} from '@/utils/leaf-performance.js'

const route = useRoute()
const store = useStore()

const { id } = route.params
const assignment = ref(null)
const addVariables = ref(null)
const loadSettled = ref(false)
const playMode = ref('loading')
const localSequenceId = ref('')
const sequenceStartIndex = ref(0)
const playableId = computed(() => primaryAssignmentContentId(assignment.value))

const t = slug => store.getters.t(slug)

let leafTimer = null
let leafContentId = null
let playClosed = false
let sequencePerf = null
let sequenceItemIds = []
let sequenceIndex = 0

function stopLeafTimer() {
  if (!leafTimer) return
  clearInterval(leafTimer)
  leafTimer = null
}

function sequenceEmbedNamespace(index) {
  return {
    prefix: `${id}/sequence-${localSequenceId.value}-item-${index}`,
    allow: [
      'pila/competencies',
      'pila/latest_competencies',
      'my-',
    ],
  }
}

async function contentPlaysHere(contentId) {
  const [meta, contentState] = await Promise.all([
    Agent.metadata(contentId),
    Agent.state(contentId),
  ])
  return shouldPlaySameHostSequence({
    host: window.location.host,
    domain: meta?.domain,
    player: contentState?.reference?.player,
    activeType: meta?.active_type,
    itemCount: normalizeSequenceItems(contentState?.items).length,
  })
}

async function startSequencePerformance(sequenceId) {
  const contentState = await Agent.state(sequenceId)
  sequenceItemIds = normalizeSequenceItems(contentState?.items)
  if (!sequenceItemIds.length) return
  sequencePerf = await Agent.state(leafPerformancePath(id, sequenceId))
  ensureSequencePerformance(sequencePerf, sequenceItemIds)
  const restored = Number(sequencePerf.activeItemIndex)
  sequenceIndex = Number.isInteger(restored) && restored >= 0 && restored < sequenceItemIds.length
    ? restored
    : 0
  sequenceStartIndex.value = sequenceIndex
  if (playClosed) return
  leafTimer = setInterval(() => {
    const itemId = sequenceItemIds[sequenceIndex]
    if (!sequencePerf || !itemId || playClosed) return
    tickSequencePerformance(sequencePerf, sequenceIndex, itemId)
  }, 1000)
}

function onSequenceHeader(header) {
  const index = Number(header?.index)
  if (!Number.isInteger(index) || index < 0 || index >= sequenceItemIds.length) return
  sequenceIndex = index
  if (sequencePerf) sequencePerf.activeItemIndex = index
}

function onSequenceItemClose(payload) {
  if (!sequencePerf || !payload) return
  const index = Number(payload.index)
  const itemId = payload.itemId || sequenceItemIds[index]
  if (!Number.isInteger(index) || !itemId) return
  finishSequenceItemPerformance(sequencePerf, index, itemId, payload.info)
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
  try {
    if (sequencePerf) {
      await withTimeout(
        Agent.synced(),
        SEQUENCE_SYNC_TIMEOUT_MS,
        'sequence performance sync timed out',
      )
    } else if (leafContentId) {
      const perf = await Agent.state(leafPerformancePath(id, leafContentId))
      finishLeafPerformance(perf, leafContentId, info)
      await withTimeout(
        Agent.synced(),
        SEQUENCE_SYNC_TIMEOUT_MS,
        'leaf performance sync timed out',
      )
    }
  } catch (e) {
    console.warn('[Assignment] failed to record close', id, leafContentId || localSequenceId.value, e)
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
    const { owner: teacher } = await Agent.metadata(id)
    const proxy = await studyEnvironmentVariableProxy({}, teacher)
    assignment.value = state
    addVariables.value = proxy
    const contentId = primaryAssignmentContentId(state)
    let mode = 'embed'
    if (contentId) {
      try {
        mode = await contentPlaysHere(contentId) ? 'sequence' : 'embed'
      } catch (e) {
        console.warn('[Assignment] content play check failed', contentId, e)
        mode = 'embed'
      }
    }
    if (mode === 'sequence') {
      localSequenceId.value = contentId
      try {
        await startSequencePerformance(contentId)
      } catch (e) {
        console.warn('[Assignment] failed to record sequence play', id, contentId, e)
      }
    } else {
      await startLeafPerformance(contentId)
    }
    playMode.value = mode
  } catch (e) {
    console.error('[Assignment] failed to load', id, e)
  } finally {
    loadSettled.value = true
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

.sequence-play {
  display: flex;
  flex-direction: column;
}

.sequence-bar {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
}

.sequence-leave {
  border: 0;
  background: transparent;
  color: #334155;
  font: inherit;
  cursor: pointer;
}

.sequence-play :deep(.spb-root) {
  flex: 1;
  min-height: 0;
}

@media (max-width: 767px) {
  .sequence-play :deep(.preview-sidebar) {
    display: none;
  }
}
</style>
