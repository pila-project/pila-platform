<template>
  <div class="pagination">
    <div class="pagination-info">
      <span v-if="showRowCount">{{ startItem }}–{{ endItem }} of {{ totalItems }}</span>
      <span v-if="perPageOptions.length">
        Rows per page:
        <select
          :value="perPage"
          class="pagination-select"
          @change="$emit('update:perPage', Number($event.target.value))"
        >
          <option v-for="opt in perPageOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </span>
    </div>
    <div class="pagination-controls">
      <button
        class="pagination-btn"
        :disabled="currentPage <= 1"
        aria-label="Previous page"
        @click="$emit('update:currentPage', currentPage - 1)"
      >
        <i class="fa fa-chevron-left text-xs" />
      </button>
      <span class="pagination-page-info">
        Page {{ currentPage }} of {{ totalPages }}
      </span>
      <button
        class="pagination-btn"
        :disabled="currentPage >= totalPages"
        aria-label="Next page"
        @click="$emit('update:currentPage', currentPage + 1)"
      >
        <i class="fa fa-chevron-right text-xs" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  totalItems: {
    type: Number,
    required: true,
  },
  currentPage: {
    type: Number,
    default: 1,
  },
  perPage: {
    type: Number,
    default: 10,
  },
  perPageOptions: {
    type: Array,
    default: () => [10, 25, 50],
  },
  showRowCount: {
    type: Boolean,
    default: true,
  },
})

defineEmits(['update:currentPage', 'update:perPage'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.perPage)))
const startItem = computed(() => (props.currentPage - 1) * props.perPage + 1)
const endItem = computed(() => Math.min(props.currentPage * props.perPage, props.totalItems))
</script>
