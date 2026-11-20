<template>
  <PModal
    layer="preview"
    width="98vw"
    height="98vh"
    noPadBody
    enableFullscreen
    @close="$emit('close')"
  >
    <template #title>
      <div>
        <span class="font-semibold">{{ previewTitle(titleName) }}</span>
        <span v-if="showCounter" class="text-sm font-normal text-slate-500 ml-2">
          {{ questionCounter(header) }}
        </span>
      </div>
    </template>

    <template #body>
      <div v-if="phase === 'decide'" class="spb-center spb-muted">
        <LucideIcon name="loader-2" :size="14" :spin="true" class="inline mr-2" />
        {{ t('loading') }}
      </div>
      <div v-else-if="phase === 'kl'" class="kl-embed-host">
        <vueEmbedComponent
          :id="klPlayerUrl(id)"
          namespace="preview"
          :environmentProxy="addPreviewVariable"
          allow="camera;microphone;fullscreen"
        />
      </div>
      <SequencePreviewBody
        v-else
        :sequence-id="id"
        @header="header = $event"
      />
    </template>
  </PModal>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
import { PModal } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import SequencePreviewBody from './sequence-preview-body.vue'
import { klSequencePlayable } from '@/utils/kl-assignment-play.js'
import { klPlayerUrl } from '@/utils/kl-player.js'
import { leafPerformancePath } from '@/utils/leaf-performance.js'
import {
  KL_SEQUENCE_PLAYER_HOST,
  SEQUENCE_SYNC_TIMEOUT_MS,
  withTimeout,
} from '@/utils/sequence-items.js'
import studyEnvironmentVariableProxy from '@/utils/study-environment-variable-proxy.js'

const props = defineProps({
  id: { type: String, required: true },
})

const store = useStore()
function t(slug) { return store.getters.t(slug) }

function previewTitle(name) {
  return `${t('preview')}: "${name || t('untitled')}"`
}

function questionCounter(header) {
  return t('item-n-of-n')
    .replace('{current}', String((header.index || 0) + 1))
    .replace('{total}', String(header.total || 0))
}

defineEmits(['close'])

const header = ref({ name: '', index: 0, total: 0 })
const phase = ref('decide')
const klName = ref('')

const titleName = computed(() => (
  phase.value === 'kl' ? klName.value : header.value.name
))
const showCounter = computed(() => (
  phase.value === 'fallback' && header.value.total
))

let previewVarProxy = null

async function resolvePreviewProxy() {
  if (!previewVarProxy) {
    previewVarProxy = studyEnvironmentVariableProxy({ PREVIEW: true })
  }
  return previewVarProxy
}

async function addPreviewVariable(e) {
  const fn = await resolvePreviewProxy()
  return fn(e)
}

async function resetPreviewProgress(sequenceId) {
  try {
    const doc = await withTimeout(
      Agent.state(leafPerformancePath('preview', sequenceId)),
      SEQUENCE_SYNC_TIMEOUT_MS,
      'Preview progress timed out',
    )
    if (doc && typeof doc === 'object') {
      for (const key of Object.keys(doc)) delete doc[key]
    }
    await withTimeout(Agent.synced(), SEQUENCE_SYNC_TIMEOUT_MS, 'Preview progress sync timed out')
  } catch {
    // Still show the player; a stale preview doc is better than a blocked modal.
  }
}

let unmounted = false

async function decidePreview() {
  const playableCheck = klSequencePlayable({ sequenceId: props.id }).catch(() => false)
  let domain = ''
  let name = ''
  try {
    const [meta, state] = await Promise.all([
      withTimeout(Agent.metadata(props.id), SEQUENCE_SYNC_TIMEOUT_MS, 'Sequence metadata timed out'),
      withTimeout(Agent.state(props.id), SEQUENCE_SYNC_TIMEOUT_MS, 'Sequence state timed out'),
    ])
    domain = meta?.domain || ''
    name = state?.name || ''
  } catch {
    // Fall through; missing metadata keeps today's preview body.
  }
  const playable = await playableCheck
  if (unmounted) return

  if (playable || domain === KL_SEQUENCE_PLAYER_HOST) {
    klName.value = name
    await resetPreviewProgress(props.id)
    if (unmounted) return
    phase.value = 'kl'
    return
  }

  phase.value = 'fallback'
}

onMounted(() => {
  void decidePreview()
})

onBeforeUnmount(() => {
  unmounted = true
})
</script>

<style scoped>
.spb-center {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
}

.spb-muted {
  color: #94a3b8;
}

.kl-embed-host {
  position: absolute;
  inset: 0;
}

.kl-embed-host :deep(iframe) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>