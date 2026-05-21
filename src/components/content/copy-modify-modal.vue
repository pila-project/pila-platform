<template>
  <PModal
    :title="step === 'success' ? '' : step === 1 ? t('copy-and-modify-content') : t('preview-details')"
    width="520px"
    @close="$emit('close')"
  >
    <template #body>
      <!-- Step 1: Copy details -->
      <div v-if="step === 1">
        <p class="text-sm text-slate-500 mb-1">
          {{ t('step-1-of-2') }}: {{ t('create-your-own-version') }} "{{ originalName }}"
        </p>

        <div class="stepper-mini mt-3">
          <div class="stepper-mini-dot stepper-mini-active"><LucideIcon name="file-output" :size="10" /></div>
          <div class="stepper-mini-line" />
          <div class="stepper-mini-dot"><LucideIcon name="eye" :size="10" /></div>
        </div>

        <div class="info-banner">
          <LucideIcon name="info" :size="14" class="text-primary-500" />
          <span>{{ t('copy-will-be-created-info') }}</span>
        </div>

        <div class="flex flex-col gap-4 mt-4">
          <PInput
            v-model="form.title"
            :label="t('new-title')"
            required
            :placeholder="t('copy-of') + '...'"
          />
          <PInput
            v-model="form.description"
            :label="t('description')"
            :placeholder="originalDescription || t('describe-this-content')"
            multiline
            :rows="3"
          />
          <PInput
            v-model="form.notes"
            :label="t('customization-notes')"
            :placeholder="t('describe-changes-planned')"
            multiline
            :rows="2"
          />

          <!-- Image upload -->
          <div>
            <label class="text-sm font-medium text-slate-700 block mb-1">{{ t('upload-image') }}</label>
            <div
              class="image-upload-area"
              :class="{ 'image-upload-dragover': imageDragover }"
              @click="$refs.imageInput.click()"
              @dragover.prevent="imageDragover = true"
              @dragleave="imageDragover = false"
              @drop.prevent="onImageDrop"
            >
              <div v-if="imagePreview" class="image-upload-preview">
                <img :src="imagePreview" alt="Upload preview" />
                <button class="image-upload-remove" @click.stop="removeImage">
                  <LucideIcon name="x" :size="11" />
                </button>
              </div>
              <div v-else class="image-upload-placeholder">
                <LucideIcon name="upload" :size="20" class="text-slate-400" />
                <span class="text-sm font-medium text-primary-600">{{ t('upload-image') }}</span>
                <span class="text-xs text-slate-400">{{ t('drag-and-drop-image') }}</span>
              </div>
              <input ref="imageInput" type="file" accept="image/*" class="hidden" @change="onImageSelect" />
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Preview details -->
      <div v-else-if="step === 2">
        <p class="text-sm text-slate-500 mb-4">
          {{ t('step-2-of-2') }}: {{ t('review-existing-content') }}
        </p>
        <div class="stepper-mini">
          <div class="stepper-mini-dot stepper-mini-done"><LucideIcon name="check" :size="10" /></div>
          <div class="stepper-mini-line stepper-mini-line-done" />
          <div class="stepper-mini-dot stepper-mini-active"><LucideIcon name="eye" :size="10" /></div>
        </div>

        <!-- Add content CTA -->
        <div class="add-content-cta" @click="showContentBrowser = !showContentBrowser">
          <LucideIcon name="circle-plus" :size="14" class="text-slate-400" />
          <span class="text-sm font-medium text-primary-600">{{ t('add-content-item-or-sequence') }}</span>
        </div>

        <!-- Inline content browser -->
        <div v-if="showContentBrowser" class="content-browser">
          <div class="content-browser-toolbar">
            <button class="content-browser-btn" @click="browserSearch = !browserSearch">
              <LucideIcon name="search" :size="12" />
            </button>
            <span class="text-xs text-slate-500">{{ t('view-as') }}:</span>
            <div class="content-browser-toggles">
              <button class="content-browser-toggle" :class="{ active: browserView === 'list' }" @click="browserView = 'list'">
                <LucideIcon name="list" :size="12" />
              </button>
              <button class="content-browser-toggle" :class="{ active: browserView === 'grid' }" @click="browserView = 'grid'">
                <LucideIcon name="layout-grid" :size="12" />
              </button>
            </div>
            <button class="content-browser-btn" @click="browserFilter = !browserFilter">
              <LucideIcon name="sliders-horizontal" :size="12" /> {{ t('filter') }}
            </button>
          </div>
          <div v-if="browserSearch" class="mb-2">
            <PInput v-model="browserSearchQuery" :placeholder="t('search-content')" icon="lucide:search" />
          </div>
          <div class="content-browser-list">
            <div
              v-for="itemId in browsableItems"
              :key="itemId"
              class="content-browser-row"
            >
              <input
                type="checkbox"
                :checked="selectedContentIds.has(itemId)"
                class="copy-item-check"
                @change="toggleContentItem(itemId)"
              />
              <span class="content-browser-name">
                <NameOrTranslatedNameFromItemId :itemId="itemId" />
              </span>
              <span class="content-browser-source" :class="myContentIds.has(itemId) ? 'source-mine' : 'source-expert'">
                {{ myContentIds.has(itemId) ? t('my-content') : t('expert') }}
              </span>
            </div>
            <div v-if="!browsableItems.length" class="text-xs text-slate-400 text-center py-4">
              {{ t('no-content-found') }}
            </div>
          </div>
        </div>

        <!-- Current items list -->
        <div class="copy-items-header mt-3">
          <input
            type="checkbox"
            :checked="allItemsSelected"
            class="copy-item-check"
            @change="toggleAllItems"
          />
          <span class="text-xs font-medium text-slate-500">{{ t('title-and-details') }}</span>
        </div>
        <div v-if="!allAvailableItems.length" class="text-sm text-slate-400 text-center py-8">
          {{ t('no-content-items-to-preview') }}
        </div>
        <div v-else class="copy-items-list">
          <div
            v-for="itemId in allAvailableItems"
            :key="itemId"
            class="copy-item-row"
          >
            <input
              type="checkbox"
              :checked="selectedContentIds.has(itemId)"
              class="copy-item-check"
              @change="toggleContentItem(itemId)"
            />
            <div class="copy-item-info">
              <span class="copy-item-title">
                <NameOrTranslatedNameFromItemId :itemId="itemId" />
                <span class="copy-item-source" :class="myContentIds.has(itemId) ? 'source-mine' : 'source-expert'">
                  . {{ myContentIds.has(itemId) ? t('my-content') : t('expert') }}
                </span>
              </span>
              <span class="copy-item-desc">{{ itemDescriptions.get(itemId) || '' }}</span>
            </div>
          </div>
        </div>
        <p class="text-xs text-primary-600 mt-2">{{ selectedContentIds.size }} of {{ allAvailableItems.length }} rows selected.</p>
      </div>

      <!-- Success -->
      <div v-else-if="step === 'success'" class="success-state">
        <div class="success-icon-ring">
          <LucideIcon name="check" :size="24" class="text-green-600" />
        </div>
        <h3 class="text-lg font-semibold text-zinc-950 mt-4">{{ t('content-copied-successfully') }}</h3>
        <p class="text-sm text-slate-500 mt-2">
          {{ t('find-in-my-content') }} "{{ form.title }}"
        </p>
      </div>
    </template>

    <template #footer>
      <template v-if="step === 1">
        <PButton variant="secondary" color="danger" :text="t('cancel')" @click="$emit('close')" />
        <PButton
          variant="primary"
          :text="t('create-copy')"
          :disabled="!form.title.trim()"
          @click="step = 2"
        />
      </template>
      <template v-else-if="step === 2">
        <PButton variant="ghost" :text="t('back')" @click="step = 1" />
        <PButton
          variant="primary"
          :text="t('finish')"
          :loading="saving"
          @click="createCopy"
        />
      </template>
      <template v-else-if="step === 'success'">
        <PButton variant="primary" :text="t('continue')" @click="$emit('created', createdId)" />
      </template>
    </template>
  </PModal>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import NameOrTranslatedNameFromItemId from './name-or-translated-name-from-item-id.vue'
