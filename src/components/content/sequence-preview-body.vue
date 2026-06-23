<template>
  <div class="spb-root" :class="{ 'spb-root-nested': nested }">
    <div v-if="!loaded" class="spb-center spb-muted">
      <LucideIcon name="loader-2" :size="14" :spin="true" class="inline mr-2" />
      Loading...
    </div>
    <div v-else-if="!seqState.items.length" class="spb-center spb-muted">
      No items in this sequence
    </div>
    <template v-else>
      <div class="preview-layout">
        <div class="preview-sidebar" :class="{ 'preview-sidebar-nested': nested }">
          <button
            v-for="(itemId, i) in seqState.items"
            :key="itemId + '-' + i"
            class="preview-sidebar-item"
            :class="{ 'preview-sidebar-item-active': i === currentIndex }"
            @click="currentIndex = i"
          >
            <span class="preview-sidebar-num">{{ i + 1 }}</span>
            <span class="preview-sidebar-name">
              <NameOrTranslatedNameFromItemId :itemId="itemId" />
            </span>
          </button>
        </div>

        <div class="preview-content">
          <div v-if="resolvingCurrentItem" class="spb-center spb-muted">
            <LucideIcon name="loader-2" :size="14" :spin="true" class="inline mr-2" />
            Loading...
          </div>
          <div v-else-if="isCircularReference" class="spb-center spb-muted spb-circular">
            This sequence can't be previewed here because it creates a circular reference.
          </div>
          <div v-else-if="isNestingTooDeep" class="spb-center spb-muted spb-circular">
            This sequence is nested too deeply to preview here.
          </div>
          <SequencePreviewBody
            v-else-if="currentItemIsSequence"
            :sequence-id="currentItemId"
            :ancestor-ids="childAncestorIds"
            nested
          />
          <vueEmbedComponent
            v-else-if="currentItemId"
            :key="currentItemId"
            :id="currentItemId"
            class="spb-embed"
            namespace="preview"
            :environmentProxy="addPreviewVariable"
            allow="camera;microphone;fullscreen"
          />
        </div>
      </div>

      <div class="preview-nav">
        <PButton
          variant="ghost"
          text="Previous"
          icon="lucide:chevron-left"
          :disabled="currentIndex === 0"
          @click="currentIndex--"
        />
        <PPageNumbers
          v-if="seqState.items.length > 1"
          :current-page="currentIndex + 1"
          :total-pages="seqState.items.length"
          @select="currentIndex = $event - 1"
        />
        <PButton
          :variant="nested ? 'ghost' : 'primary'"
          text="Next"
          icon="lucide:chevron-right"
          :icon-right="true"
          :disabled="currentIndex >= seqState.items.length - 1"
          @click="currentIndex++"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
import NameOrTranslatedNameFromItemId from './name-or-translated-name-from-item-id.vue'
import { PButton, PPageNumbers } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { normalizeSequenceItems } from '@/utils/sequence-items.js'
import { getContentMetadata } from '@/utils/content-cache.js'
import { isSequenceContentMeta } from '@/utils/open-content-preview.js'
import studyEnvironmentVariableProxy from '@/utils/study-environment-variable-proxy.js'
import SequencePreviewBody from './sequence-preview-body.vue'

const MAX_NESTING_DEPTH = 12

const props = defineProps({
  sequenceId: { type: String, required: true },
  nested: { type: Boolean, default: false },
  ancestorIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['header'])

const seqState = ref({ name: '', items: [] })
const loaded = ref(false)
const currentIndex = ref(0)
const itemIsSequence = ref({})
const resolvingCurrentItem = ref(false)

let previewVarProxy = null

const currentItemId = computed(() => seqState.value.items[currentIndex.value] || '')

const currentItemIsSequence = computed(
  () => !!currentItemId.value && itemIsSequence.value[currentItemId.value] === true,
)

const isCircularReference = computed(() => {
  const id = currentItemId.value
  if (!id) return false
  return props.ancestorIds.includes(id) || id === props.sequenceId
})

const isNestingTooDeep = computed(
  () => props.ancestorIds.length >= MAX_NESTING_DEPTH,
)

const childAncestorIds = computed(
  () => [...props.ancestorIds, props.sequenceId],
)

function emitHeader() {
  emit('header', {
    name: seqState.value.name,
    index: currentIndex.value,
    total: seqState.value.items.length,
  })
}

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

async function isItemSequence(id) {
  if (!id) return false
  if (id in itemIsSequence.value) return itemIsSequence.value[id]
  try {
    const meta = await getContentMetadata(id)
    const isSeq = isSequenceContentMeta(meta)
    itemIsSequence.value = { ...itemIsSequence.value, [id]: isSeq }
    return isSeq
  } catch {
    itemIsSequence.value = { ...itemIsSequence.value, [id]: false }
    return false
  }
}

async function preloadItemTypes(itemIds) {
  await Promise.all(itemIds.map(id => isItemSequence(id)))
}

async function ensureCurrentItemType() {
  const id = currentItemId.value
  if (!id || id in itemIsSequence.value) return
  resolvingCurrentItem.value = true
  try {
    await isItemSequence(id)
  } finally {
    resolvingCurrentItem.value = false
  }
}

async function loadSequence() {
  loaded.value = false
  try {
    const state = await Agent.state(props.sequenceId)
    const items = normalizeSequenceItems(state?.items)
    seqState.value = {
      name: state?.name || '',
      items,
    }
    currentIndex.value = 0
    await preloadItemTypes(items)
  } finally {
    loaded.value = true
    emitHeader()
  }
}

watch(currentIndex, async () => {
  await ensureCurrentItemType()
  emitHeader()
})

onMounted(() => {
  void loadSequence()
})
</script>

<style scoped>
.spb-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.spb-root-nested {
  position: absolute;
  inset: 0;
}

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

.spb-circular {
  padding: 24px;
  text-align: center;
  font-size: 14px;
  line-height: 1.5;
}

.spb-embed {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.preview-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 0;
}

.preview-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
  padding: 8px 0;
}

.preview-sidebar-nested {
  width: 180px;
}

.preview-sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  color: #334155;
  transition: background 100ms;
}

.preview-sidebar-item:hover {
  background: #f8fafc;
}

.preview-sidebar-item-active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 500;
}

.preview-sidebar-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.preview-sidebar-item-active .preview-sidebar-num {
  background: #2563eb;
  color: white;
}

.preview-sidebar-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-content {
  flex: 1;
  position: relative;
  min-height: 0;
}

.preview-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.spb-root-nested .preview-nav {
  padding-top: 8px;
}
</style>