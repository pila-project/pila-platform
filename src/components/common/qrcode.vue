<script setup>
  import { ref } from 'vue'
  import QRCode from 'qrcode'

  const { data } = defineProps(['data', 'size'])

  const qrCodeSVG = ref(await generateQRCodeFromJSON(data))

  async function generateQRCodeFromJSON(data) {
    try {
      return await QRCode.toString(data, { type: 'svg' })
    } catch (err) {
      console.error('Failed to generate QR code:', err)
    }
  }

</script>

<template>
  <div :style="{ width: size, height: size, display: 'inline-block' }">
    <div v-html="qrCodeSVG"></div>
  </div>
</template>
