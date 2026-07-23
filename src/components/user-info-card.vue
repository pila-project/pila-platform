<script setup>
  import { useStore } from 'vuex'
  import { generateKeyPair, decryptSymmetric } from '../encryption.js'
  import LoginCodeCard from './login-code-card.vue'

  const store = useStore()

  const props = defineProps({ id: String })
  const userData = await Agent.state(props.id)

  const teacherOwnedUserAccount = !!userData.providerEncryptedKey

  const { providerEncryptedInfo } = userData

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
    <LoginCodeCard :name="info.name" :loginCode="userSecret" />
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
