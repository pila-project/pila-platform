<template>
  <DecryptedNameImpl v-bind="$attrs" />
</template>

<script setup>
import DecryptedNameImpl from './common/decrypted-name.vue'
defineOptions({ inheritAttrs: false })
</script>
