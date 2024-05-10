<template>
  <div class="create-tab"> 
    <h3>{{ t('create-your-own-content') }}</h3>
    <button
      class="custom-button"
      @click="openLink('https://bettysbrain.knowlearning.systems/bb/custom/causal-map?auth=true&oecd=true&custom=true')"
    >
      <div class="left">
        <img src="/betty.png" alt="betty-image" class="btn-image">
      </div>
      <div class="center">{{ t('bettys-brain') }}</div>
      <i class="right fa-solid fa-pen-to-square" />
    </button>

    <button
      class="custom-button"
      @click="openLink('https://the-karel-project.netlify.app/karel-builder')"
    >
      <div class="left">
        <img src="/karel_new.png" alt="karel-image" class="btn-image">
      </div>
      <div class="center">{{ t('karel-the-turtle') }}</div>
      <i class="right fa-solid fa-pen-to-square" />
    </button>

    <button
      class="custom-button"
      @click="openLink('https://create.pilaproject.org')"
    >
      <div class="left">
        <img src="/mascotte.png" alt="sequence-image" class="btn-image">
      </div>
      <div class="center">{{ t('pila-create') }}</div>
      <i class="right fa-solid fa-pen-to-square" />
    </button>

    <div class="id-or-url-input-wrapper">
      <h3>{{ t('import-content') }}</h3>
      <v-text-field
        :placeholder="t('add-content-by-id-or-url')"
        v-model="userIdOrURL"
        @keydown.enter="attemptAddContent(userIdOrUrl)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const userIdOrURL = ref('')

async function attemptAddContent(userInput) {
  if (await isValidInput(userInput)) {
    const myContent = await Agent.state('my-content')
    myContent[userInput] = {}
    userIdOrURL.value = ''
  } else {
    alert( t('invalid-id-or-url') )
  }
}

async function isValidInput(input) {
  // TODO: actually validate
  return true
}


// async function isValidContentId(id) {
//   if (isURL(val)) { // if url, validated if betty or candli
//     return !!(this.isBettyLink(val) || this.isCandliLink(val))
//   }
//   else if (isUUID(val)) { // if uuid, validated if karel map
//     const res = await Agent.metadata(this.contentId)
//     return !!res.domain
//   }
//   else return false
// }

// function isURL(s) {
//   try {
//     const url = new URL(s)
//     return true
//   } catch (error) {
//     console.log(error)
//     return false
//   }
// }

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
  margin-bottom: 16px;
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
  flex: 0 0 50px;
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
  padding: px 20px;
  height: 100%;
  overflow:hidden;
}
.id-or-url-input-wrapper {
  text-align: center;
  margin-top: 20px;
  width: 340px;
}
#input-15 {
  text-align: center !important;
}
</style>


