<template>
  <PModal
    width="90vw"
    height="90vh"
    @close="$emit('close')"
  >
    <template #title>
      <div>
        <span class="font-semibold">Preview: "{{ seqState.name || 'Untitled' }}"</span>
        <span v-if="seqState.items?.length" class="text-sm font-normal text-slate-500 ml-2">
          Question {{ currentIndex + 1 }} of {{ seqState.items.length }}
        </span>
      </div>
    </template>

    <template #body>
      <div v-if="!loaded" class="flex items-center justify-center h-full text-slate-400">
        <LucideIcon name="loader-2" :size="14" :spin="true" class="inline mr-2" /> Loading...
      </div>
      <div v-else-if="!seqState.items?.length" class="flex items-center justify-center h-full text-slate-400">
        No items in this sequence
      </div>
      <div v-else class="preview-layout">
        <!-- Left: item list -->
        <div class="preview-sidebar">
          <button
            v-for="(itemId, i) in seqState.items"
            :key="itemId"
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

        <!-- Right: content preview -->
        <div class="preview-content">
          <vueEmbedComponent
            :key="currentItemId"
            :id="currentItemId"
            style="position: absolute; inset: 0;"
            namespace="preview"
            allow="camera;microphone;fullscreen"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="preview-nav">
        <PButton
          variant="ghost"
          text="Previous"
          icon="lucide:chevron-left"
          :disabled="currentIndex === 0"
          @click="currentIndex--"
        />
        <div class="preview-dots">
          <button
            v-for="(_, i) in seqState.items"
            :key="i"
            class="preview-dot"
            :class="{ 'preview-dot-active': i === currentIndex }"
            @click="currentIndex = i"
          >{{ i + 1 }}</button>
        </div>
        <PButton
          variant="primary"
          text="Next"
          icon="lucide:chevron-right"
          :icon-right="true"
          :disabled="currentIndex >= (seqState.items?.length || 1) - 1"
          @click="currentIndex++"
        />
      </div>
    </template>
  </PModal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
import NameOrTranslatedNameFromItemId from './name-or-translated-name-from-item-id.vue'
import { PModal, PButton } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'

const props = defineProps({
  id: { type: String, required: true },
})

defineEmits(['close'])

const seqState = ref({ name: '', items: [] })
const loaded = ref(false)
const currentIndex = ref(0)

const currentItemId = computed(() => seqState.value.items?.[currentIndex.value] || '')

onMounted(async () => {
  const state = await Agent.state(props.id)
  seqState.value = state
  loaded.value = true
})
</script>

<style scoped>
.preview-layout {
  display: flex;
  height: 100%;
  gap: 0;
}

.preview-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
  padding: 8px 0;
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
  min-height: 400px;
}

.preview-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.preview-dots {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.preview-dot {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms;
}
.preview-dot:hover {
  background: #f8fafc;
}
.preview-dot-active {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}
</style>
