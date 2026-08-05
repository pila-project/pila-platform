<template>
  <div class="unified-filter" ref="containerRef">
    <!-- Search bar -->
    <div
      class="unified-filter-bar"
      :class="{
        'unified-filter-bar-focused': isDropdownOpen,
        'unified-filter-bar-compact': compact,
      }"
      @click.stop="openDropdown"
    >
      <LucideIcon name="search" :size="14" class="unified-filter-search-icon" />
      <div
        class="unified-filter-scroll-wrap"
        :class="{ 'unified-filter-scroll-wrap--fade': showEndFade }"
      >
        <div
          ref="barContentRef"
          class="unified-filter-bar-content"
          :class="{
            'unified-filter-bar-content--overflow': canScrollChips,
            'unified-filter-bar-content--panning': isPanningChips,
          }"
          @scroll="updateScrollFade"
          @pointerdown="onBarPointerDown"
          @pointermove="onBarPointerMove"
          @pointerup="onBarPointerUp"
          @pointercancel="onBarPointerUp"
        >
          <!-- Inline chips for active filters -->
          <span
            v-for="chip in allChips"
            :key="chip.id"
            class="unified-chip"
          >
            <span class="unified-chip-label">{{ chip.sectionLabel }}</span>
            <span class="unified-chip-eq">=</span>
            <span class="unified-chip-value">{{ chip.valueLabel }}</span>
            <button class="unified-chip-remove" @click.stop="chip.remove()">
              <LucideIcon name="x" :size="10" />
            </button>
          </span>
          <!-- Search input -->
          <input
            ref="searchInputRef"
            v-model="localSearchQuery"
            :placeholder="allChips.length ? '' : placeholder"
            class="unified-filter-input"
            @focus="openDropdown"
            @keydown.escape="closeDropdown"
          />
        </div>
      </div>
      <!-- Clear all button -->
      <button
        v-if="allChips.length || localSearchQuery"
        class="unified-filter-clear-btn"
        @click.stop="clearAll"
      >
        <LucideIcon name="x" :size="14" />
      </button>
    </div>

    <!-- Mount sections always (v-show) so they register before first open; teleport avoids card overflow clipping -->
    <Teleport to="body">
      <div
        v-show="isDropdownOpen && hasSections"
        ref="dropdownRef"
        class="unified-filter-dropdown"
        :style="dropdownStyle"
        @click.stop
      >
        <slot />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, provide, reactive, shallowReactive, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import LucideIcon from './LucideIcon.vue'
import { useDebounce } from '@/utils/useDebounce'

