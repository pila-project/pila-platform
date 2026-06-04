<template>
  <div
    ref="anchorRef"
    class="tooltip-anchor"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot />
  </div>
  <Teleport to="body">
    <div
      v-if="visible"
      class="p-tooltip-bubble"
      :class="`p-tooltip-bubble--${position}`"
      :style="bubbleStyle"
      role="tooltip"
    >
      {{ text }}
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  position: {
    type: String,
    default: 'bottom',
    validator: v => ['top', 'bottom', 'left', 'right'].includes(v),
  },
})

const anchorRef = ref(null)
const show = ref(false)
const coords = ref({ top: 0, left: 0 })

const visible = computed(() => show.value && !!props.text)

const GAP = 8

function updatePosition() {
  const el = anchorRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  switch (props.position) {
    case 'top':
      coords.value = {
        top: rect.top - GAP,
        left: rect.left + rect.width / 2,
      }
      break
    case 'left':
      coords.value = {
        top: rect.top + rect.height / 2,
        left: rect.left - GAP,
      }
      break
    case 'right':
      coords.value = {
        top: rect.top + rect.height / 2,
        left: rect.right + GAP,
      }
      break
    case 'bottom':
    default:
      coords.value = {
        top: rect.bottom + GAP,
        left: rect.left + rect.width / 2,
      }
      break
  }
}

const bubbleStyle = computed(() => ({
  top: `${coords.value.top}px`,
  left: `${coords.value.left}px`,
}))

function onEnter() {
  show.value = true
}

function onLeave() {
  show.value = false
}

function bindPositionListeners() {
  window.addEventListener('scroll', updatePosition, true)
  window.addEventListener('resize', updatePosition)
}

function unbindPositionListeners() {
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
}

watch(visible, async (isVisible) => {
  if (isVisible) {
    await nextTick()
    updatePosition()
    bindPositionListeners()
  } else {
    unbindPositionListeners()
  }
})

onBeforeUnmount(unbindPositionListeners)
</script>

<style scoped>
.tooltip-anchor {
  display: inline-flex;
}
</style>

<style>
/* Teleported to body — not scoped so styles always apply */
.p-tooltip-bubble {
  position: fixed;
  z-index: 10000;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: #fff;
  background: #1e293b;
  border-radius: 6px;
  max-width: min(320px, calc(100vw - 16px));
  white-space: normal;
  text-align: center;
  pointer-events: none;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

.p-tooltip-bubble--top {
  transform: translate(-50%, -100%);
}

.p-tooltip-bubble--bottom {
  transform: translate(-50%, 0);
}

.p-tooltip-bubble--left {
  transform: translate(-100%, -50%);
}

.p-tooltip-bubble--right {
  transform: translate(0, -50%);
}
</style>