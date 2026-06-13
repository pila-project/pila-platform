<template>
  <div
    class="pagination-pages"
    role="group"
    :aria-label="`Page ${currentPage} of ${totalPages}`"
  >
    <template v-for="(item, idx) in range" :key="item === 'ellipsis' ? `ellipsis-${idx}` : item">
      <span v-if="item === 'ellipsis'" class="pagination-ellipsis" aria-hidden="true">…</span>
      <button
        v-else
        type="button"
        class="pagination-page-num"
        :class="{ 'pagination-page-num--active': item === currentPage }"
        :aria-label="`Page ${item}`"
        :aria-current="item === currentPage ? 'page' : undefined"
        @click="$emit('select', item)"
      >
        {{ item }}
      </button>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { getCollapsedPageRange, getResponsiveMaxPageButtons } from '@/utils/pagination-range.js'

const props = defineProps({
  currentPage: {
    type: Number,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  },
  /** Fixed max numeric buttons; omit for responsive (3–4). */
  maxButtons: {
    type: Number,
    default: null,
  },
  responsive: {
    type: Boolean,
    default: true,
  },
})

defineEmits(['select'])

const responsiveMax = ref(4)

function updateResponsiveMax() {
  responsiveMax.value = getResponsiveMaxPageButtons()
}

onMounted(() => {
  if (props.responsive && props.maxButtons == null) {
    updateResponsiveMax()
    window.addEventListener('resize', updateResponsiveMax)
  }
})

onUnmounted(() => {
  if (props.responsive && props.maxButtons == null) {
    window.removeEventListener('resize', updateResponsiveMax)
  }
})

const effectiveMax = computed(() => (
  props.maxButtons ?? (props.responsive ? responsiveMax.value : 4)
))

const range = computed(() => {
  if (props.totalPages <= 0) return []
  return getCollapsedPageRange(props.currentPage, props.totalPages, effectiveMax.value)
})
</script>