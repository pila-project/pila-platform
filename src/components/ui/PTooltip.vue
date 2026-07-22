<template>
  <div
    ref="anchorRef"
    class="tooltip-anchor"
    :class="[{ 'tooltip-anchor--block': block }, attrs.class]"
    :style="attrs.style"
    @mouseenter="onMouseEnter"
    @mousemove="onMouseMove"
    @mouseleave="onLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @touchstart.passive="onTouchStart"
    @touchend="onTouchEnd"
    @touchmove.passive="onTouchMove"
    @touchcancel="onTouchCancel"
    @click.capture="onClickCapture"
  >
    <slot />
  </div>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="bubbleRef"
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
import { ref, computed, watch, nextTick, onBeforeUnmount, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const LONG_PRESS_MS = 450
/** Offset from pointer so the bubble doesn’t cover the cursor */
const POINTER_GAP_X = 12
const POINTER_GAP_Y = 16
const VIEWPORT_PAD = 8

const props = defineProps({
  text: { type: String, default: '' },
  position: {
    type: String,
    default: 'bottom',
    validator: v => ['top', 'bottom', 'left', 'right'].includes(v),
  },
  /** Use block layout so multi-line clamps fill the cell width */
  block: { type: Boolean, default: false },
  /**
   * When true, only show if the anchor (or a descendant) is actually
   * truncated/ellipsed (scroll size exceeds client size).
   * Keep false for help tooltips whose text is not the visible label.
   */
  onlyIfOverflow: { type: Boolean, default: false },
})

const anchorRef = ref(null)
const bubbleRef = ref(null)
const show = ref(false)
const coords = ref({ top: 0, left: 0 })
const openedByTouch = ref(false)
const suppressNextClick = ref(false)

/** Last known pointer (clientX/Y); used so wide cells open near the cursor */
const pointer = ref(null)

let longPressTimer = null
let touchMoved = false

const visible = computed(() => show.value && !!props.text)

/**
 * Place the bubble near the pointer when we have one; otherwise fall back to
 * the anchor rect (keyboard focus).
 */
function pointForPosition() {
  if (pointer.value) {
    return { x: pointer.value.x, y: pointer.value.y, fromPointer: true }
  }
  const el = anchorRef.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    fromPointer: false,
    rect,
  }
}

function updatePosition() {
  const point = pointForPosition()
  if (!point) return

  const bubble = bubbleRef.value
  const bw = bubble?.offsetWidth || 0
  const bh = bubble?.offsetHeight || 0
  const vw = window.innerWidth
  const vh = window.innerHeight

  let top
  let left

  if (point.fromPointer) {
    // Cursor-relative placement using the preferred side, with viewport clamping
    switch (props.position) {
      case 'top':
        top = point.y - POINTER_GAP_Y
        left = point.x
        break
      case 'left':
        top = point.y
        left = point.x - POINTER_GAP_X
        break
      case 'right':
        top = point.y
        left = point.x + POINTER_GAP_X
        break
      case 'bottom':
      default:
        top = point.y + POINTER_GAP_Y
        left = point.x
        break
    }
  } else {
    // Focus / no-pointer: anchor to the element edge
    const rect = point.rect
    switch (props.position) {
      case 'top':
        top = rect.top - POINTER_GAP_Y / 2
        left = rect.left + rect.width / 2
        break
      case 'left':
        top = rect.top + rect.height / 2
        left = rect.left - POINTER_GAP_X / 2
        break
      case 'right':
        top = rect.top + rect.height / 2
        left = rect.right + POINTER_GAP_X / 2
        break
      case 'bottom':
      default:
        top = rect.bottom + POINTER_GAP_Y / 2
        left = rect.left + rect.width / 2
        break
    }
  }

  // Clamp so the full bubble stays on screen (accounting for CSS transforms)
  // Transforms: top → translate(-50%, -100%), bottom → translate(-50%, 0),
  // left → translate(-100%, -50%), right → translate(0, -50%)
  if (bw && bh) {
    switch (props.position) {
      case 'top': {
        // centered horizontally, above point
        left = clamp(left, VIEWPORT_PAD + bw / 2, vw - VIEWPORT_PAD - bw / 2)
        top = clamp(top, VIEWPORT_PAD + bh, vh - VIEWPORT_PAD)
        break
      }
      case 'left': {
        left = clamp(left, VIEWPORT_PAD + bw, vw - VIEWPORT_PAD)
        top = clamp(top, VIEWPORT_PAD + bh / 2, vh - VIEWPORT_PAD - bh / 2)
        break
      }
      case 'right': {
        left = clamp(left, VIEWPORT_PAD, vw - VIEWPORT_PAD - bw)
        top = clamp(top, VIEWPORT_PAD + bh / 2, vh - VIEWPORT_PAD - bh / 2)
        break
      }
      case 'bottom':
      default: {
        left = clamp(left, VIEWPORT_PAD + bw / 2, vw - VIEWPORT_PAD - bw / 2)
        top = clamp(top, VIEWPORT_PAD, vh - VIEWPORT_PAD - bh)
        break
      }
    }
  }

  coords.value = { top, left }
}