import getName from '@/utils/name-and-translation-for-content.js'
import setTagging from '@/utils/set-tagging.js'
import { MY_CONTENT_TAG } from '@/utils/constants.js'
import { PModal, PInput, PButton } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { useStore } from 'vuex'

const store = useStore()
function t(slug) { return store.getters.t(slug) }
const partition = store.getters.tagPartition
const pilaTag = '1a53db50-e248-11ee-ab5f-07f4a7408770'

const props = defineProps({
  id: { type: String, required: true },
})

const emit = defineEmits(['close', 'created'])

const step = ref(1)
const saving = ref(false)
const createdId = ref(null)
const originalName = ref('...')
const originalDescription = ref('')
const originalItems = ref([])
const selectedContentIds = reactive(new Set())

// Image upload state
const imageDragover = ref(false)
const imagePreview = ref(null)
const imageFile = ref(null)

// Step 2: content browser state
const showContentBrowser = ref(false)
const browserSearch = ref(false)
const browserSearchQuery = ref('')
const browserView = ref('list')
const browserFilter = ref(false)
const allBrowsableContent = ref([])
const myContentIds = reactive(new Set())
const itemDescriptions = reactive(new Map())

const form = reactive({
  title: '',
  description: '',
  notes: '',
})

// All items: original + any newly added from browser
const allAvailableItems = computed(() => {
  const itemSet = new Set(originalItems.value)
  selectedContentIds.forEach(id => itemSet.add(id))
  return [...itemSet]
})