const props = defineProps({
  searchQuery: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Search...',
  },
  debounce: {
    type: Number,
    default: 500,
  },
  /** @deprecated Layout is always single-line with horizontal chip scroll; kept for existing call sites. */
  compact: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:searchQuery'])

const containerRef = ref(null)
const dropdownRef = ref(null)
const barContentRef = ref(null)
const searchInputRef = ref(null)
const showEndFade = ref(false)
const canScrollChips = ref(false)
const isPanningChips = ref(false)
const isDropdownOpen = ref(false)
const anchorRect = ref(null)
const expandedSection = ref(null)
const localSearchQuery = ref(props.searchQuery)

// Debounce the search query
const { debounced: debouncedQuery, flush } = useDebounce(localSearchQuery, props.debounce)

watch(debouncedQuery, (val) => {
  emit('update:searchQuery', val)
})

// Sync from parent if changed externally
watch(() => props.searchQuery, (val) => {
  if (val !== localSearchQuery.value) {
    localSearchQuery.value = val
  }
})

// Section registry
const sections = shallowReactive(new Map())

const hasSections = computed(() => sections.size > 0)

function registerSection(id, meta) {
  sections.set(id, meta)
}

function unregisterSection(id) {
  sections.delete(id)
}

function setExpanded(id) {
  expandedSection.value = expandedSection.value === id ? null : id
}

// Build chips from all registered sections
const allChips = computed(() => {
  const chips = []
  for (const [id, meta] of sections) {
    if (meta.selectedLabels && meta.selectedLabels.value) {
      for (const item of meta.selectedLabels.value) {
        chips.push({
          id: `${id}-${item.valueLabel}`,
          sectionLabel: meta.label,
          valueLabel: item.valueLabel,
          remove: item.remove,
        })
      }
    }
  }
  return chips
})

function updateAnchorRect() {
  if (containerRef.value) {
    anchorRect.value = containerRef.value.getBoundingClientRect()
  }
}

const dropdownStyle = computed(() => {
  if (!anchorRect.value) return {}
  const r = anchorRect.value
  return {
    position: 'fixed',
    top: `${r.bottom + 4}px`,
    left: `${r.left}px`,
    width: `${r.width}px`,
    zIndex: 9999,
  }
})

function openDropdown() {
  if (!hasSections.value) return
  updateAnchorRect()
  isDropdownOpen.value = true
  nextTick(() => {
    updateAnchorRect()
    searchInputRef.value?.focus()
  })
}

function closeDropdown() {
  isDropdownOpen.value = false
  expandedSection.value = null
}

function clearAll() {
  localSearchQuery.value = ''
  flush()
  emit('update:searchQuery', '')
  for (const [, meta] of sections) {
    if (meta.clearFn) meta.clearFn()
  }
}

function handleClickOutside(e) {
  const inContainer = containerRef.value?.contains(e.target)
  const inDropdown = dropdownRef.value?.contains(e.target)
  if (!inContainer && !inDropdown) {
    closeDropdown()
  }
}

function updateScrollFade() {
  const el = barContentRef.value
  if (!el) {
    showEndFade.value = false
    canScrollChips.value = false
    return
  }
  const overflow = el.scrollWidth > el.clientWidth + 1
  canScrollChips.value = overflow
  const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1
  showEndFade.value = overflow && !atEnd
}

function scrollChipsIntoView() {
  const el = barContentRef.value
  if (!el) return
  el.scrollLeft = el.scrollWidth
  updateScrollFade()
}

function onScrollOrResize() {
  if (isDropdownOpen.value) updateAnchorRect()
  updateScrollFade()
}

/** UIUX-86: map wheel (incl. vertical mouse wheel) to horizontal chip scroll. */
function onBarWheel(e) {
  const el = barContentRef.value
  if (!el) return
  if (el.scrollWidth <= el.clientWidth + 1) return

  const absX = Math.abs(e.deltaX)
  const absY = Math.abs(e.deltaY)
  // Prefer native horizontal; otherwise convert vertical wheel to horizontal.
  const dx = absX > absY ? e.deltaX : e.deltaY
  if (!dx) return

  const maxScroll = el.scrollWidth - el.clientWidth
  const next = Math.min(maxScroll, Math.max(0, el.scrollLeft + dx))
  if (next === el.scrollLeft) return

  e.preventDefault()
  el.scrollLeft = next
  updateScrollFade()
}

const PAN_SKIP_SELECTOR = 'button, input, a, textarea, select, label'

let panPointerId = null
let panStartX = 0
let panStartScroll = 0

/** UIUX-86: click-drag to pan the chip strip (not on controls/input). */
function onBarPointerDown(e) {
  if (e.button != null && e.button !== 0) return
  const el = barContentRef.value
  if (!el || el.scrollWidth <= el.clientWidth + 1) return
  if (e.target instanceof Element && e.target.closest(PAN_SKIP_SELECTOR)) return

  panPointerId = e.pointerId
  panStartX = e.clientX
  panStartScroll = el.scrollLeft
  isPanningChips.value = true
  try {
    el.setPointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

function onBarPointerMove(e) {
  if (panPointerId == null || e.pointerId !== panPointerId) return
  const el = barContentRef.value
  if (!el) return
  el.scrollLeft = panStartScroll - (e.clientX - panStartX)
  updateScrollFade()
}

function onBarPointerUp(e) {
  if (panPointerId == null || (e.pointerId != null && e.pointerId !== panPointerId)) return
  const el = barContentRef.value
  if (el && panPointerId != null) {
    try {
      el.releasePointerCapture(panPointerId)
    } catch {
      /* ignore */
    }
  }
  panPointerId = null
  isPanningChips.value = false
}

let barResizeObserver = null

watch(isDropdownOpen, (open) => {
  if (open) nextTick(updateAnchorRect)
})

watch(
  () => allChips.value.length,
  (len, prev) => {
    nextTick(() => {
      if (prev != null && len > prev) scrollChipsIntoView()
      else updateScrollFade()
    })
  },
)

watch(localSearchQuery, () => nextTick(updateScrollFade))

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', onScrollOrResize, true)
  window.addEventListener('resize', onScrollOrResize)

  nextTick(() => {
    updateScrollFade()
    if (barContentRef.value) {
      // non-passive so preventDefault can map vertical wheel → horizontal scroll
      barContentRef.value.addEventListener('wheel', onBarWheel, { passive: false })
      barResizeObserver = new ResizeObserver(() => updateScrollFade())
      barResizeObserver.observe(barContentRef.value)
    }
  })
})

onBeforeUnmount(() => {
  barResizeObserver?.disconnect()
  barContentRef.value?.removeEventListener('wheel', onBarWheel)
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
})

// Provide to child sections
provide('unifiedFilter', {
  registerSection,
  unregisterSection,
  expandedSection,
  setExpanded,
  isDropdownOpen,
})
</script>

<style scoped>
.unified-filter {
  position: relative;
  width: 100%;
}

.unified-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: text;
  transition: all 150ms;
}