function clamp(n, min, max) {
  if (max < min) return (min + max) / 2
  return Math.min(Math.max(n, min), max)
}

const bubbleStyle = computed(() => ({
  top: `${coords.value.top}px`,
  left: `${coords.value.left}px`,
}))

function clearLongPressTimer() {
  if (longPressTimer != null) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function setPointerFromEvent(event) {
  if (event?.clientX == null || event?.clientY == null) return
  pointer.value = { x: event.clientX, y: event.clientY }
}

/** True when the visible text is clipped (single-line ellipsis or line-clamp). */
function hasTextOverflow() {
  const root = anchorRef.value
  if (!root) return false
  // Subpixel tolerance — browsers sometimes report 1px difference without clipping
  const TOL = 1
  const nodes = [root, ...root.querySelectorAll('*')]
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue
    if (node.scrollWidth > node.clientWidth + TOL) return true
    if (node.scrollHeight > node.clientHeight + TOL) return true
  }
  return false
}

function canShowTooltip() {
  if (!props.text) return false
  if (props.onlyIfOverflow && !hasTextOverflow()) return false
  return true
}

function openTooltip({ fromTouch = false } = {}) {
  if (!canShowTooltip()) return
  openedByTouch.value = fromTouch
  show.value = true
  if (fromTouch) {
    suppressNextClick.value = true
  }
}

function closeTooltip() {
  show.value = false
  openedByTouch.value = false
  pointer.value = null
}

function onMouseEnter(event) {
  if (openedByTouch.value) return
  setPointerFromEvent(event)
  openTooltip()
}

function onMouseMove(event) {
  if (openedByTouch.value) return
  setPointerFromEvent(event)
  if (show.value) updatePosition()
}

function onLeave() {
  if (openedByTouch.value) return
  closeTooltip()
}

function onFocusIn() {
  if (openedByTouch.value) return
  // Keyboard focus: no pointer — fall back to element rect
  pointer.value = null
  openTooltip()
}

function onFocusOut(event) {
  if (openedByTouch.value) return
  const next = event.relatedTarget
  if (next && anchorRef.value?.contains(next)) return
  closeTooltip()
}

function onTouchStart(event) {
  if (!props.text) return
  // Skip long-press work when content isn't truncated
  if (props.onlyIfOverflow && !hasTextOverflow()) return
  touchMoved = false
  const touch = event.touches?.[0]
  if (touch) {
    pointer.value = { x: touch.clientX, y: touch.clientY }
  }
  clearLongPressTimer()
  longPressTimer = setTimeout(() => {
    longPressTimer = null
    if (touchMoved) return
    openTooltip({ fromTouch: true })
  }, LONG_PRESS_MS)
}

function onTouchMove(event) {
  touchMoved = true
  clearLongPressTimer()
  const touch = event.touches?.[0]
  if (touch && openedByTouch.value) {
    pointer.value = { x: touch.clientX, y: touch.clientY }
    updatePosition()
  }
}

function onTouchEnd(event) {
  clearLongPressTimer()
  // If long-press opened the tooltip, block the synthetic click that follows
  if (suppressNextClick.value) {
    event.preventDefault()
  }
}

function onTouchCancel() {
  clearLongPressTimer()
  touchMoved = false
}

function onClickCapture(event) {
  if (!suppressNextClick.value) return
  event.preventDefault()
  event.stopPropagation()
  // Keep suppression briefly so bubbled row clicks also miss
  setTimeout(() => {
    suppressNextClick.value = false
  }, 0)
}

function onDocumentPointerDown(event) {
  if (!openedByTouch.value || !show.value) return
  const el = anchorRef.value
  if (el && el.contains(event.target)) return
  closeTooltip()
}

function onDocumentScroll() {
  if (openedByTouch.value) closeTooltip()
}

function bindPositionListeners() {
  window.addEventListener('scroll', updatePosition, true)
  window.addEventListener('resize', updatePosition)
}

function unbindPositionListeners() {
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
}

function bindDismissListeners() {
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  window.addEventListener('scroll', onDocumentScroll, true)
}

function unbindDismissListeners() {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  window.removeEventListener('scroll', onDocumentScroll, true)
}

watch(visible, async (isVisible) => {
  if (isVisible) {
    await nextTick()
    updatePosition()
    // Second frame: bubble has real size for viewport clamping
    await nextTick()
    updatePosition()
    bindPositionListeners()
    if (openedByTouch.value) bindDismissListeners()
  } else {
    unbindPositionListeners()
    unbindDismissListeners()
  }
})

onBeforeUnmount(() => {
  clearLongPressTimer()
  unbindPositionListeners()
  unbindDismissListeners()
})
</script>

<style scoped>
.tooltip-anchor {
  display: inline-flex;
  max-width: 100%;
  min-width: 0;
}

.tooltip-anchor--block {
  display: block;
  width: 100%;
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
