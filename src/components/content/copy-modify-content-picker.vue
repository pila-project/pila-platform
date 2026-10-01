<template>
  <Teleport to="body">
    <div v-if="open" class="cb-overlay">
      <div class="cb-backdrop" @click="close" />
      <div class="cb-modal">
        <div class="cb-modal-header">
          <h2 class="cb-modal-title">{{ t('add-content-item-or-sequence') }}</h2>
          <PButton variant="icon" size="xsm" icon="lucide:x" iconOnly @click="close" />
        </div>

        <div class="cb-header">
          <div>
            <h3 class="cb-section-title">
              <LucideIcon name="clipboard-list" :size="16" class="cb-section-icon" />
              {{ t('explore-content-library') }}
            </h3>
            <p class="cb-section-desc">{{ t('discover-customise-and-add-content-to-your-assignments') }}</p>
          </div>
          <PButton
            v-if="pickerNewSelectionCount > 0"
            variant="primary"
            icon="lucide:plus"
            :text="addSelectedButtonLabel"
            @click="addSelected"
          />
        </div>

        <div class="cb-grid-area">
          <ContentBrowser
            :columns="3"
            :per-page="12"
            use-disk-cache
          >
            <template #card="{ id, source, grades }">
              <TaggedContentCard
                :id="id"
                :checked="isInCopy(id) || cbSelectedItems.has(id)"
                :in-assignment="isInCopy(id)"
                :nesting-blocked="isKnownSequence(id)"
                :source="source"
                :grades="grades"
                @toggle-select="toggleSelection(id)"
                @preview="emit('preview', id)"
                @add="addOne(id)"
              />
            </template>
          </ContentBrowser>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { useStore } from 'vuex'
import ContentBrowser from '@/components/content/content-browser.vue'
import TaggedContentCard from '@/components/tags/tagged-content-card.vue'
import { PButton } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { useToast } from '@/utils/useToast.js'
import { metadataCache, metadataCacheVersion } from '@/utils/content-cache.js'
import {
  isSequenceActiveType,
  partitionKnownSequenceMemberIds,
} from '@/utils/sequence-items.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  existingItemIds: { type: Array, default: () => [] },
  copyTitle: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'add', 'preview'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }
const { info: toastInfo, error: toastError } = useToast()

const cbSelectedItems = reactive(new Set())

const existingIdSet = computed(() => new Set(props.existingItemIds))

watch(() => props.open, (isOpen) => {
  if (isOpen) cbSelectedItems.clear()
})

watch(metadataCacheVersion, () => {
  for (const id of [...cbSelectedItems]) {
    if (isKnownSequence(id)) cbSelectedItems.delete(id)
  }
})

function isInCopy(id) {
  return existingIdSet.value.has(id)
}

function isKnownSequence(id) {
  void metadataCacheVersion.value
  return isSequenceActiveType(metadataCache.get(id)?.active_type)
}

function splitAddable(ids) {
  return partitionKnownSequenceMemberIds(ids, {
    isSequence: isKnownSequence,
  })
}

function close() {
  emit('update:open', false)
}

const pickerNewSelectionCount = computed(() => {
  const newIds = []
  for (const id of cbSelectedItems) {
    if (!existingIdSet.value.has(id)) newIds.push(id)
  }
  return splitAddable(newIds).allowed.length
})

const addSelectedButtonLabel = computed(() => {
  const newCount = pickerNewSelectionCount.value
  const selectedTotal = cbSelectedItems.size
  const titleSuffix = props.copyTitle ? ` ${t('to')} "${props.copyTitle}"` : ''
  if (newCount < selectedTotal) {
    return `${t('add-selected')} (${newCount} ${t('of')} ${selectedTotal})${titleSuffix}`
  }
  if (newCount > 0 && props.existingItemIds.length > 0) {
    return `${t('add-selected')} (${newCount} ${t('new')})${titleSuffix}`
  }
  if (newCount > 0) {
    return `${t('add-selected')} (${newCount})${titleSuffix}`
  }
  return `${t('add-selected')} (${selectedTotal})${titleSuffix}`
})

function toggleSelection(id) {
  if (isInCopy(id) || isKnownSequence(id)) return
  if (cbSelectedItems.has(id)) cbSelectedItems.delete(id)
  else cbSelectedItems.add(id)
}

function addOne(id) {
  if (isKnownSequence(id)) {
    toastError(t('sequences-cannot-be-nested'))
    return
  }
  if (isInCopy(id)) {
    toastInfo(t('already-in-sequence'))
    return
  }
  emit('add', [id])
  cbSelectedItems.delete(id)
  close()
}

function addSelected() {
  const selected = [...cbSelectedItems]
  const newIds = selected.filter(id => !existingIdSet.value.has(id))
  const already = selected.filter(id => existingIdSet.value.has(id))
  const { allowed, rejectedSequences } = splitAddable(newIds)
  for (const id of rejectedSequences) cbSelectedItems.delete(id)
  if (rejectedSequences.length) toastError(t('sequences-cannot-be-nested'))
  if (!allowed.length) {
    if (already.length && !rejectedSequences.length) {
      toastInfo(t('all-selected-already-in-sequence'))
    }
    return
  }
  emit('add', allowed)
  cbSelectedItems.clear()
  close()
  if (already.length) {
    toastInfo(
      `${allowed.length} ${t('items-added')}. ${already.length} ${t('already-in-sequence')}.`,
    )
  }
}
</script>

<style scoped>
.cb-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-nested);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cb-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}
.cb-modal {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.05);
  width: 984px;
  max-width: 92vw;
  height: 85vh;
  padding: 24px;
  overflow: hidden;
}
.cb-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.cb-modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}
.cb-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 0 12px;
  flex-shrink: 0;
  gap: 12px;
}
.cb-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.cb-section-icon {
  color: #2563eb;
}
.cb-section-desc {
  font-size: 12px;
  color: #64748b;
  margin: 4px 0 0;
}
.cb-grid-area {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

@media (max-width: 768px) {
  .cb-overlay {
    align-items: flex-end;
  }
  .cb-modal {
    width: 100%;
    max-width: 100vw;
    height: 92vh;
    border-radius: 16px 16px 0 0;
    padding: 16px;
  }
}
</style>