<template>
  <div class="overflow-auto">
    <table class="w-full border-collapse">
      <thead>
        <tr class="bg-slate-50 border-b border-slate-200">
          <th v-if="selectable" scope="col" class="table-header-cell w-10">
            <PCheckbox
              :modelValue="allSelected"
              :indeterminate="someSelected && !allSelected"
              @update:modelValue="toggleAll"
            />
          </th>
          <th
            v-for="header in headers"
            :key="header.key"
            scope="col"
            class="table-header-cell"
            :class="{ 'cursor-pointer select-none': header.sortable !== false }"
            :aria-sort="sortKey === header.key ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined"
            @click="header.sortable !== false ? toggleSort(header.key) : null"
          >
            <div class="flex items-center gap-1">
              {{ header.title }}
              <LucideIcon
                v-if="header.sortable !== false"
                :name="sortKey === header.key
                  ? (sortOrder === 'asc' ? 'chevron-up' : 'chevron-down')
                  : 'arrow-up-down'"
                :size="12"
                class="sort-icon"
                :class="{ 'sort-icon-active': sortKey === header.key }"
              />
            </div>
          </th>
          <th v-if="draggableRows" scope="col" class="table-header-cell w-8" />
          <th v-if="expandable" scope="col" class="table-header-cell w-10" />
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading" class="table-row">
          <td :colspan="totalColumns" class="table-cell text-center py-8">
            <LucideIcon name="loader-2" :size="14" :spin="true" class="inline mr-2" />Loading...
          </td>
        </tr>
        <tr v-else-if="paginatedItems.length === 0" class="table-row">
          <td :colspan="totalColumns" class="table-cell text-center py-8 text-slate-500">
            {{ noDataText || 'No data available' }}
          </td>
        </tr>
        <template v-else>
          <template v-for="(item, index) in paginatedItems" :key="itemKey ? item[itemKey] : index">
            <tr
              class="table-row"
              :class="[
                clickableRows ? 'cursor-pointer' : '',
                rowClass ? rowClass(item) : '',
                isSelected(item) ? 'table-row-selected' : '',
                isExpanded(item) ? 'table-row-expanded' : '',
                item._disabled ? 'table-row-disabled' : '',
              ]"
              :style="rowStyle ? rowStyle(item) : {}"
              :draggable="draggableRows || undefined"
              @click="$emit('click:row', $event, { item, index })"
              @dragstart="draggableRows && onRowDragStart($event, item)"
              @dragend="draggableRows && onRowDragEnd($event, item)"
            >
              <td v-if="selectable" class="table-cell w-10">
                <PCheckbox
                  :modelValue="isSelected(item)"
                  @update:modelValue="() => toggleSelect(item)"
                  @click.stop
                />
              </td>
              <td
                v-for="header in headers"
                :key="header.key"
                class="table-cell"
              >
                <slot :name="`item.${header.key}`" :item="item" :index="index">
                  {{ item[header.key] }}
                </slot>
              </td>
              <td v-if="draggableRows" class="table-cell w-8 text-center drag-handle-cell">
                <LucideIcon name="grip-vertical" :size="14" class="drag-handle" />
              </td>
              <td v-if="expandable" class="table-cell w-10 text-center">
                <PButton
                  variant="ghost"
                  size="xsm"
                  :icon="isExpanded(item) ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                  iconOnly
                  @click.stop="toggleExpand(item)"
                  :aria-expanded="isExpanded(item)"
                  aria-label="Expand row"
                />
              </td>
            </tr>
            <tr v-if="expandable && isExpanded(item)" class="table-row-expansion">
              <td :colspan="totalColumns" class="px-4 py-3 bg-slate-50">
                <slot name="expanded-row" :item="item" :index="index" />
              </td>
            </tr>
          </template>
        </template>
      </tbody>
    </table>

    <!-- Pagination -->
    <div
      v-if="showPagination"
      class="ptable-pagination"
    >
      <div class="ptable-pagination-info">
        <span v-if="selectable && selectedCount > 0" class="ptable-selected-count">
          {{ selectedCount }} {{ selectedCount === 1 ? 'row' : 'rows' }} selected.
        </span>
      </div>
      <div class="ptable-pagination-center">
        {{ itemsPerPageText || 'Rows per page' }}
        <select
          :value="currentPerPage"
          class="ptable-per-page-select"
          @change="currentPerPage = Number($event.target.value); currentPage = 1"
        >
          <option
            v-for="opt in perPageOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.title }}
          </option>
        </select>
      </div>
      <div class="ptable-pagination-right">
        <span class="ptable-page-label">Page {{ currentPage }} of {{ totalPages }}</span>
        <div class="ptable-page-buttons">
          <button
            class="ptable-page-btn"
            :disabled="currentPage <= 1"
            @click="currentPage = 1"
            aria-label="First page"
          >
            <LucideIcon name="chevrons-left" :size="12" />
          </button>
          <button
            class="ptable-page-btn"
            :disabled="currentPage <= 1"
            @click="currentPage--"
            aria-label="Previous page"
          >
            <LucideIcon name="chevron-left" :size="12" />
          </button>
          <button
            class="ptable-page-btn"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
            aria-label="Next page"
          >
            <LucideIcon name="chevron-right" :size="12" />
          </button>
          <button
            class="ptable-page-btn"
            :disabled="currentPage >= totalPages"
            @click="currentPage = totalPages"
            aria-label="Last page"
          >
            <LucideIcon name="chevrons-right" :size="12" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import LucideIcon from './LucideIcon.vue'
import { PButton, PCheckbox } from './index.js'

