<script setup>
  import { ref } from 'vue'
  import QRCode from 'qrcode'

  const { data } = defineProps(['data'])

  const qrCodeSVG = ref(await generateQRCodeFromJSON(data))

  async function generateQRCodeFromJSON(data) {
    try {
      return await QRCode.toString(typeof data === ' string' ? data : JSON.stringify(data), { type: 'svg' })
    } catch (err) {
      console.error('Failed to generate QR code:', err)
    }
  }

</script>

<template>
  <div>
    <div v-html="qrCodeSVG"></div>
  </div>
</template>
