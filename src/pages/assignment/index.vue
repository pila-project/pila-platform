<template>
  <div v-if="klEmbed && playMode === 'embed' && playableId && addVariables" class="wrapper sequence-play">
    <div class="sequence-bar">
      <button type="button" class="sequence-leave" @click="endCurrentContent()">
        {{ t('close') }}
      </button>
    </div>
    <div class="kl-embed-host">
      <vueEmbedComponent
        :key="contentIndex + ':' + playableId"
        :id="playableId"
        @close="endCurrentContent"
        :namespace="route.params.id"
        :environmentProxy="addVariables"
        allow="camera;microphone;fullscreen"
      />
    </div>
  </div>
  <div v-else-if="playMode === 'sequence' && localSequenceId && addVariables" class="wrapper sequence-play">
    <div class="sequence-bar">
      <button type="button" class="sequence-leave" @click="endCurrentContent()">
        {{ t('close') }}
      </button>
    </div>
    <SequencePreviewBody
      :key="contentIndex + ':' + localSequenceId"
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
      :key="contentIndex + ':' + playableId"
      :id="playableId"
      @close="endCurrentContent"
      :namespace="route.params.id"
      :environmentProxy="addVariables"
      allow="camera;microphone;fullscreen"
    />
  </div>
  <div v-else-if="playMode === 'continuation'" class="wrapper">
    <div class="sequence-end-card">
      <div class="sequence-end-panel">
        <p class="sequence-end-lead">{{ t('next-sequence-prompt') }}</p>
        <div class="sequence-end-actions">
          <button type="button" class="sequence-end-next" @click="continueToNextContent">
            {{ t('continue') }}
          </button>
          <button type="button" class="sequence-end-leave" @click="leaveAssignment">
            {{ t('leave') }}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-else-if="playMode === 'loading' || playMode === 'switching' || playMode === 'closing'">
    ... {{ t('loading') }} ...
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
import {
  assignmentContentEndAction,
  closePayload,
  isLastSequenceItem,
  normalizeAssignmentContent,
} from '@/utils/assignment-content.js'
import { isStudentVisibleAssignment } from '@/utils/assignment-status.js'
import { SEQUENCE_SYNC_TIMEOUT_MS, normalizeSequenceItems, withTimeout } from '@/utils/sequence-items.js'
import { shouldPlaySameHostSequence } from '@/utils/same-host-sequence.js'
import { planKlAssignmentPlay } from '@/utils/kl-assignment-play.js'
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
const contentIds = ref([])
const contentIndex = ref(0)
const playableId = computed(() => contentIds.value[contentIndex.value] || '')

const t = slug => store.getters.t(slug)

let leafTimer = null
let leafContentId = null
let playClosed = false
let sequencePerf = null
let sequenceItemIds = []
let sequenceIndex = 0
let playGeneration = 0
let endingContent = false
// One Know Learning player URL. That frame writes sequence progress. This page does not.
const klEmbed = ref(false)

function stopLeafTimer() {
  if (!leafTimer) return
  clearInterval(leafTimer)
  leafTimer = null
}