.unified-filter-bar:hover {
  border-color: #cbd5e1;
}

.unified-filter-bar-focused {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.unified-filter-search-icon {
  color: #94a3b8;
  flex-shrink: 0;
}

.unified-filter-scroll-wrap {
  flex: 1;
  min-width: 0;
  position: relative;
  overflow: hidden;
}

.unified-filter-scroll-wrap--fade::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 20px;
  background: linear-gradient(to right, transparent, white);
  pointer-events: none;
  z-index: 1;
}

.unified-filter-bar-content {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  /* UIUX-86: thin scrollbar only when chips overflow (class toggled in JS) */
  scrollbar-width: none;
  -ms-overflow-style: none;
  touch-action: pan-x;
}

.unified-filter-bar-content--overflow {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
  cursor: grab;
}

.unified-filter-bar-content--panning {
  cursor: grabbing;
  user-select: none;
}

.unified-filter-bar-content::-webkit-scrollbar {
  display: none;
  height: 0;
}

.unified-filter-bar-content--overflow::-webkit-scrollbar {
  display: block;
  height: 6px;
}

.unified-filter-bar-content--overflow::-webkit-scrollbar-track {
  background: transparent;
}

.unified-filter-bar-content--overflow::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.unified-filter-bar-content--overflow::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.unified-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  height: 24px;
  flex-shrink: 0;
}

.unified-chip-label { color: #64748b; }
.unified-chip-eq { color: #94a3b8; }
.unified-chip-value { color: #2563eb; }

.unified-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  border-radius: 2px;
  flex-shrink: 0;
}

.unified-chip-remove:hover {
  color: #64748b;
  background: #e2e8f0;
}

.unified-filter-input {
  flex: 1 0 80px;
  min-width: 80px;
  border: none;
  outline: none;
  font-size: 13px;
  color: #334155;
  background: transparent;
  padding: 2px 0;
}

.unified-filter-input::placeholder {
  color: #94a3b8;
}

.unified-filter-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  border-radius: 4px;
  flex-shrink: 0;
}

.unified-filter-clear-btn:hover {
  color: #64748b;
  background: #f1f5f9;
}

.unified-filter-dropdown {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-height: 60vh;
  overflow-y: auto;
}
</style>