const allItemsSelected = computed(() => {
  if (!allAvailableItems.value.length) return false
  return allAvailableItems.value.every(id => selectedContentIds.has(id))
})

const browsableItems = computed(() => {
  let list = allBrowsableContent.value
  if (browserSearchQuery.value) {
    const q = browserSearchQuery.value.toLowerCase()
    list = list.filter(id => {
      const desc = itemDescriptions.get(id) || ''
      return desc.toLowerCase().includes(q)
    })
  }
  return list
})

function toggleContentItem(id) {
  if (selectedContentIds.has(id)) selectedContentIds.delete(id)
  else selectedContentIds.add(id)
}

function toggleAllItems() {
  if (allItemsSelected.value) {
    allAvailableItems.value.forEach(id => selectedContentIds.delete(id))
  } else {
    allAvailableItems.value.forEach(id => selectedContentIds.add(id))
  }
}

// Image upload handlers
function onImageSelect(e) {
  const file = e.target.files?.[0]
  if (file) setImage(file)
}

function onImageDrop(e) {
  imageDragover.value = false
  const file = e.dataTransfer.files?.[0]
  if (file && file.type.startsWith('image/')) setImage(file)
}

function setImage(file) {
  imageFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => { imagePreview.value = e.target.result }
  reader.readAsDataURL(file)
}

function removeImage() {
  imageFile.value = null
  imagePreview.value = null
}

