<script setup>
  import QRCode from './qrcode.vue'
  import codeCharToIcon from '../code-char-to-icon.js'

  defineProps({
    name: {
      type: String,
      required: true
    },
    loginCode: {
      type: String,
      required: true
    }
  })
</script>

<template>
  <div class="login-code-card">
    <div>{{ name }}</div>
    <QRCode size="2in" :data="loginCode" />
    <div>
      <v-icon
        v-for="(character, index) in loginCode"
        :key="`${character}-${index}`"
        class="ma-1"
        :icon="codeCharToIcon[character]"
      />
    </div>
  </div>
</template>

<style scoped>
  .login-code-card {
    break-inside: avoid;
    padding: 0.25in;
    text-align: center;
  }
</style>
