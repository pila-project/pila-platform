<script setup>
  import QRCode from '@/components/common/qrcode.vue'
  import codeCharToIcon from '@/utils/code-char-to-icon.js'

  defineProps({
    name: {
      type: String,
      required: true,
    },
    loginCode: {
      type: String,
      required: true,
    },
  })
</script>

<template>
  <div class="login-code-card">
    <div class="login-code-card-name">{{ name }}</div>
    <QRCode size="2in" :data="loginCode" />
    <div class="login-code-card-symbols" aria-label="Login code">
      <i
        v-for="(character, index) in loginCode"
        :key="`${character}-${index}`"
        class="login-code-card-icon"
        :class="codeCharToIcon[character]"
      />
    </div>
  </div>
</template>

<style scoped>
.login-code-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.login-code-card-name {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}
.login-code-card-symbols {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}
.login-code-card-icon {
  font-size: 1.1rem;
  color: #334155;
}
</style>