// The Datawise teacher dashboard watches
// `{assignment}/activity/{version}/{app}/{activityId}` inside namespace = assignment id.
// The competency dashboard watches `{assignment}/pila/competencies/...` the same way.
// An item prefix, or an allow list with no outer assignment frame, stores those
// writes where neither dashboard reads them. Direct activities already use this id.
function sequenceEmbedNamespace() {
  return id
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
  if (!payload) return
  const index = Number(payload.index)
  const itemId = payload.itemId || sequenceItemIds[index]
  if (!Number.isInteger(index) || !itemId) return
  const info = closePayload(payload.info)
  if (sequencePerf) {
    finishSequenceItemPerformance(sequencePerf, index, itemId, info)
  }
  if (isLastSequenceItem(sequenceItemIds.length, index)) void endCurrentContent(info)
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

function resetPlayRecord() {
  stopLeafTimer()
  playClosed = false
  sequencePerf = null
  sequenceItemIds = []
  sequenceIndex = 0
  leafContentId = null
  sequenceStartIndex.value = 0
  localSequenceId.value = ''
}

async function finishCurrentContent(info) {
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
}

async function openContentAt(index) {
  const generation = ++playGeneration
  resetPlayRecord()
  contentIndex.value = index
  const contentId = contentIds.value[index] || ''
  if (!contentId) {
    playMode.value = 'unavailable'
    return
  }
  playMode.value = 'switching'
  // The URL is create.pilaproject.org/{id}. Know Learning writes the sequence
  // doc. Skip contentPlaysHere and performance ticks.
  if (klEmbed.value) {
    if (generation !== playGeneration) return
    playMode.value = 'embed'
    return
  }
  let mode = 'embed'
  try {
    mode = await contentPlaysHere(contentId) ? 'sequence' : 'embed'
  } catch (e) {
    console.warn('[Assignment] content play check failed', contentId, e)
    mode = 'embed'
  }
  if (generation !== playGeneration) return
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
  if (generation !== playGeneration) return
  playMode.value = mode
}

async function endCurrentContent(info) {
  if (klEmbed.value) {
    if (endingContent || playMode.value === 'closing') return
    endingContent = true
    playMode.value = 'closing'
    try {
      await withTimeout(
        Agent.synced(),
        SEQUENCE_SYNC_TIMEOUT_MS,
        'KL embed sync timed out',
      )
    } catch (e) {
      console.warn('[Assignment] failed to sync KL embed', id, e)
    } finally {
      Agent.close()
      endingContent = false
    }
    return
  }
  if (
    endingContent
    || playMode.value === 'continuation'
    || playMode.value === 'closing'
    || playMode.value === 'switching'
  ) return
  const close = closePayload(info)
  endingContent = true
  const action = assignmentContentEndAction(contentIds.value.length, contentIndex.value)
  try {
    await finishCurrentContent(close)
    if (action === 'choose') {
      playMode.value = 'continuation'
      return
    }
    playMode.value = 'closing'
    Agent.close()
  } finally {
    endingContent = false
  }
}

async function continueToNextContent() {
  if (playMode.value !== 'continuation') return
  const next = contentIndex.value + 1
  if (next >= contentIds.value.length) {
    playMode.value = 'closing'
    Agent.close()
    return
  }
  await openContentAt(next)
}

function leaveAssignment() {
  playMode.value = 'closing'
  Agent.close()
}

onBeforeUnmount(() => {
  stopLeafTimer()
})

onMounted(async () => {
  try {
    const state = await Agent.state(id)
    // `to` membership already implies a class record; still hide Draft / not-due Scheduled.
    if (!isStudentVisibleAssignment(state, { hasAssignedGroups: true })) {
      assignment.value = state
      playMode.value = 'unavailable'
      return
    }
    const { owner: teacher } = await Agent.metadata(id)
    const proxy = await studyEnvironmentVariableProxy({}, teacher)
    assignment.value = state
    addVariables.value = proxy
    contentIds.value = normalizeAssignmentContent(state?.content)
    klEmbed.value = false
    try {
      const plan = await planKlAssignmentPlay({
        assignmentId: id,
        assignmentState: state,
      })
      if (plan.kind === 'kl' && plan.playableId) {
        contentIds.value = [plan.playableId]
        klEmbed.value = true
      }
    } catch (e) {
      console.warn('[Assignment] KL player plan failed', id, e)
      klEmbed.value = false
    }
    await openContentAt(0)
  } catch (e) {
    console.error('[Assignment] failed to load', id, e)
    playMode.value = 'unavailable'
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

.sequence-play :deep(.spb-root),
.kl-embed-host {
  flex: 1;
  min-height: 0;
}

.kl-embed-host {
  position: relative;
}

.kl-embed-host :deep(iframe) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.sequence-end-card {
  position: fixed;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
}

.sequence-end-panel {
  width: min(420px, calc(100% - 32px));
  padding: 22px 22px 18px;
  border-radius: 16px;
  background: #fff;
  color: var(--color-slate-700, #334155);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
}

.sequence-end-lead {
  margin: 0;
}

.sequence-end-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.sequence-end-next {
  margin-top: 16px;
  border: 0;
  border-radius: 8px;
  background: #0f172a;
  color: #fff;
  font: inherit;
  padding: 8px 14px;
  cursor: pointer;
}

.sequence-end-actions .sequence-end-next {
  margin-top: 0;
}

.sequence-end-leave {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font: inherit;
  padding: 8px 14px;
  cursor: pointer;
}

@media (max-width: 767px) {
  .sequence-play :deep(.preview-sidebar) {
    display: none;
  }

  .sequence-end-actions .sequence-end-next,
  .sequence-end-leave {
    flex: 1 1 8rem;
    min-height: 44px;
  }
}
</style>
