<script setup>
  import { ref, reactive } from 'vue'
  import { useStore } from 'vuex'
  import { generateKeyPair, decryptSymmetric } from '../encryption.js'
  import { encodeUTF8 } from 'tweetnacl-util'
  import { createUser } from '../user-utils.js'
  import QRCode from './qrcode.vue'

  const store = useStore()

  const props = defineProps({ id: String })
  const emit = defineEmits(['close'])

  const open = ref(true)

  const userData = reactive(await Agent.state(props.id))

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
      <QRCode
        size="2in"
        :data="userSecret"
      />
      <div>id: {{id}}</div>
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