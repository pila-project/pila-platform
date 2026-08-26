<template>
  <div class="create-tab">
  <div class="create-tab-body">
  <div v-if="customizersAvailable">
    <h3>{{ t('create-your-own-content') }}</h3>
    <p class="create-hint">{{ t('create-your-own-content-hint') }}</p>
    <button
      class="custom-button"
      @click="openLink('https://bettysbrain.knowlearning.systems/bb/custom/causal-map?auth=true&oecd=true&custom=true')"
    >
      <div class="left">
        <img src="/betty.png" alt="betty-image" class="btn-image">
      </div>
      <div class="center">{{ t('bettys-brain') }}</div>
      <LucideIcon name="square-pen" :size="16" class="right" />
    </button>

    <button
      class="custom-button"
      @click="openLink('https://the-karel-project.netlify.app/karel-builder')"
    >
      <div class="left">
        <img src="/karel_new.png" alt="karel-image" class="btn-image">
      </div>
      <div class="center">{{ t('karel-the-turtle') }}</div>
      <LucideIcon name="square-pen" :size="16" class="right" />
    </button>

    <button
      class="custom-button"
      @click="openLink('https://create.pilaproject.org/sequence-builder')"
    >
      <div class="left">
        <img src="/mascotte.png" alt="sequence-image" class="btn-image">
      </div>
      <div class="center">{{ t('pila-sequences') }}</div>
      <LucideIcon name="square-pen" :size="16" class="right" />
    </button>

    <button
      class="custom-button"
      @click="openLink('https://create.pilaproject.org')"
    >
      <div class="left">
        <img src="/mascotte.png" alt="sequence-image" class="btn-image">
      </div>
      <div class="center">{{ t('pila-create') }}</div>
      <LucideIcon name="square-pen" :size="16" class="right" />
    </button>

    <button
      class="custom-button"
      @click="openLink('https://customize-candli.pilaproject.org/chirpy')"
    >
      <div class="left">
        <img src="/Chirpy.png" alt="chirpy-image" class="btn-image">
      </div>
      <div class="center">{{ t('chirpys-adventure') }}</div>
      <LucideIcon name="square-pen" :size="16" class="right" />
    </button>

    <button
      class="custom-button"
      @click="openLink('https://customize-candli.pilaproject.org/mixology')"
    >
      <div class="left">
        <img src="/Mixology.png" alt="mixology-image" class="btn-image">
      </div>
      <div class="center">{{ t('magical-mixology') }}</div>
      <LucideIcon name="square-pen" :size="16" class="right" />
    </button>

    <button
      class="custom-button"
      @click="openLink('https://datawise.accingo.co/pila/explore')"
    >
      <div class="left">
        <img src="/datawise-logo.png" alt="datawise-image" class="btn-image">
      </div>
      <div class="center">{{ t('datawise-activities') }}</div>
      <LucideIcon name="square-pen" :size="16" class="right" />
    </button>

    <button
      v-if="IS_THAILAND_DOMAIN"
      class="custom-button"
      @click="openLink('https://thaipilacreate.eef.or.th/')"
    >
      <div class="left">
        <img src="/icon_pilathailand.png" alt="pila-thailand-image" class="btn-image">
      </div>
      <div class="center">{{ t('thai-pila') }}</div>
      <LucideIcon name="square-pen" :size="16" class="right" />
    </button>


  </div>
  </div>

    <div class="create-tab-footer">
      <div class="import-bar">
        <div class="import-copy">
          <LucideIcon name="download" :size="16" class="import-icon" />
          <span class="import-title">{{ t('import-content') }}</span>
          <span class="import-hint" :title="t('import-content-hint')">{{ t('import-content-hint') }}</span>
        </div>
        <div class="import-row">
          <input
            :placeholder="t('add-content-by-id-or-url')"
            v-model="userIdOrURL"
            class="input import-input"
            @keydown="() => {
              showInvalidMessage = false
              showSuccessMessage = false
            }"
            @keydown.enter="attemptAddContent(userIdOrURL)"
          />
          <PButton
            variant="primary"
            size="sm"
            :text="t('add')"
            :disabled="!userIdOrURL"
            @click="attemptAddContent(userIdOrURL)"
          />
        </div>
      </div>
      <p v-if="showInvalidMessage" class="import-status import-status--error">
        {{ t('invalid-id-or-url') }}
        <button type="button" class="import-status-dismiss" @click="showInvalidMessage = false">&times;</button>
      </p>
      <p v-if="showSuccessMessage" class="import-status import-status--ok">
        {{ t('success') }}
        <button type="button" class="import-status-dismiss" @click="showSuccessMessage = false">&times;</button>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { validate as isUUID } from 'uuid'
