<script setup>
  import { ref, reactive } from 'vue'
  import { useStore } from 'vuex'
  import { generateKeyPair, decryptSymmetric } from '../encryption.js'
  import QRCode from './qrcode.vue'

  const store = useStore()

  const props = defineProps({ id: String })
  const emit = defineEmits(['close'])

  const open = ref(true)

  const codeCharToIcon = {
    a: "star",
    b: "heart",
    c: "bell",
    d: "moon",
    e: "sun",
    f: "cloud",
    g: "umbrella",
    h: "dove",
    i: "mug-hot",
    j: "key",
    k: "eye",
    l: "fish",
    m: "feather",
    n: "bolt",
    o: "phone",
    p: "smile",
    q: "thumbs-up",
    r: "paw",
    s: "tree",
    t: "bug",
    u: "music",
    v: "fire",
    w: "car",
    x: "lightbulb",
    y: "snowflake"
  }

  const userData = await Agent.state(props.id)

  const teacherOwnedUserAccount = !!userData.providerEncryptedKey

  const {
    providerEncryptedKey,
    providerEncryptedInfo,
    publicKey
  } = userData

  const providerSecret = localStorage.getItem(`zkek-${store.state.user}`)
  const providerKeyPair = await generateKeyPair(providerSecret)

  const { info } = JSON.parse(decryptSymmetric(
    providerKeyPair.secretKey,
    providerEncryptedInfo
  ))

  const userSecret = decryptSymmetric(
    providerKeyPair.secretKey,
    userData.providerEncryptedKey
  )

  function t(slug) {
    return store.getters.t(slug)
  }
</script>

<template>
  <div
    v-if="teacherOwnedUserAccount"
    class="wrapper"
  >
    <div>
      <div>{{info.name}}</div>
      <QRCode size="2in" :data="userSecret" />
      <div>
        <v-icon
          v-for="char in userSecret"
          style="margin: 4px;"
          :icon="`fa-solid fa-${codeCharToIcon[char]}`"
        />
      </div>
    </div>
  </div>
  <div v-else></div>
</template>

<style scoped>
  .wrapper {
    page-break-inside: avoid;
    break-inside: avoid;
    padding: 0.25in;
    border-bottom: 0.025in dashed #CCCCCC;
    text-align: center;
  }
</style>