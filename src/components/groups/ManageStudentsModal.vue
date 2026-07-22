<template>
  <PModal
    :title="t('assign-students-to-group')"
    width="800px"
    @close="onRequestClose"
  >
    <template #title>
      <div>
        <h2 class="text-lg font-semibold text-zinc-950">{{ t('assign-students-to-group') }}</h2>
        <p class="text-sm text-slate-500 mt-0.5">{{ t('manage-students-in') }}: {{ groupName }}</p>
      </div>
    </template>

    <template #body>
      <!-- Info banner -->
      <div class="info-banner">
        <LucideIcon name="info" :size="16" />
        <span>Drag students between panels to add/remove them from the group. Alternatively, use checkboxes to select multiple students and move them to the groups.</span>
      </div>

      <div class="panels">
        <!-- Left: Available students -->
        <div
          class="panel"
          :class="{ 'panel--drop-target': dragTarget === 'available' }"
          @dragover.prevent="onDragOver('available')"
          @dragleave="onDragLeave('available', $event)"
          @drop.prevent="onDrop('available')"
        >
          <div class="panel-title-row">
            <h3 class="panel-title">{{ t('available-students') }} ({{ visibleAvailableStudents.length }})</h3>
            <PButton
              v-if="selectedAvailable.size"
              variant="secondary"
              size="sm"
              icon="lucide:user-plus"
              :text="`${t('add-selected')} (${selectedAvailable.size})`"
              @click="addSelectedToGroup"
            />
          </div>
          <div class="panel-search">
            <PUnifiedFilter
              v-model:searchQuery="availableSearch"
              :placeholder="t('search-available-students')"
            >
              <PUnifiedFilterSection
                id="available-status"
                :label="t('status')"
                icon="badge-check"
                :options="statusFilterOptions"
                v-model="availableStatusFilters"
              />
            </PUnifiedFilter>
          </div>
          <div class="panel-list">
            <div class="panel-list-header">
              <label class="panel-checkbox-cell">
                <PCheckbox
                  :modelValue="allAvailableSelected"
                  :indeterminate="someAvailableSelected && !allAvailableSelected"
                  size="sm"
                  @update:modelValue="toggleAllAvailable"
                />
              </label>
              <span class="panel-name-header">{{ t('name') }}</span>
            </div>
            <div
              v-for="student in filteredAvailable"
              :key="student.id"
              class="panel-row"
              :class="{
                'panel-row--dragging': draggingId === student.id && !multiDragActive,
                'panel-row--multi-drag': multiDragActive && dragIdSet.has(student.id),
              }"
              draggable="true"
              @dragstart="onDragStart(student.id, 'available', $event)"
              @dragend="onDragEnd"
            >
              <label class="panel-checkbox-cell">
                <PCheckbox
                  :modelValue="selectedAvailable.has(student.id)"
                  size="sm"
                  @update:modelValue="() => toggleAvailableSelection(student.id)"
                />
              </label>
              <div class="panel-student-name-cell">
                <span class="panel-student-name">
                  <DecryptedName :user="student.id" />
                </span>
                <PBadge
                  v-if="student.archived"
                  variant="warning"
                  :text="t('archived')"
                  class="panel-archived-badge"
                />
              </div>
              <span class="panel-drag-handle" :title="t('add')">
                <LucideIcon name="grip-vertical" :size="12" />
              </span>
            </div>
            <div v-if="!filteredAvailable.length" class="panel-empty">
              {{ dragTarget === 'available' ? t('drop-here') : t('no-available-students') }}
            </div>
          </div>
        </div>

        <!-- Right: Group students -->
        <div
          class="panel"
          :class="{ 'panel--drop-target': dragTarget === 'group' }"
          @dragover.prevent="onDragOver('group')"
          @dragleave="onDragLeave('group', $event)"
          @drop.prevent="onDrop('group')"
        >
          <div class="panel-title-row">
            <h3 class="panel-title">{{ t('students-in-group') }} '{{ groupName }}' ({{ groupStudents.length }})</h3>
            <PButton
              v-if="selectedGroup.size"
              variant="secondary"
              size="sm"
              icon="lucide:user-minus"
              :text="`${t('remove-selected')} (${selectedGroup.size})`"
              @click="removeSelectedFromGroup"
            />
          </div>
          <div class="panel-search">
            <PUnifiedFilter
              v-model:searchQuery="groupSearch"
              :placeholder="t('search-group-students')"
            />
          </div>
          <div class="panel-list">
            <div class="panel-list-header">
              <label class="panel-checkbox-cell">
                <PCheckbox
                  :modelValue="allGroupSelected"
                  :indeterminate="someGroupSelected && !allGroupSelected"
                  size="sm"
                  @update:modelValue="toggleAllGroup"
                />
              </label>
              <span class="panel-name-header">{{ t('name') }}</span>
            </div>
            <div
              v-for="student in filteredGroup"
              :key="student.id"
              class="panel-row"
              :class="{
                'panel-row--dragging': draggingId === student.id && !multiDragActive,
                'panel-row--multi-drag': multiDragActive && dragIdSet.has(student.id),
              }"
              draggable="true"
              @dragstart="onDragStart(student.id, 'group', $event)"
              @dragend="onDragEnd"
            >
              <label class="panel-checkbox-cell">
                <PCheckbox
                  :modelValue="selectedGroup.has(student.id)"
                  size="sm"
                  @update:modelValue="() => toggleGroupSelection(student.id)"
                />
              </label>
              <span class="panel-student-name">
                <DecryptedName :user="student.id" />
              </span>
              <PButton variant="icon" size="xsm" icon="lucide:trash-2" iconOnly :title="t('remove')" @click="removeFromGroup(student.id)" />
              <span class="panel-drag-handle" :title="t('remove')">
                <LucideIcon name="grip-vertical" :size="12" />
              </span>
            </div>
            <div v-if="!filteredGroup.length" class="panel-empty">
              {{ dragTarget === 'group' ? t('drop-here') : t('no-students-in-group') }}
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <PButton variant="secondary" color="danger" :text="t('cancel')" @click="onRequestClose" />
      <PButton variant="primary" :text="hasChanges ? t('update') : t('done')" :loading="flushing" @click="handleDone" />
    </template>
  </PModal>

  <PAlertDialog
    v-if="showDiscardConfirm"
    variant="warning"
    :title="t('discard-changes')"
    :description="t('unsaved-changes-will-be-lost')"
    :confirmText="t('discard')"
    :cancelText="t('cancel')"
    @confirm="discardAndClose"
    @cancel="showDiscardConfirm = false"
  />
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { useStore } from 'vuex'
import { useEncryptionKey } from '@/utils/useEncryptionKey.js'
import { PModal, PButton, PBadge, PUnifiedFilter, PUnifiedFilterSection, PCheckbox, PAlertDialog } from '@/components/ui/index.js'
import {
  defaultActiveStatusFilters,
  buildStatusFilterOptions,
} from '@/utils/status-filter.js'
import DecryptedName from '@/components/common/decrypted-name.vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { useToast } from '@/utils/useToast.js'
import {
  activeStudentsInGroup,
  availableStudentsForStatus,
} from '@/utils/group-student-counts.js'

