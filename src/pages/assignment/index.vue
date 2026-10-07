<template>
  <div v-if="playMode === 'sequence' && localSequenceId && addVariables" class="wrapper sequence-play">
    <div class="sequence-bar">
      <button type="button" class="sequence-leave" @click="endCurrentContent()">
        {{ t('close') }}
      </button>
    </div>
    <SequencePreviewBody
      :key="contentIndex + ':' + localSequenceId"
      :sequence-id="localSequenceId"
      :start-index="sequenceStartIndex"
      :focus-index="sequenceFocusIndex"
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
  <div
    v-if="competencyCard && (playMode === 'sequence' || playMode === 'embed')"
    class="sequence-end-card"
  >
    <div class="sequence-end-panel">
      <div
        v-for="(row, key) in competencyCard.rows"
        :key="key"
        class="sequence-end-row"
      >
        <span>{{ key }}</span>
        <span>{{ row[0] }} / {{ row[1] }}</span>
      </div>
      <button type="button" class="sequence-end-next" @click="dismissCompetencyCard">
        {{ competencyCard.advance ? t('next') : t('close') }}
      </button>
    </div>
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
  closeHasScoreRows,
  closePayload,
  competencyCardDismissFollowUp,
  normalizeAssignmentContent,
  sequenceItemCloseFollowUp,
} from '@/utils/assignment-content.js'
import { candliGamesForSequenceItems } from '@/candli-games.js'
import { isStudentVisibleAssignment } from '@/utils/assignment-status.js'
import { SEQUENCE_SYNC_TIMEOUT_MS, normalizeSequenceItems, withTimeout } from '@/utils/sequence-items.js'
import { shouldPlaySameHostSequence } from '@/utils/same-host-sequence.js'
import SequencePreviewBody from '@/components/content/sequence-preview-body.vue'
import {
  competencyMet,
  competencyScoreRows,
  competencyScoreSignature,
  competencyWatchUpdate,
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
const sequenceFocusIndex = ref(null)
const competencyCard = ref(null)
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
let stopCompetencyWatch = null
let competencyWatchGeneration = 0
let watchedContentId = ''
let scoreCardArmed = false
let lastScoreSignature = ''

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
  void watchCompetencyScores(sequenceItemIds[index])
}

function stopScoreWatch() {
  competencyWatchGeneration += 1
  if (typeof stopCompetencyWatch === 'function') stopCompetencyWatch()
  stopCompetencyWatch = null
  watchedContentId = ''
  scoreCardArmed = false
  lastScoreSignature = ''
}

function presentScoreCard(rows, { pendingEnd = false } = {}) {
  const sequenceCard = playMode.value === 'sequence' && !pendingEnd
  scoreCardArmed = true
  lastScoreSignature = competencyScoreSignature(rows)
  competencyCard.value = {
    index: sequenceCard ? sequenceIndex : null,
    rows,
    advance: sequenceCard
      && competencyMet(rows) === true
      && sequenceIndex + 1 < sequenceItemIds.length,
    pendingEnd: !sequenceCard,
  }
}

function applyWatchedScores(competencies) {
  const decision = competencyWatchUpdate({
    armed: scoreCardArmed,
    previousSignature: lastScoreSignature,
    competencies,
  })
  if (decision.action === 'show') presentScoreCard(decision.rows)
  else if (!scoreCardArmed) lastScoreSignature = decision.signature
}

// Chirpy writes the kept-best score here and does not send a second close on Replay.
async function watchCompetencyScores(contentId) {
  if (!contentId || contentId === watchedContentId) return
  stopScoreWatch()
  const generation = competencyWatchGeneration
  watchedContentId = contentId
  let gameId = null
  try {
    const games = await candliGamesForSequenceItems([{ id: contentId }])
    gameId = games[0] || null
  } catch (e) {
    console.warn('[Assignment] failed to resolve competency game', contentId, e)
    return
  }
  if (generation !== competencyWatchGeneration || !gameId) return
  let primed = false
  try {
    stopCompetencyWatch = Agent.watch(`${id}/pila/competencies/${gameId}`, (payload) => {
      if (generation !== competencyWatchGeneration) return
      const doc = payload && typeof payload === 'object' && 'state' in payload
        ? payload.state
        : payload
      if (!primed) {
        primed = true
        // A card can already be up before the first snapshot. An empty
        // snapshot must not replace the rows the close just showed.
        if (scoreCardArmed) applyWatchedScores(doc)
        else lastScoreSignature = competencyScoreSignature(competencyScoreRows(doc))
        return
      }
      applyWatchedScores(doc)
    })
  } catch (e) {
    console.warn('[Assignment] failed to watch competency scores', contentId, e)
  }
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
  const rows = competencyScoreRows(info?.competencies)
  const followUp = sequenceItemCloseFollowUp({
    itemCount: sequenceItemIds.length,
    itemIndex: index,
    hasScoreRows: Object.keys(rows).length > 0,
  })
  if (followUp === 'card') {
    sequenceIndex = index
    presentScoreCard(rows)
    return
  }
  if (followUp === 'end-content') void endCurrentContent(info)
}

function dismissCompetencyCard() {
  const card = competencyCard.value
  competencyCard.value = null
  if (card?.pendingEnd) {
    void endCurrentContent()
    return
  }
  const followUp = competencyCardDismissFollowUp({
    itemCount: sequenceItemIds.length,
    itemIndex: card?.index,
    advance: !!card?.advance,
  })
  if (followUp === 'next-item') {
    sequenceFocusIndex.value = card.index + 1
    return
  }
  if (followUp === 'end-content') void endCurrentContent()
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
  competencyCard.value = null
  stopScoreWatch()
  sequenceFocusIndex.value = null
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
    void watchCompetencyScores(contentId)
  }
  if (generation !== playGeneration) return
  playMode.value = mode
}

async function endCurrentContent(info) {
  if (
    endingContent
    || playMode.value === 'continuation'
    || playMode.value === 'closing'
    || playMode.value === 'switching'
  ) return
  const close = closePayload(info)
  // A second close while the card is up must not leave the assignment.
  // Chirpy only closes once; Replay writes the saved score instead.
  if (playMode.value === 'embed' && competencyCard.value) return
  if (playMode.value === 'embed' && closeHasScoreRows(close)) {
    presentScoreCard(competencyScoreRows(close.competencies), { pendingEnd: true })
    return
  }
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
  stopScoreWatch()
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

.sequence-play :deep(.spb-root) {
  flex: 1;
  min-height: 0;
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
  padding: 20px;
  border-radius: 12px;
  background: #fff;
  color: #334155;
}

.sequence-end-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 0;
  border-bottom: 1px solid #e2e8f0;
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
