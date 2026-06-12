<template>
  <div
    class="pcard"
    :class="{
      'pcard-selected': props.selected,
      'pcard-dragging': isDragging,
      'pcard-in-assignment': inAssignment,
      'pcard-no-drag': !draggable,
    }"
    :draggable="draggable || undefined"
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
          <span v-if="sequenceCount" class="pcard-seq-count">
            {{ sequenceCount }}
            <LucideIcon name="folders" :size="12" />
          </span>
          <button class="pcard-heart-btn" :class="{ 'pcard-heart-active': favorited }" @click.stop="$emit('toggle-favorite')">
            <LucideIcon name="heart" :size="14" />
          </button>
        </template>
        <span v-if="draggable || sequenceView" class="pcard-drag-handle" aria-hidden="true">
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
      <p class="pcard-description">
        {{ props.description }}
      </p>

      <!-- Tag pills -->
      <div class="pcard-tags">
        <span v-for="grade in displayGrades" :key="grade" class="pcard-grade">{{ grade }}</span>
        <span v-if="duration" class="pcard-duration">
          <LucideIcon name="clock-2" :size="12" />
          {{ duration }}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="pcard-actions">
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
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import NameOrTranslatedNameFromItemId from '@/components/content/name-or-translated-name-from-item-id.vue'
  import { getContentImage, imageCache } from '@/utils/content-cache.js'
  import LucideIcon from '@/components/ui/LucideIcon.vue'
import { PCheckbox } from '@/components/ui/index.js'
  import { PButton } from '@/components/ui/index.js'

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
  })

  const emit = defineEmits(['info', 'preview', 'remove', 'add', 'toggle-select', 'copy-modify', 'toggle-favorite'])

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

  const isDragging = ref(false)

  const DRAG_BLOCK_SELECTOR = 'button, input, textarea, select, label, .pcheckbox, .pcard-actions, .pcard-copy-overlay'

  function setDragPayload(event) {
    event.dataTransfer.setData('text/plain', props.id)
    event.dataTransfer.setData('text', props.id)
    event.dataTransfer.effectAllowed = 'move'
  }

  function onCardDragStart(event) {
    if (!props.draggable) {
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

  const displayGrades = props.grades || []

  const image = ref(null)

  onMounted(async () => {
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
.pcard:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid #cbd5e1;
}
.pcard-dragging {
  cursor: grabbing;
  opacity: 0.55;
}
.pcard-no-drag {
  cursor: default;
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
  margin-top: 10px;
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
.pcard-tags {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  padding-bottom: 2px;
  align-items: center;
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
}

/* ── Actions row ── */
.pcard-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
}
</style>