const props = defineProps({
  groupId: { type: String, required: true },
  students: { type: Array, default: () => [] },
})

const emit = defineEmits(['close'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }
const { error: toastError } = useToast()

const availableSearch = ref('')
const groupSearch = ref('')
const availableStatusFilters = ref(defaultActiveStatusFilters())
const statusFilterOptions = computed(() => buildStatusFilterOptions(t))
const selectedAvailable = reactive(new Set())
const selectedGroup = reactive(new Set())

const { namePassword: encryptionKey } = useEncryptionKey(store)

// Decrypted name lookup for search
const nameMap = reactive({})

onMounted(async () => {
  for (const student of props.students) {
    try {
      const info = await store.getters.decryptUserInfo(student.id, false)
      nameMap[student.id] = (info?.name || '').toLowerCase()
    } catch {
      nameMap[student.id] = ''
    }
  }
})

// Re-decrypt student names when the encryption key is updated
watch(encryptionKey, (newKey) => {
  if (newKey) {
    Object.keys(nameMap).forEach(k => delete nameMap[k])
  }
})

// Drag state
const draggingId = ref(null)
const dragSource = ref(null)
const dragTarget = ref(null)
/** When multi-select drag is active, all ids being moved (for highlight + ghost). */
const dragIdSet = reactive(new Set())
const multiDragActive = computed(() => dragIdSet.size > 1)
let dragGhostEl = null

const groupName = computed(() => store.state.groups.groups[props.groupId]?.name || t('unnamed'))

const groupStudents = computed(() =>
  activeStudentsInGroup(props.groupId, props.students, store),
)

const visibleAvailableStudents = computed(() =>
  availableStudentsForStatus(
    props.students,
    props.groupId,
    store,
    availableStatusFilters.value,
  ),
)

const filteredAvailable = computed(() => {
  if (!availableSearch.value) return visibleAvailableStudents.value
  const q = availableSearch.value.toLowerCase()
  return visibleAvailableStudents.value.filter(s => (nameMap[s.id] || '').includes(q))
})

const filteredGroup = computed(() => {
  if (!groupSearch.value) return groupStudents.value
  const q = groupSearch.value.toLowerCase()
  return groupStudents.value.filter(s => (nameMap[s.id] || '').includes(q))
})

// Selection helpers
const allAvailableSelected = computed(() =>
  filteredAvailable.value.length > 0 && filteredAvailable.value.every(s => selectedAvailable.has(s.id))
)
const someAvailableSelected = computed(() =>
  filteredAvailable.value.some(s => selectedAvailable.has(s.id))
)
const allGroupSelected = computed(() =>
  filteredGroup.value.length > 0 && filteredGroup.value.every(s => selectedGroup.has(s.id))
)
const someGroupSelected = computed(() =>
  filteredGroup.value.some(s => selectedGroup.has(s.id))
)

function toggleAvailableSelection(id) {
  if (selectedAvailable.has(id)) selectedAvailable.delete(id)
  else selectedAvailable.add(id)
}

function toggleGroupSelection(id) {
  if (selectedGroup.has(id)) selectedGroup.delete(id)
  else selectedGroup.add(id)
}

function toggleAllAvailable() {
  if (allAvailableSelected.value) {
    filteredAvailable.value.forEach(s => selectedAvailable.delete(s.id))
  } else {
    filteredAvailable.value.forEach(s => selectedAvailable.add(s.id))
  }
}

function toggleAllGroup() {
  if (allGroupSelected.value) {
    filteredGroup.value.forEach(s => selectedGroup.delete(s.id))
  } else {
    filteredGroup.value.forEach(s => selectedGroup.add(s.id))
  }
}

// Drag handlers
function selectionForSource(source) {
  return source === 'available' ? selectedAvailable : selectedGroup
}

/** If the dragged row is part of a multi-selection, move the whole selection. */
function resolveDragIds(studentId, source) {
  const selected = selectionForSource(source)
  if (selected.has(studentId) && selected.size > 1) {
    return [...selected]
  }
  return [studentId]
}

function leadNameFor(id) {
  const n = nameMap[id]
  if (!n) return t('student')
  // nameMap is stored lowercased for search — title-case for the ghost
  return n.replace(/\b\w/g, c => c.toUpperCase())
}

function formatDragCount(count) {
  return count === 1
    ? `1 ${t('student')}`
    : `${count} ${t('students')}`
}

function cleanupDragGhost() {
  if (dragGhostEl?.parentNode) {
    dragGhostEl.parentNode.removeChild(dragGhostEl)
  }
  dragGhostEl = null
}

function setMultiStudentDragImage(event, ids) {
  cleanupDragGhost()
  const lead = leadNameFor(ids[0])
  const countText = formatDragCount(ids.length)

  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  Object.assign(el.style, {
    position: 'fixed',
    top: '-9999px',
    left: '-9999px',
    zIndex: '100000',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: '160px',
    maxWidth: '240px',
    padding: '10px 12px',
    borderRadius: '8px',
    background: '#1e293b',
    color: '#fff',
    boxShadow: '0 8px 24px rgb(15 23 42 / 0.28), 0 0 0 1px rgb(255 255 255 / 0.08)',
    fontFamily: 'inherit',
    pointerEvents: 'none',
  })

  const stack = document.createElement('div')
  Object.assign(stack.style, {
    position: 'absolute',
    inset: '4px -3px -3px 4px',
    borderRadius: '8px',
    background: '#334155',
    zIndex: '-1',
  })
  const stack2 = stack.cloneNode()
  Object.assign(stack2.style, {
    inset: '7px -5px -5px 7px',
    background: '#475569',
    zIndex: '-2',
  })
  el.appendChild(stack2)
  el.appendChild(stack)

  const leadEl = document.createElement('div')
  Object.assign(leadEl.style, {
    fontSize: '13px',
    fontWeight: '600',
    lineHeight: '1.3',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  })
  leadEl.textContent = lead || countText

  const countEl = document.createElement('div')
  Object.assign(countEl.style, {
    fontSize: '11px',
    fontWeight: '500',
    lineHeight: '1.3',
    color: '#cbd5e1',
  })
  countEl.textContent = countText

  el.appendChild(leadEl)
  el.appendChild(countEl)
  document.body.appendChild(el)
  dragGhostEl = el
  event.dataTransfer.setDragImage(el, 16, 16)
  requestAnimationFrame(() => cleanupDragGhost())
}

function onDragStart(studentId, source, event) {
  const ids = resolveDragIds(studentId, source)
  draggingId.value = studentId
  dragSource.value = source
  dragIdSet.clear()
  ids.forEach(id => dragIdSet.add(id))

  event.dataTransfer.effectAllowed = 'move'
  // Keep single id for legacy; multi is resolved from dragIdSet / selection on drop
  event.dataTransfer.setData('text/plain', studentId)

  if (ids.length > 1) {
    setMultiStudentDragImage(event, ids)
  }
}

function onDragEnd() {
  draggingId.value = null
  dragSource.value = null
  dragTarget.value = null
  dragIdSet.clear()
  cleanupDragGhost()
}

onBeforeUnmount(() => {
  dragIdSet.clear()
  cleanupDragGhost()
})

function onDragOver(target) {
  // Only highlight if dragging to the opposite panel
  if (dragSource.value && dragSource.value !== target) {
    dragTarget.value = target
  }
}

function onDragLeave(target, event) {
  // Only clear if actually leaving the panel (not entering a child)
  if (!event.currentTarget.contains(event.relatedTarget)) {
    if (dragTarget.value === target) dragTarget.value = null
  }
}

function onDrop(target) {
  const studentId = draggingId.value
  const source = dragSource.value
  const ids = dragIdSet.size
    ? [...dragIdSet]
    : (studentId ? resolveDragIds(studentId, source) : [])

  dragTarget.value = null
  draggingId.value = null
  dragIdSet.clear()
  cleanupDragGhost()

  if (!ids.length || !source || source === target) {
    dragSource.value = null
    return
  }

  if (target === 'group') {
    for (const id of ids) addToGroup(id)
    ids.forEach(id => selectedAvailable.delete(id))
  } else {
    for (const id of ids) removeFromGroup(id)
    ids.forEach(id => selectedGroup.delete(id))
  }
  dragSource.value = null
}

// Deferred persistence: collect promises, flush on Done/Update
const pendingOps = ref([])
const changeLog = ref([])
const flushing = ref(false)
const reverting = ref(false)
const showDiscardConfirm = ref(false)
const hasChanges = computed(() => changeLog.value.length > 0)

function queueMemberOp(dispatchPromise, entry) {
  pendingOps.value.push(dispatchPromise)
  changeLog.value.push(entry)
}

// Actions — optimistic commit is instant, Agent persistence is deferred
function addToGroup(userId) {
  queueMemberOp(
    store.dispatch('groups/addMember', { user_id: userId, group_id: props.groupId, defer: true }),
    { type: 'add', userId },
  )
}

function removeFromGroup(userId) {
  selectedGroup.delete(userId)
  queueMemberOp(
    store.dispatch('groups/removeMember', { user_id: userId, group_id: props.groupId, defer: true }),
    { type: 'remove', userId },
  )
}

function addSelectedToGroup() {
  const ids = [...selectedAvailable]
  for (const id of ids) addToGroup(id)
  selectedAvailable.clear()
}

function removeSelectedFromGroup() {
  const ids = [...selectedGroup]
  for (const id of ids) removeFromGroup(id)
  selectedGroup.clear()
}

async function handleDone() {
  if (hasChanges.value) {
    flushing.value = true
    try {
      await Promise.all(pendingOps.value)
      await store.dispatch('groups/flushMembers')
      changeLog.value = []
      pendingOps.value = []
    } finally {
      flushing.value = false
    }
  }
  emit('close')
}

function onRequestClose() {
  if (hasChanges.value) {
    showDiscardConfirm.value = true
    return
  }
  emit('close')
}

async function revertChanges() {
  const log = [...changeLog.value].reverse()
  for (const change of log) {
    if (change.type === 'add') {
      await store.dispatch('groups/removeMember', {
        user_id: change.userId,
        group_id: props.groupId,
        defer: true,
      })
    } else {
      await store.dispatch('groups/addMember', {
        user_id: change.userId,
        group_id: props.groupId,
        defer: true,
      })
    }
  }
  changeLog.value = []
  pendingOps.value = []
}

async function discardAndClose() {
  showDiscardConfirm.value = false
  reverting.value = true
  try {
    await revertChanges()
    await store.dispatch('groups/loadMembers')
  } finally {
    reverting.value = false
  }
  emit('close')
}
</script>

<style scoped>
.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: var(--color-primary-50);
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-primary-700);
  margin-bottom: 16px;
  line-height: 1.5;
}
.info-banner i {
  margin-top: 2px;
  flex-shrink: 0;
}