async function createCopy() {
  if (saving.value) return
  saving.value = true

  try {
    const id = await Agent.create({
      active_type: 'application/json;type=sequence',
      active: {
        name: form.title.trim(),
        description: form.description.trim(),
        notes: form.notes.trim(),
        items: [...selectedContentIds],
        copiedFrom: props.id,
      },
    })

    await setTagging({ tag: MY_CONTENT_TAG, target: id, value: true })
    createdId.value = id
    step.value = 'success'
  } catch (e) {
    console.error('[CopyModifyModal] create error:', e)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    // Load original content info
    const name = await getName(props.id, store.getters.language())
    originalName.value = name || t('untitled')
    form.title = t('copy-of') + ' ' + originalName.value

    const state = await Agent.state(props.id)
    originalDescription.value = state.description || ''
    form.description = originalDescription.value

    if (state.items && Array.isArray(state.items)) {
      originalItems.value = state.items
      state.items.forEach(id => selectedContentIds.add(id))
    }

    // Load browsable content for Step 2
    const env = await Agent.environment()
    const userId = env.auth.user

    const [pilaContent, myContent] = await Promise.all([
      Agent.query('taggings-for-tag', [partition, pilaTag], 'tags.knowlearning.systems').catch(() => []),
      Agent.query('taggings-for-tag', [userId, MY_CONTENT_TAG], 'tags.knowlearning.systems').catch(() => []),
    ])

    myContent.forEach(t => myContentIds.add(t.target))

    const allIds = [...new Set([...pilaContent.map(t => t.target), ...myContent.map(t => t.target)])]
    allBrowsableContent.value = allIds

    // Load names for browsable items
    await Promise.allSettled(allIds.map(async (id) => {
      const n = await getName(id, store.getters.language())
      if (n) itemDescriptions.set(id, n)
    }))
  } catch (e) {
    console.warn('[CopyModifyModal] load error:', e)
  }
})
</script>

<style scoped>
.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #eff6ff;
  border-radius: 8px;
  font-size: 13px;
  color: #1e40af;
  margin-top: 12px;
}

.stepper-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 16px;
}
.stepper-mini-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #e2e8f0;
  background: white;
  color: #94a3b8;
}
.stepper-mini-done {
  border-color: #2563eb;
  background: white;
  color: #2563eb;
}
.stepper-mini-active {
  border-color: #2563eb;
  background: #2563eb;
  color: white;
}
.stepper-mini-line {
  width: 60px;
  height: 2px;
  background: #e2e8f0;
}
.stepper-mini-line-done {
  background: #2563eb;
}

/* Image upload */
.image-upload-area {
  border: 2px dashed #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms;
  overflow: hidden;
}
.image-upload-area:hover {
  border-color: #2563eb;
}
.image-upload-dragover {
  border-color: #2563eb;
  background: #eff6ff;
}
.image-upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 24px 16px;
}
.image-upload-preview {
  position: relative;
  display: flex;
  justify-content: center;
  padding: 8px;
}
.image-upload-preview img {
  max-height: 120px;
  max-width: 100%;
  object-fit: contain;
  border-radius: 4px;
}
.image-upload-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.5);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}
.hidden {
  display: none;
}

/* Add content CTA */
.add-content-cta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border: 1px dashed #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms;
  margin-bottom: 8px;
}
.add-content-cta:hover {
  border-color: #2563eb;
  background: #f8fafc;
}

/* Content browser */
.content-browser {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
}
.content-browser-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.content-browser-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  font-size: 12px;
  color: #334155;
  cursor: pointer;
}
.content-browser-btn:hover {
  background: #f1f5f9;
}
.content-browser-toggles {
  display: flex;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}
.content-browser-toggle {
  padding: 4px 8px;
  border: none;
  background: white;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}
.content-browser-toggle.active {
  background: #eff6ff;
  color: #2563eb;
}
.content-browser-list {
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.content-browser-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 6px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  color: #334155;
}
.content-browser-row:last-child {
  border-bottom: none;
}
.content-browser-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.content-browser-source {
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}
.source-mine {
  color: #2563eb;
}
.source-expert {
  color: #f59e0b;
}

/* Items list */
.copy-items-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
}
.copy-items-list {
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}
.copy-item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
}
.copy-item-row:last-child {
  border-bottom: none;
}
.copy-item-check {
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
  cursor: pointer;
  flex-shrink: 0;
}
.copy-item-info {
  flex: 1;
  min-width: 0;
}
.copy-item-title {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.copy-item-source {
  font-size: 11px;
  font-weight: 500;
  margin-left: 4px;
}
.copy-item-desc {
  font-size: 12px;
  color: #94a3b8;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 1px;
}

.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 16px;
}
.success-icon-ring {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f0fdf4;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
