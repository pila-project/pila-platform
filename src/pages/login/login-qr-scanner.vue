<template>
  <div class="login-qr">
    <div class="login-qr-frame">
      <video
        v-show="streaming"
        ref="videoEl"
        class="login-qr-video"
        playsinline
        muted
      />
      <div v-if="!streaming && !error" class="login-qr-placeholder">
        <img
          src="/login/icons/iconixto_solid_qr-code.png"
          alt=""
          class="login-qr-placeholder-icon"
          width="48"
          height="48"
        >
        <p>{{ t('start-scanner') }}</p>
      </div>
      <div v-if="error" class="login-qr-error">{{ error }}</div>
    </div>
    <p class="login-qr-hint">{{ t('scan-login-code-hint') }}</p>
    <div class="login-qr-actions">
      <button type="button" class="login-qr-btn" @click="$emit('back')">
        <LucideIcon name="arrow-left" :size="16" />
        {{ t('back') }}
      </button>
      <button
        v-if="!streaming"
        type="button"
        class="login-qr-btn login-qr-btn-primary"
        :disabled="signingIn"
        @click="start"
      >
        {{ t('start-scanner') }}
      </button>
      <button
        v-else
        type="button"
        class="login-qr-btn"
        @click="stop"
      >
        {{ t('close') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { normalizeLoginCodeInput, isCompleteLoginCode } from '@/utils/login-code-symbols.js'

const props = defineProps({
  signingIn: Boolean,
})
const emit = defineEmits(['detected', 'back'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const videoEl = ref(null)
const streaming = ref(false)
const error = ref('')
let stream = null
let rafId = 0
let detector = null

async function start() {
  error.value = ''
  try {
    if (!('BarcodeDetector' in window)) {
      error.value = t('qr-scanner-not-supported')
      return
    }
    detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })
    if (videoEl.value) {
      videoEl.value.srcObject = stream
      await videoEl.value.play()
    }
    streaming.value = true
    tick()
  } catch (e) {
    console.error('[login-qr-scanner]', e)
    error.value = t('qr-scanner-permission-denied')
    stop()
  }
}

function stop() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  if (stream) {
    stream.getTracks().forEach(tr => tr.stop())
    stream = null
  }
  if (videoEl.value) videoEl.value.srcObject = null
  streaming.value = false
}

async function tick() {
  if (!streaming.value || !videoEl.value || !detector) return
  try {
    if (videoEl.value.readyState >= 2) {
      const codes = await detector.detect(videoEl.value)
      if (codes?.length) {
        const raw = codes[0].rawValue || ''
        const code = normalizeLoginCodeInput(raw)
        if (isCompleteLoginCode(code)) {
          stop()
          emit('detected', code)
          return
        }
      }
    }
  } catch {
    /* keep scanning */
  }
  rafId = requestAnimationFrame(tick)
}

onBeforeUnmount(stop)

defineExpose({ start, stop })
</script>

<style scoped>
.login-qr {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.4vh, 16px);
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
}

.login-qr-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  max-height: min(42vh, 320px);
  background: #f3f4f6;
  border-radius: 14.76px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  min-height: 0;
}

.login-qr-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.login-qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 14px;
  padding: 24px;
  text-align: center;
}

.login-qr-placeholder-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  opacity: 0.85;
}

.login-qr-error {
  position: absolute;
  inset: auto 12px 12px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  padding: 10px 12px;
  border-radius: 8px;
  text-align: center;
}

.login-qr-hint {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  text-align: center;
}

.login-qr-actions {
  display: flex;
  gap: 12px;
}

.login-qr-btn {
  flex: 1;
  height: 48px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #2563eb;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.login-qr-btn-primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #f8fafc;
}

.login-qr-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
