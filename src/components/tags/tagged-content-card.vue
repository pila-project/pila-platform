<template>
  <div
    class="pcard"
    :class="{ 'pcard-selected': props.selected }"
    draggable="true"
    @dragstart="$event.dataTransfer.setData('text', props.id)"
    @click="$emit('click')"
  >
    <!-- Image area with overlays -->
    <div class="pcard-image-area">
      <!-- Checkbox -->
      <div class="pcard-overlay-tl">
        <span class="pcard-checkbox-wrap">
          <input
            type="checkbox"
            class="pcard-checkbox"
            :checked="checked"
            @click.stop
            @change="$emit('toggle-select')"
          />
        </span>
      </div>
      <!-- Item badge + Drag handle -->
      <div class="pcard-overlay-tr">
        <span class="pcard-type-badge">
          {{ props.typeBadge || t('item') }}
        </span>
        <button class="pcard-drag-handle" @click.stop>
          <i class="fa-solid fa-grip-vertical" />
        </button>
      </div>
      <!-- Image -->
      <div class="pcard-image">
        <img v-if="image" :src="image" style="pointer-events: none;" />
        <div v-else class="pcard-image-placeholder">
          <i class="fa-solid fa-image text-slate-300 text-2xl" />
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="pcard-content">
      <!-- Source badge -->
      <div class="pcard-source-row">
        <span v-if="props.source === 'mine'" class="pcard-source pcard-source-mine">
          <i class="fa-solid fa-user pcard-source-icon" />{{ t('my-content') }}
        </span>
        <span v-else class="pcard-source pcard-source-pila">
          <i class="fa-solid fa-crown pcard-source-icon" />{{ t('pila-content') }}
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
      <div v-if="displayGrades.length" class="pcard-grades">
        <span v-for="grade in displayGrades" :key="grade" class="pcard-grade">{{ grade }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="pcard-actions">
      <button class="pcard-btn pcard-btn-preview" @click.stop="$emit('preview')">
        <i class="fa-regular fa-eye pcard-btn-icon" />
        {{ t('preview') }}
      </button>
      <button class="pcard-btn pcard-btn-add" @click.stop="$emit('add')">
        <i class="fa-solid fa-plus pcard-btn-icon" />
        {{ t('add') }}
      </button>
      <button class="pcard-btn-info" @click.stop="$emit('click')">
        <i class="fa-solid fa-circle-info" />
      </button>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import NameOrTranslatedNameFromItemId from '@/components/content/name-or-translated-name-from-item-id.vue'
  import { getContentImage } from '@/utils/content-cache.js'

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
  })

  defineEmits(['click', 'preview', 'remove', 'add', 'toggle-select', 'copy-modify'])

  const displayGrades = props.grades || []

  const image = ref(null)

  onMounted(async () => {
    try {
      image.value = await getContentImage(props.id)
    } catch (e) {
      // silently fail — card renders without image
    }
  })
</script>

<style scoped>
/* ── Card container ── */
.pcard {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 150ms;
  display: flex;
  flex-direction: column;
}
.pcard:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.pcard-selected {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: var(--color-primary-300);
}

/* ── Image area ── */
.pcard-image-area {
  position: relative;
  background: #f8fafc;
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

.pcard-checkbox {
  width: 14px;
  height: 14px;
  border-radius: 3.5px;
  border: 1.5px solid #64748b;
  cursor: pointer;
  accent-color: #10B981;
}

/* Item/Sequence type badge — green */
.pcard-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: #f0fdf4;
  color: #15803d;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  border-radius: 8px;
}
.pcard-type-icon {
  font-size: 10px;
}

.pcard-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 6px;
  border: none;
  color: #64748b;
  font-size: 12px;
  cursor: grab;
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
  font-size: 10px;
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
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Grade pills */
.pcard-grades {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  padding-bottom: 2px;
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

/* ── Actions row ── */
.pcard-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
}

.pcard-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 36px;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
  transition: all 150ms;
  border: none;
  flex: 1;
}
.pcard-btn-icon {
  font-size: 14px;
}

/* Preview button: white bg, blue text, slate border */
.pcard-btn-preview {
  background: white;
  color: #2563eb;
  border: 1px solid #e2e8f0;
}
.pcard-btn-preview:hover {
  background: #f8fafc;
}

/* Add button: blue bg, white text */
.pcard-btn-add {
  background: #2563eb;
  color: white;
}
.pcard-btn-add:hover {
  background: #1d4ed8;
}

/* Info button */
.pcard-btn-info {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #2563eb;
  font-size: 18px;
  cursor: pointer;
  transition: all 150ms;
}
.pcard-btn-info:hover {
  background: #f8fafc;
  color: #1d4ed8;
}
</style>