const props = defineProps({
  headers: {
    type: Array,
    required: true
  },
  items: {
    type: Array,
    default: () => []
  },
  itemKey: String,
  loading: Boolean,
  noDataText: String,
  itemsPerPageText: String,
  itemsPerPage: {
    type: Number,
    default: 10
  },
  itemsPerPageOptions: {
    type: Array,
    default: () => [
      { value: 10, title: '10' },
      { value: 25, title: '25' },
      { value: 50, title: '50' },
      { value: -1, title: 'All' }
    ]
  },
  fixedHeader: Boolean,
  clickableRows: Boolean,
  rowClass: Function,
  rowStyle: Function,
  sortRaw: Function,
  selectable: Boolean,
  selected: {
    type: Array,
    default: () => []
  },
  expandable: Boolean,
  draggableRows: Boolean,
})

const emit = defineEmits(['click:row', 'update:selected', 'dragstart', 'dragend'])

const currentPage = ref(1)
const currentPerPage = ref(props.itemsPerPage)
const sortKey = ref(null)
const sortOrder = ref('asc')
const expandedRows = ref(new Set())

const perPageOptions = computed(() => props.itemsPerPageOptions)

const showPagination = computed(() => currentPerPage.value !== -1)

const totalColumns = computed(() => {
  let cols = props.headers.length
  if (props.selectable) cols++
  if (props.expandable) cols++
  if (props.draggableRows) cols++
  return cols
})

const sortedItems = computed(() => {
  if (!sortKey.value) return props.items
  const key = sortKey.value
  return [...props.items].sort((a, b) => {
    if (props.sortRaw) return sortOrder.value === 'asc' ? props.sortRaw(a, b) : props.sortRaw(b, a)

    const va = a[key]
    const vb = b[key]

    // Handle null/undefined
    if (va == null && vb == null) return 0
    if (va == null) return sortOrder.value === 'asc' ? -1 : 1
    if (vb == null) return sortOrder.value === 'asc' ? 1 : -1

    // String comparison: case-insensitive + natural numeric sort
    if (typeof va === 'string' && typeof vb === 'string') {
      const cmp = va.localeCompare(vb, undefined, {
        sensitivity: 'base',
        numeric: true
      })
      return sortOrder.value === 'asc' ? cmp : -cmp
    }

    // Fallback for numbers, dates, etc.
    if (va < vb) return sortOrder.value === 'asc' ? -1 : 1
    if (va > vb) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
})

const totalPages = computed(() => {
  if (currentPerPage.value === -1) return 1
  return Math.max(1, Math.ceil(sortedItems.value.length / currentPerPage.value))
})

const paginatedItems = computed(() => {
  if (currentPerPage.value === -1) return sortedItems.value
  const start = (currentPage.value - 1) * currentPerPage.value
  return sortedItems.value.slice(start, start + currentPerPage.value)
})

function toggleSort(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

// Selection
function getItemId(item) {
  return props.itemKey ? item[props.itemKey] : JSON.stringify(item)
}

function isSelected(item) {
  return props.selected.some(s => getItemId(s) === getItemId(item))
}

const itemIdSet = computed(() => new Set(props.items.map(getItemId)))

const selectedInList = computed(() =>
  props.selected.filter(s => itemIdSet.value.has(getItemId(s)))
)

const selectedCount = computed(() => selectedInList.value.length)

watch(
  () => props.items,
  () => {
    if (!props.selectable) return
    const pruned = selectedInList.value
    if (pruned.length !== props.selected.length) {
      emit('update:selected', pruned)
    }
  },
  { deep: true }
)

const allSelected = computed(() =>
  paginatedItems.value.length > 0 && paginatedItems.value.every(item => isSelected(item))
)

const someSelected = computed(() =>
  paginatedItems.value.some(item => isSelected(item))
)

function toggleSelect(item) {
  const id = getItemId(item)
  const newSelected = isSelected(item)
    ? props.selected.filter(s => getItemId(s) !== id)
    : [...props.selected, item]
  emit('update:selected', newSelected)
}

function toggleAll() {
  if (allSelected.value) {
    const pageIds = new Set(paginatedItems.value.map(getItemId))
    emit('update:selected', props.selected.filter(s => !pageIds.has(getItemId(s))))
  } else {
    const existing = new Set(props.selected.map(getItemId))
    const toAdd = paginatedItems.value.filter(item => !existing.has(getItemId(item)))
    emit('update:selected', [...props.selected, ...toAdd])
  }
}

// Expansion
function isExpanded(item) {
  return expandedRows.value.has(getItemId(item))
}

function onRowDragStart(event, item) {
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('application/json', JSON.stringify(item))
  emit('dragstart', { event, item })
}

function onRowDragEnd(event, item) {
  emit('dragend', { event, item })
}

function toggleExpand(item) {
  const id = getItemId(item)
  const next = new Set(expandedRows.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedRows.value = next
}
</script>

<style scoped>
.drag-handle-cell {
  padding: 0 4px !important;
}
.drag-handle {
  color: #94a3b8;
  cursor: grab;
}
.drag-handle:active {
  cursor: grabbing;
}

.sort-icon {
  color: #94a3b8;
}
.sort-icon-active {
  color: #334155;
}

.ptable-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
  gap: 16px;
  flex-wrap: wrap;
}

.ptable-pagination-info {
  flex-shrink: 0;
}

.ptable-selected-count {
  font-size: 14px;
  font-weight: 400;
  color: #64748b;
}

.ptable-pagination-center {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.ptable-per-page-select {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 14px;
  color: #334155;
  background: white;
  cursor: pointer;
}

.ptable-pagination-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.ptable-page-label {
  font-size: 14px;
  font-weight: 400;
  color: #334155;
}

.ptable-page-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ptable-page-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  font-size: 11px;
  transition: all 150ms;
}
.ptable-page-btn:hover:not(:disabled) {
  background: #f8fafc;
  color: #334155;
}
.ptable-page-btn:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
}
</style>