.panels {
  display: flex;
  gap: 16px;
}

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  border-radius: 10px;
  border: 2px solid transparent;
  padding: 4px;
  transition: border-color 200ms, background 200ms;
}

.panel--drop-target {
  border-color: var(--color-primary-400);
  background: var(--color-primary-50);
}

.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin: 0;
}

.panel-search {
  margin-bottom: 4px;
}

.panel-list {
  border: 1px solid var(--color-slate-200);
  border-radius: 8px;
  overflow: hidden;
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
}

.panel-list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-slate-50);
  border-bottom: 1px solid var(--color-slate-200);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-slate-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.panel-checkbox-cell {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  cursor: pointer;
}

.panel-name-header {
  flex: 1;
}

.panel-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-slate-100);
  transition: background 150ms, opacity 150ms;
  cursor: grab;
  user-select: none;
}
.panel-row:hover {
  background: var(--color-slate-50);
}
.panel-row:last-child {
  border-bottom: none;
}
.panel-row:active {
  cursor: grabbing;
}
.panel-row--dragging {
  opacity: 0.4;
}

/* Multi-select drag: all selected rows in the set look “in motion” */
.panel-row--multi-drag {
  opacity: 0.72;
  outline: 1px dashed #93c5fd;
  outline-offset: -1px;
  background: #eff6ff;
}

.panel-student-name-cell {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.panel-student-name {
  flex: 1;
  font-size: 14px;
  color: #334155;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-archived-badge {
  flex-shrink: 0;
}

.panel-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  border-radius: 4px;
  color: var(--color-slate-400);
  cursor: grab;
  flex-shrink: 0;
  font-size: 12px;
  transition: all 150ms;
}
.panel-drag-handle:hover {
  color: var(--color-slate-600);
}

.panel-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--color-slate-400);
  font-size: 13px;
}

/* Mobile */
@media (max-width: 768px) {
  .panels {
    flex-direction: column;
  }

  .panel-list {
    max-height: 250px;
  }
}
</style>