import { useStore } from 'vuex'
import setTagging from '@/utils/set-tagging.js'
import { MY_CONTENT_TAG, SIMPLIFIED_STUDY_DOMAINS } from '@/utils/constants.js'
import { registerMyContentItem } from '@/utils/useContentLibrary.js'
import { PButton } from '@/components/ui/index.js'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const IS_THAILAND_DOMAIN = window.location.host === 'thailand.pilaproject.org'

const userIdOrURL = ref('')

const showInvalidMessage = ref(false)
const showSuccessMessage = ref(false)
const customizersAvailable = !SIMPLIFIED_STUDY_DOMAINS.includes(window.location.host)

function extractContentId(input) {
  const trimmed = String(input || '').trim()
  if (!trimmed) return null
  if (trimmed.startsWith('https://bettysbrain.knowlearning.systems/bb/')) {
    const possibleModuleId = trimmed.slice(44, 80)
    return isUUID(possibleModuleId) ? possibleModuleId : null
  }
  if (isUUID(trimmed)) return trimmed
  const match = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  return match && isUUID(match[0]) ? match[0] : null
}

async function attemptAddContent(userInput) {
  const contentId = extractContentId(userInput)
  if (contentId) {
    await setTagging({ tag: MY_CONTENT_TAG, target: contentId, value: true })
    registerMyContentItem(contentId)
    userIdOrURL.value = ''
    showSuccessMessage.value = true
  } else {
    showInvalidMessage.value = true
  }
}

function openLink(link) {
  window.open(link, '_blank')
}

</script>

<style scoped>
.create-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.create-tab-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 24px 24px;
}
.create-tab-footer {
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  background: #fff;
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -8px 24px rgb(15 23 42 / 0.06);
  padding: 16px 24px 24px;
}
h3 {
  margin-bottom: 8px;
}
.create-hint {
  max-width: 420px;
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.45;
  color: #64748b;
  text-align: center;
}
.import-bar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  min-width: 0;
}
.import-copy {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
}
.import-icon {
  flex-shrink: 0;
  color: #2563eb;
}
.import-title {
  flex-shrink: 0;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #334155;
  line-height: 1.2;
}
.import-hint {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  line-height: 1.2;
  color: #64748b;
}
.import-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.import-input {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 12px;
  font-size: 13px;
}
.import-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 1120px;
  margin: 8px auto 0;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.2;
  white-space: nowrap;
}
.import-status--error {
  background: #fee2e2;
  color: #dc2626;
}
.import-status--ok {
  background: #ecfdf5;
  color: #059669;
}
.import-status-dismiss {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.custom-button {
  display: flex;
  width: 300px;
  height: 40px;
  flex-direction: row;
  align-items: center;
  background: rgb(221, 255, 244);
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  opacity: 0.8;
  overflow: hidden;
  margin-bottom: 24px;

}
.custom-button .left {
  flex: 0 0 55px;
  background: rgb(134, 236, 206);
  height: 100%;
  padding: 4px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-button .center {
  flex: 1 1 auto;
  text-align: center;
}
.custom-button .right {
  color: orange;
  text-align: right;
  margin-right: 20px;
}
.custom-button:hover {
  opacity: 1;
}
.custom-button .btn-image {
  height: 100%;
  overflow:hidden;
}

</style>
