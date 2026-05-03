<template>
  <div class="tooltip-wrapper" @mouseenter="show = true" @mouseleave="show = false">
    <slot />
    <div v-if="show && text" class="tooltip-content" :class="`tooltip-${position}`">
      {{ text }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  text: { type: String, default: '' },
  position: { type: String, default: 'bottom', validator: v => ['top', 'bottom', 'left', 'right'].includes(v) },
})

const show = ref(false)
</script>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
}

.tooltip-content {
  position: absolute;
  z-index: 100;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  background: #1e293b;
  border-radius: 6px;
  white-space: nowrap;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.tooltip-bottom {
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-top {
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-left {
  right: calc(100% + 6px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip-right {
  left: calc(100% + 6px);
  top: 50%;
  transform: translateY(-50%);
}
</style>
