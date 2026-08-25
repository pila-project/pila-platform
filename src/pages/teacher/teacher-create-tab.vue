<template>
  <div class="create-tab">
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
      <div class="center">{{ "THAI PILA" }}</div>
      <LucideIcon name="square-pen" :size="16" class="right" />
    </button>


  </div>

    <div class="id-or-url-input-wrapper">
      <h3>{{ t('import-content') }}</h3>
      <p class="create-hint">{{ t('import-content-hint') }}</p>
      <input
        :placeholder="t('add-content-by-id-or-url')"
        v-model="userIdOrURL"
        class="input"
        @keydown="() => {
          showInvalidMessage = false
          showSuccessMessage = false
        }"
        @keydown.enter="attemptAddContent(userIdOrURL)"
      />
      <PButton
        v-if="userIdOrURL"
        variant="primary"
        size="sm"
        :text="t('add')"
        @click="attemptAddContent(userIdOrURL)"
        class="mt-2"
      />
      <div
        v-if="showInvalidMessage"
        class="mt-2 p-3 rounded-md bg-danger-200 text-danger-600 text-sm"
      >
        {{ t('invalid-id-or-url') }}
        <button class="ml-2 font-medium" @click="showInvalidMessage = false">&times;</button>
      </div>
      <div
        v-if="showSuccessMessage"
        class="mt-2 p-3 rounded-md bg-success-50 text-success-600 text-sm"
      >
        {{ t('success') }}
        <button class="ml-2 font-medium" @click="showSuccessMessage = false">&times;</button>
      </div>
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
import { PButton } from '@/components/ui/index.js'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const IS_THAILAND_DOMAIN = window.location.host === 'thailand.pilaproject.org'

const userIdOrURL = ref('')

const showInvalidMessage = ref(false)
const showSuccessMessage = ref(false)
const customizersAvailable = !SIMPLIFIED_STUDY_DOMAINS.includes(window.location.host)

async function attemptAddContent(userInput) {
  if (await isValidInput(userInput)) {
    await setTagging({ tag: MY_CONTENT_TAG, target: userInput, value: true })

    userIdOrURL.value = ''
    showSuccessMessage.value = true
  } else {
    showInvalidMessage.value = true
  }
}

async function isValidInput(input) {
  if (input.startsWith('https://bettysbrain.knowlearning.systems/bb/')) {
    const possibleModuleId = input.slice(44, 80)
    return isUUID(possibleModuleId)
  }
  else return isUUID(input)
}

function openLink(link) {
  window.open(link, '_blank')
}

</script>

<style scoped>
.create-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 40px;
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
.id-or-url-input-wrapper {
  text-align: center;
  margin-top: 20px;
  width: 340px;
}
</style>
