<template>
  <div class="overflow-auto">
    <table class="w-full border-collapse">
      <thead>
        <tr class="bg-slate-50 border-b border-slate-200">
          <th v-if="selectable" scope="col" class="table-header-cell w-10">
            <input
              type="checkbox"
              :checked="allSelected"
              :indeterminate="someSelected && !allSelected"
              @change="toggleAll"
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
              <i
                v-if="sortKey === header.key"
                :class="sortOrder === 'asc' ? 'fa fa-caret-up' : 'fa fa-caret-down'"
                class="text-xs"
              />
            </div>
          </th>
          <th v-if="expandable" scope="col" class="table-header-cell w-10" />
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading" class="table-row">
          <td :colspan="totalColumns" class="table-cell text-center py-8">
            <i class="fa fa-spinner fa-spin mr-2" />Loading...
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
              @click="$emit('click:row', $event, { item, index })"
            >
              <td v-if="selectable" class="table-cell w-10">
                <input
                  type="checkbox"
                  :checked="isSelected(item)"
                  @click.stop
                  @change="toggleSelect(item)"
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
              <td v-if="expandable" class="table-cell w-10 text-center">
                <button
                  class="btn btn-ghost btn-sm"
                  @click.stop="toggleExpand(item)"
                  :aria-expanded="isExpanded(item)"
                  aria-label="Expand row"
                >
                  <i :class="isExpanded(item) ? 'fa fa-chevron-up' : 'fa fa-chevron-down'" class="text-xs" />
                </button>
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
      v-if="showPagination && totalPages > 1"
      class="flex items-center justify-between px-4 py-3 border-t border-slate-200"
    >
      <div class="text-xs text-slate-500">
        {{ itemsPerPageText || 'Items per page' }}:
        <select
          :value="currentPerPage"
          class="ml-1 border border-slate-200 rounded px-1 py-0.5 text-xs"
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
      <div class="flex items-center gap-2">
        <button
          class="btn btn-ghost btn-sm"
          :disabled="currentPage <= 1"
          @click="currentPage--"
        >
          <i class="fa fa-chevron-left text-xs" />
        </button>
        <span class="text-xs text-slate-600">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <button
          class="btn btn-ghost btn-sm"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        >
          <i class="fa fa-chevron-right text-xs" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

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
})

const emit = defineEmits(['click:row', 'update:selected'])

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
  return cols
})

const sortedItems = computed(() => {
  if (!sortKey.value) return props.items
  const key = sortKey.value
  return [...props.items].sort((a, b) => {
    if (props.sortRaw) return sortOrder.value === 'asc' ? props.sortRaw(a, b) : props.sortRaw(b, a)
    const va = a[key], vb = b[key]
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

function toggleExpand(item) {
  const id = getItemId(item)
  const next = new Set(expandedRows.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedRows.value = next
}
</script>
