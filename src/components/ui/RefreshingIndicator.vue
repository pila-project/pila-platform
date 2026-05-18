<template>
  <Transition
    enter-active-class="ri-enter-active"
    enter-from-class="ri-enter-from"
    leave-active-class="ri-leave-active"
    leave-to-class="ri-leave-to"
  >
    <div v-if="isRevalidating" class="refreshing-indicator">
      <LucideIcon name="refresh-cw" :size="12" class="ri-icon" />
      <span>Refreshing</span>
    </div>
  </Transition>
</template>

<script setup>
import { isRevalidating } from '@/utils/local-cache.js'
import LucideIcon from './LucideIcon.vue'
</script>

<style scoped>
.refreshing-indicator {
  position: fixed;
  top: 12px;
  right: 16px;
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 11px;
  color: #94a3b8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  pointer-events: none;
}

.ri-icon {
  animation: ri-spin 1.5s linear infinite;
}

@keyframes ri-spin {
  to { transform: rotate(360deg); }
}

.ri-enter-active, .ri-leave-active {
  transition: opacity 200ms ease;
}
.ri-enter-from, .ri-leave-to {
  opacity: 0;
}
</style>
