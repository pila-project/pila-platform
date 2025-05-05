<script setup>
  import { ref, reactive } from 'vue'
  import { useStore } from 'vuex'
  import { generateKeyPair, decryptSymmetric } from '../encryption.js'
  import QRCode from './qrcode.vue'
  import codeCharToIcon from '../code-char-to-icon.js'

  const store = useStore()

  const props = defineProps({ id: String })
  const emit = defineEmits(['close'])

  const open = ref(true)

  const userData = await Agent.state(props.id)

  const teacherOwnedUserAccount = !!userData.providerEncryptedKey

  const {
    providerEncryptedKey,
    providerEncryptedInfo,
    publicKey
  } = userData

  const providerSecret = localStorage.getItem(`zkek-${store.state.user}`)
  const providerKeyPair = await generateKeyPair(providerSecret)

  let info, userSecret

  try {
    info = JSON.parse(decryptSymmetric(
      providerKeyPair.secretKey,
      providerEncryptedInfo
    )).info

    userSecret = decryptSymmetric(
      providerKeyPair.secretKey,
      userData.providerEncryptedKey
    )
  } catch (error) {
    console.log(error)
  }

  function t(slug) {
    return store.getters.t(slug)
  }
</script>

<template>
  <div
    v-if="teacherOwnedUserAccount && userSecret"
    class="wrapper"
  >
    <div>
      <div>{{info.name}}</div>
      <QRCode size="2in" :data="userSecret" />
      <div>
        <v-icon
          v-for="char in userSecret"
          style="margin: 4px;"
          :icon="codeCharToIcon[char]"
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