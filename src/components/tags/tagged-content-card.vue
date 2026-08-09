<template>
  <div
    class="pcard"
    :class="{
      'pcard-selected': props.selected,
      'pcard-checked': assignmentPicker && checked && !inAssignment,
      'pcard-dragging': isDragging,
      'pcard-in-assignment': inAssignment,
      'pcard-no-drag': !isDraggable,
      'pcard-assignment-picker': assignmentPicker,
      'pcard-fixed': useFixedLayout,
    }"
    :draggable="isDraggable || undefined"
    @click="onCardClick"
    @dragstart="onCardDragStart"
    @dragend="onCardDragEnd"
  >
    <!-- Image area with overlays -->
    <div class="pcard-image-area">
      <!-- Explore: checkbox / Sequence view: order badge -->
      <div class="pcard-overlay-tl">
        <span v-if="sequenceView" class="pcard-order-badge">{{ orderLabel }}</span>
        <span v-else class="pcard-checkbox-wrap">
          <PCheckbox
            :modelValue="checked"
            @update:modelValue="$emit('toggle-select')"
            size="sm"
            @click.stop
          />
        </span>
      </div>
      <!-- Explore overlays / Sequence view: drag handle only -->
      <div class="pcard-overlay-tr">
        <template v-if="!sequenceView">
          <span v-if="inAssignment" class="pcard-in-assignment-badge">
            <LucideIcon name="check" :size="10" />
            {{ t('in-assignment') || 'In assignment' }}
          </span>
          <span v-if="!assignmentPicker && sequenceCount" class="pcard-seq-count">
            {{ sequenceCount }}
            <LucideIcon name="folders" :size="12" />
          </span>
          <button
            v-if="!assignmentPicker && showTaggingIcon"
            type="button"
            class="pcard-heart-btn"
            :aria-label="t('tag') || 'Tag'"
            @click.stop="$emit('tag')"
          >
            <LucideIcon name="tag" :size="14" />
          </button>
          <button
            v-if="!assignmentPicker"
            class="pcard-heart-btn"
            :class="{ 'pcard-heart-active': favorited }"
            @click.stop="$emit('toggle-favorite')"
          >
            <LucideIcon name="heart" :size="14" />
          </button>
        </template>
        <span v-if="isDraggable || sequenceView" class="pcard-drag-handle" aria-hidden="true">
          <LucideIcon name="grip-vertical" :size="12" />
        </span>
      </div>
      <!-- Image -->
      <div class="pcard-image">
        <img v-if="image" :src="image" loading="lazy" decoding="async" style="pointer-events: none;" />
        <div v-else class="pcard-image-placeholder">
          <LucideIcon name="image" :size="24" class="text-slate-300" />
        </div>
      </div>
      <!-- Copy & modify (Explore hover) -->
      <div v-if="showCopyModify" class="pcard-copy-overlay">
        <button
          type="button"
          class="pcard-copy-modify-btn"
          @click.stop="$emit('copy-modify')"
        >
          <LucideIcon name="files" :size="13" />
          <span>{{ copyModifyLabel }}</span>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="pcard-content">
      <!-- Source badge -->
      <div class="pcard-source-row">
        <span v-if="props.source === 'mine'" class="pcard-source pcard-source-mine">
          <LucideIcon name="folders" :size="10" class="pcard-source-icon" />{{ t('my-content') }}
        </span>
        <span v-else class="pcard-source pcard-source-pila">
          <LucideIcon name="crown" :size="10" class="pcard-source-icon" />{{ t('pila-content') }}
        </span>
      </div>

      <!-- Title -->
      <h3 class="pcard-title">
        <NameOrTranslatedNameFromItemId :itemId="props.id" />
      </h3>

      <!-- Description -->
      <p v-if="props.description" class="pcard-description">
        {{ props.description }}
      </p>

      <!-- Tag pills -->
      <div ref="tagsWrapRef" class="pcard-tags-wrap">
        <div v-if="useFixedLayout" class="pcard-tags-measure" aria-hidden="true">
          <span
            v-for="(grade, index) in displayGrades"
            :key="'measure-' + grade + '-' + index"
            :ref="el => setMeasureTagRef(el, index)"
            class="pcard-grade"
          >{{ grade }}</span>
          <span ref="moreBadgeMeasureRef" class="pcard-grade pcard-grade-more">+99</span>
          <span v-if="duration" ref="durationMeasureRef" class="pcard-duration">
            <LucideIcon name="clock-2" :size="12" />
            {{ duration }}
          </span>
        </div>

        <div class="pcard-tags" :class="{ 'pcard-tags--single-line': useFixedLayout }">
          <template v-if="useFixedLayout">
            <span
              v-for="(grade, index) in visibleGrades"
              :key="grade + '-' + index"
              class="pcard-grade"
            >{{ grade }}</span>
            <span
              v-if="hiddenGradeCount > 0"
              ref="moreBadgeRef"
              class="pcard-grade pcard-grade-more"
              @mouseenter="openOverflowPopup"
              @mouseleave="scheduleCloseOverflowPopup"
              @click.stop
            >
              +{{ hiddenGradeCount }}
            </span>
          </template>
          <template v-else>
            <span
              v-for="(grade, index) in displayGrades"
              :key="grade + '-' + index"
              class="pcard-grade"
            >{{ grade }}</span>
          </template>
          <span v-if="duration" class="pcard-duration">
            <LucideIcon name="clock-2" :size="12" />
            {{ duration }}
          </span>
        </div>
      </div>
    </div>

    <!-- Actions — @click.stop on container blocks native bubble to card root (assignment picker). -->
    <div v-if="assignmentPicker" class="pcard-actions" @click.stop>
      <PButton
        variant="secondary"
        size="sm"
        icon="lucide:eye"
        :text="t('preview')"
        @click="onPreviewClick"
        class="flex-1"
      />
    </div>
    <div v-else-if="assignmentContentView" class="pcard-actions" @click.stop>
      <PButton
        variant="secondary"
        size="sm"
        icon="lucide:eye"
        :text="t('preview')"
        @click="onPreviewClick"
        class="flex-1"
      />
      <PButton
        variant="secondary"
        color="danger"
        size="sm"
        icon="lucide:trash-2"
        :text="t('delete')"
        @click="onRemoveClick"
        class="flex-1"
      />
    </div>
    <div v-else class="pcard-actions" @click.stop>
      <PButton
        variant="secondary"
        size="sm"
        icon="lucide:eye"
        :text="t('preview')"
        @click.stop="$emit('preview')"
        class="flex-1"
      />
      <PButton
        v-if="sequenceView"
        variant="secondary"
        color="danger"
        size="sm"
        icon="lucide:trash-2"
        :text="t('delete')"
        @click.stop="$emit('remove')"
        class="flex-1"
      />
      <PButton
        v-else
        :variant="addDisabled ? 'secondary' : 'primary'"
        size="sm"
        :icon="addDisabled ? 'lucide:check' : 'lucide:plus'"
        :text="addDisabled ? (t('added') || 'Added') : t('add')"
        :disabled="addDisabled"
        @click.stop="onAddClick"
        class="flex-1"
      />
      <PButton
        variant="ghost"
        size="sm"
        icon="lucide:info"
        iconOnly
        @click.stop="$emit('info')"
      />
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="overflowPopupOpen && hiddenGradeCount > 0"
      class="pcard-tags-popup"
      :style="overflowPopupStyle"
      @mouseenter="openOverflowPopup"
      @mouseleave="scheduleCloseOverflowPopup"
      @click.stop
    >
      <span
        v-for="(grade, index) in hiddenGrades"
        :key="'hidden-' + grade + '-' + index"
        class="pcard-grade"
      >{{ grade }}</span>
    </div>
  </Teleport>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
  import { useStore } from 'vuex'
  import NameOrTranslatedNameFromItemId from '@/components/content/name-or-translated-name-from-item-id.vue'
  import {
    getContentImage,
    getContentType,
    imageCache,
    metadataCache,
  } from '@/utils/content-cache.js'
  import {
    SEQUENCE_DRAG_MIME,
    isSequenceActiveType,
  } from '@/utils/sequence-items.js'
  import LucideIcon from '@/components/ui/LucideIcon.vue'
  import { PCheckbox, PButton } from '@/components/ui/index.js'

  const store = useStore()
  function t(slug) { return store.getters.t(slug) }

  const props = defineProps({
    id: String,
    selected: Boolean,
    checked: Boolean,
    removable: Boolean,
    source: {
      type: String,
      default: 'pila'
    },
    description: String,
    grades: Array,
    typeBadge: {
      type: String,
      default: null
    },
    duration: String,
    sequenceCount: Number,
    favorited: Boolean,
    /** Item is already on the assignment being edited (picker UX). */
    inAssignment: Boolean,
    /** Item is already in the sequence being viewed (Explore sequence scope). */
    inSequence: Boolean,
    /** Show hover “Copy & modify” (Explore content library). */
    showCopyModify: {
      type: Boolean,
      default: false,
    },
    /** Sequence content modal: order badge, delete action, no add/checkbox. */
    sequenceView: Boolean,
    orderIndex: { type: Number, default: null },
    draggable: { type: Boolean, default: true },
    /** Assignment wizard content picker: checkbox + in-assignment badge only. */
    assignmentPicker: Boolean,
    /** Assignment wizard step 2 list: order badge, preview, delete. */
    assignmentContentView: Boolean,
    /** Trunk tagging modal affordance (off on simplified study domains). */
    showTaggingIcon: {
      type: Boolean,
      default: false,
    },
  })

  const isDraggable = computed(() => !props.assignmentPicker && props.draggable)
  const useFixedLayout = computed(() => !props.sequenceView)

  const emit = defineEmits(['info', 'preview', 'remove', 'add', 'toggle-select', 'copy-modify', 'toggle-favorite', 'tag'])

  const copyModifyLabel = computed(() =>
    t('copy-and-modify') || t('copy-and-modify-content') || 'Copy & modify',
  )

  const addDisabled = computed(() => props.inAssignment || props.inSequence)

  const orderLabel = computed(() => {
    if (props.orderIndex == null) return ''
    return String(props.orderIndex + 1).padStart(2, '0')
  })

  function onAddClick() {
    if (!addDisabled.value) emit('add')
  }

  function onPreviewClick(event) {
    event?.stopPropagation?.()
    emit('preview')
  }

  function onRemoveClick(event) {
    event?.stopPropagation?.()
    emit('remove')
  }

  function onCardClick() {
    if (!props.assignmentPicker) return
    emit('toggle-select')
  }

  const isDragging = ref(false)

  const DRAG_BLOCK_SELECTOR = 'button, input, textarea, select, label, .pcheckbox, .pcard-actions, .pcard-copy-overlay, .pcard-grade-more, .pcard-tags-popup'

  function isSequenceContent() {
    if (getContentType(props.id) === 'sequence') return true
    const meta = metadataCache.get(props.id)
    return isSequenceActiveType(meta?.active_type)
  }

  function setDragPayload(event) {
    event.dataTransfer.setData('text/plain', props.id)
    event.dataTransfer.setData('text', props.id)
    // UIUX-113: mark sequence drags so sequence drop targets can refuse nesting
    if (isSequenceContent()) {
      event.dataTransfer.setData(SEQUENCE_DRAG_MIME, props.id)
    }
    event.dataTransfer.effectAllowed = 'move'
  }

  function onCardDragStart(event) {
    if (!isDraggable.value) {
      event.preventDefault()
      return
    }
    if (event.target instanceof Element && event.target.closest(DRAG_BLOCK_SELECTOR)) {
      event.preventDefault()
      return
    }
    isDragging.value = true
    setDragPayload(event)
    const el = event.currentTarget
    if (el instanceof HTMLElement) {
      event.dataTransfer.setDragImage(el, Math.round(el.offsetWidth / 2), 48)
    }
  }

  function onCardDragEnd() {
    isDragging.value = false
  }

  const TAG_GAP = 5
  const displayGrades = computed(() => props.grades || [])
  const visibleCount = ref(0)
  const overflowPopupOpen = ref(false)

  const tagsWrapRef = ref(null)
  const moreBadgeRef = ref(null)
  const moreBadgeMeasureRef = ref(null)
  const durationMeasureRef = ref(null)
  const measureTagRefs = ref([])
  const overflowPopupStyle = ref({})

  const visibleGrades = computed(() => displayGrades.value.slice(0, visibleCount.value))
  const hiddenGrades = computed(() => displayGrades.value.slice(visibleCount.value))
  const hiddenGradeCount = computed(() => hiddenGrades.value.length)

  let overflowPopupTimer = null
  let resizeObserver = null

  function setMeasureTagRef(el, index) {
    if (el) measureTagRefs.value[index] = el
    else delete measureTagRefs.value[index]
  }

  function measureEl(el) {
    return el?.offsetWidth ?? 0
  }

  function rowWidth(tagWidths, visible, hiddenCount, durationWidth) {
    let used = 0

    for (let i = 0; i < visible; i++) {
      used += tagWidths[i] + (i > 0 ? TAG_GAP : 0)
    }

    if (hiddenCount > 0 && moreBadgeMeasureRef.value) {
      moreBadgeMeasureRef.value.textContent = `+${hiddenCount}`
      used += (visible > 0 ? TAG_GAP : 0) + measureEl(moreBadgeMeasureRef.value)
    }

    if (durationWidth > 0) {
      used += (used > 0 ? TAG_GAP : 0) + durationWidth
    }

    return used
  }

  async function recalculateVisibleTags() {
    if (!useFixedLayout.value) return

    await nextTick()

    const wrap = tagsWrapRef.value
    const grades = displayGrades.value
    if (!wrap) return

    if (!grades.length) {
      visibleCount.value = 0
      return
    }

    const containerWidth = wrap.clientWidth
    const tagEls = measureTagRefs.value.filter(Boolean)
    const tagWidths = tagEls.map(measureEl)
    const durationWidth = props.duration ? measureEl(durationMeasureRef.value) : 0

    if (rowWidth(tagWidths, grades.length, 0, durationWidth) <= containerWidth) {
      visibleCount.value = grades.length
      return
    }

    for (let visible = grades.length - 1; visible >= 0; visible--) {
      const hidden = grades.length - visible
      if (rowWidth(tagWidths, visible, hidden, durationWidth) <= containerWidth) {
        visibleCount.value = visible
        return
      }
    }

    visibleCount.value = 0
  }

  function updateOverflowPopupPosition() {
    const badge = moreBadgeRef.value
    if (!badge) return

    const rect = badge.getBoundingClientRect()
    overflowPopupStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + 6}px`,
      left: `${rect.left}px`,
      zIndex: '9999',
    }
  }

  function openOverflowPopup() {
    clearTimeout(overflowPopupTimer)
    updateOverflowPopupPosition()
    overflowPopupOpen.value = true
  }

  function scheduleCloseOverflowPopup() {
    clearTimeout(overflowPopupTimer)
    overflowPopupTimer = setTimeout(() => {
      overflowPopupOpen.value = false
    }, 200)
  }

  function setupTagResizeObserver() {
    resizeObserver?.disconnect()
    if (!useFixedLayout.value || !tagsWrapRef.value) return

    resizeObserver = new ResizeObserver(() => {
      recalculateVisibleTags()
      if (overflowPopupOpen.value) updateOverflowPopupPosition()
    })
    resizeObserver.observe(tagsWrapRef.value)
  }

  function onWindowChange() {
    if (overflowPopupOpen.value) updateOverflowPopupPosition()
  }

  watch(
    [displayGrades, () => props.duration, useFixedLayout],
    () => {
      overflowPopupOpen.value = false
      recalculateVisibleTags()
    },
    { deep: true },
  )

  const image = ref(null)

  onMounted(async () => {
    setupTagResizeObserver()
    recalculateVisibleTags()
    window.addEventListener('scroll', onWindowChange, true)
    window.addEventListener('resize', onWindowChange)

    try {
      if (imageCache.has(props.id)) {
        image.value = imageCache.get(props.id)
        return
      }
      image.value = await getContentImage(props.id)
    } catch {
      // silently fail — card renders without image
    }
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
    clearTimeout(overflowPopupTimer)
    window.removeEventListener('scroll', onWindowChange, true)
    window.removeEventListener('resize', onWindowChange)
  })
</script>

<style scoped>
/* ── Card container ── */
.pcard {
  background: #f8fafc;
  border-radius: 16px;
  overflow: hidden;
  cursor: grab;
  transition: box-shadow 150ms, opacity 150ms;
  display: flex;
  flex-direction: column;
}
.pcard-fixed {
  overflow: visible;
  border: 1px solid transparent;
  box-sizing: border-box;
}
.pcard-fixed.pcard-assignment-picker {
  border-width: 2px;
}
.pcard-fixed .pcard-image {
  height: 144px;
}
.pcard-fixed .pcard-content {
  flex: 0 0 auto;
  gap: 4px;
  overflow: visible;
}
.pcard-fixed .pcard-title {
  flex-shrink: 0;
  margin-top: 0;
}
.pcard-fixed .pcard-description {
  flex-shrink: 0;
}
.pcard-fixed .pcard-actions {
  flex-shrink: 0;
}
.pcard:hover:not(.pcard-fixed) {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid #cbd5e1;
}
.pcard-fixed:hover {
  border-color: #cbd5e1;
}
.pcard-dragging {
  cursor: grabbing;
  opacity: 0.55;
}
.pcard-no-drag {
  cursor: default;
}
.pcard-assignment-picker {
  cursor: pointer;
  overflow: visible;
  border: 2px solid transparent;
  box-sizing: border-box;
}
.pcard-assignment-picker:hover {
  border-color: #cbd5e1;
}
.pcard-assignment-picker.pcard-checked,
.pcard-assignment-picker.pcard-selected {
  border-color: var(--color-primary-300, #93c5fd);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  outline: none;
}
.pcard-assignment-picker.pcard-in-assignment {
  border-color: #86efac;
  outline: none;
  background: #f0fdf4;
}
.pcard-assignment-picker .pcard-image-area {
  overflow: hidden;
  border-radius: 14px 14px 0 0;
}

.pcard-order-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  background: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}
.pcard-actions,
.pcard-heart-btn,
.pcard-checkbox-wrap {
  cursor: pointer;
}
.pcard-selected {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  outline: 2px solid var(--color-primary-300);
}
.pcard-in-assignment {
  outline: 2px solid #86efac;
  background: #f0fdf4;
}
.pcard-in-assignment-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #166534;
  background: #dcfce7;
  border: 1px solid #86efac;
}

/* ── Image area ── */
.pcard-image-area {
  position: relative;
  background: #f1f5f9;
}

.pcard-copy-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.42);
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms;
}
.pcard:hover .pcard-copy-overlay {
  opacity: 1;
  pointer-events: auto;
}
.pcard-copy-modify-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #eab308;
  background: #fde047;
  color: #713f12;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(234, 179, 8, 0.35);
  transition: background 150ms, border-color 150ms;
}
.pcard-copy-modify-btn:hover {
  background: #facc15;
  border-color: #ca8a04;
}

.pcard-overlay-tl {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
}

.pcard-overlay-tr {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 6px;
}

.pcard-checkbox-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 4px;
}

.pcard-checkbox-wrap .pcheckbox {
  width: 14px;
  height: 14px;
  border-radius: 3.5px;
  border: 1.5px solid #64748b;
  cursor: pointer;
  accent-color: #2563eb;
}

/* Sequence count badge — green */
.pcard-seq-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #f0fdf4;
  color: #15803d;
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  border-radius: 8px;
}

/* Heart button */
.pcard-heart-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: white;
  border-radius: 6px;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  transition: all 150ms;
}
.pcard-heart-btn:hover {
  color: #ef4444;
}
.pcard-heart-btn:not(.pcard-heart-active) :deep(svg) {
  fill: none;
}
.pcard-heart-active {
  color: #ef4444;
}
.pcard-heart-active :deep(svg) {
  fill: currentColor;
  stroke: currentColor;
}

.pcard-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 6px;
  color: #64748b;
  pointer-events: none;
}
.pcard-drag-handle:hover {
  color: #334155;
}

.pcard-image {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 160px;
  overflow: hidden;
}
.pcard-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.pcard-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* ── Content area ── */
.pcard-content {
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

/* Source badge row */
.pcard-source-row {
  padding-top: 4px;
}
.pcard-fixed .pcard-source-row {
  padding-top: 2px;
}

.pcard-source {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
}
.pcard-source-icon {
  flex-shrink: 0;
}

/* PILA content: yellow/amber */
.pcard-source-pila {
  background: #fef9c3;
  color: #a16207;
}

/* My content: blue */
.pcard-source-mine {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #93c5fd;
}

/* Title */
.pcard-title {
  font-size: 18px;
  font-weight: 500;
  color: #334155;
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Description */
.pcard-description {
  font-size: 14px;
  font-weight: 400;
  color: #64748b;
  line-height: 20px;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Tag pills row */
.pcard-tags-wrap {
  position: relative;
  flex-shrink: 0;
  min-height: 28px;
}
.pcard-fixed .pcard-tags-wrap {
  height: 28px;
  margin-bottom: 15px;
  overflow: visible;
}
.pcard-tags-measure {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  display: flex;
  gap: 5px;
  align-items: center;
  white-space: nowrap;
  height: 0;
  overflow: hidden;
}
.pcard-tags {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  padding-bottom: 2px;
  align-items: center;
}
.pcard-tags--single-line {
  flex-wrap: nowrap;
  overflow: hidden;
  height: 28px;
  padding-bottom: 0;
}

.pcard-grade {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  line-height: 16px;
  background: white;
  flex-shrink: 0;
  white-space: nowrap;
}
.pcard-grade-more {
  cursor: default;
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #475569;
}
.pcard-tags-popup {
  position: fixed;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  width: max-content;
  max-width: min(240px, 70vw);
  padding: 8px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.pcard-tags-popup::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 0;
  right: 0;
  height: 8px;
}

/* Duration badge */
.pcard-duration {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  flex-shrink: 0;
  white-space: nowrap;
}

/* ── Actions row ── */
.pcard-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
}
</style>
