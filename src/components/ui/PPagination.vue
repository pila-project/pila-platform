<template>
  <div class="pagination" :class="{ 'pagination--stacked': layout === 'stacked' }">
    <div v-if="showRowCount || perPageOptions.length" class="pagination-info">
      <span v-if="showRowCount">{{ startItem }}–{{ endItem }} of {{ totalItems }}</span>
      <span v-if="perPageOptions.length" class="pagination-per-page">
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
        <LucideIcon name="chevron-left" :size="12" />
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
        <LucideIcon name="chevron-right" :size="12" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import LucideIcon from './LucideIcon.vue'

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
  layout: {
    type: String,
    default: 'inline',
    validator: v => ['inline', 'stacked'].includes(v),
  },
})

defineEmits(['update:currentPage', 'update:perPage'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.perPage)))
const startItem = computed(() => (props.currentPage - 1) * props.perPage + 1)
const endItem = computed(() => Math.min(props.currentPage * props.perPage, props.totalItems))
</script>

<style>
.pagination--stacked {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 0 0;
  border-top: none;
}

.pagination--stacked .pagination-info {
  display: flex;
  justify-content: center;
  width: 100%;
}

.pagination--stacked .pagination-per-page {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-size: 12px;
}

.pagination--stacked .pagination-controls {
  justify-content: center;
  gap: 12px;
  width: 100%;
}

.pagination--stacked .pagination-page-info {
  font-size: 12px;
  min-width: 72px;
  text-align: center;
}

.pagination--stacked .pagination-select {
  max-width: 52px;
}
</style>
