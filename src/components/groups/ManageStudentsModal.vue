<template>
  <PModal
    :title="t('assign-students-to-group')"
    width="800px"
    @close="$emit('close')"
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
            <h3 class="panel-title">{{ t('available-students') }} ({{ availableStudents.length }})</h3>
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
            />
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
              :class="{ 'panel-row--dragging': draggingId === student.id }"
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
              <span class="panel-student-name">
                <DecryptedName :user="student.id" />
              </span>
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
              :class="{ 'panel-row--dragging': draggingId === student.id }"
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
      <div class="modal-footer-left">
        <PButton v-if="showBack" variant="secondary" :text="t('back')" @click="$emit('back')" />
      </div>
      <div class="modal-footer-right">
        <PButton variant="secondary" color="danger" :text="t('cancel')" @click="$emit('close')" />
        <PButton variant="primary" :text="hasChanges ? t('update') : t('done')" :loading="flushing" @click="handleDone" />
      </div>
    </template>
  </PModal>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useStore } from 'vuex'
import { PModal, PButton, PUnifiedFilter, PCheckbox } from '@/components/ui/index.js'
import DecryptedName from '@/components/common/decrypted-name.vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { useToast } from '@/utils/useToast.js'

const props = defineProps({
  groupId: { type: String, required: true },
  students: { type: Array, default: () => [] },
  showBack: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'back'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }
const { error: toastError } = useToast()

const availableSearch = ref('')
const groupSearch = ref('')
const selectedAvailable = reactive(new Set())
const selectedGroup = reactive(new Set())

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

// Drag state
const draggingId = ref(null)
const dragSource = ref(null)
const dragTarget = ref(null)

const groupName = computed(() => store.state.groups.groups[props.groupId]?.name || t('unnamed'))

const groupMembers = computed(() => store.getters['groups/members'](props.groupId))

const groupStudents = computed(() =>
  props.students.filter(s => groupMembers.value.includes(s.id))
)

const availableStudents = computed(() =>
  props.students.filter(s => !groupMembers.value.includes(s.id))
)

const filteredAvailable = computed(() => {
  if (!availableSearch.value) return availableStudents.value
  const q = availableSearch.value.toLowerCase()
  return availableStudents.value.filter(s => (nameMap[s.id] || '').includes(q))
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
function onDragStart(studentId, source, event) {
  draggingId.value = studentId
  dragSource.value = source
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', studentId)
}

function onDragEnd() {
  draggingId.value = null
  dragSource.value = null
  dragTarget.value = null
}

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
  dragTarget.value = null
  draggingId.value = null

  if (!studentId || source === target) return

  if (target === 'group') {
    // If the dragged student is part of a multi-selection, move all selected
    if (selectedAvailable.has(studentId) && selectedAvailable.size > 1) {
      const ids = [...selectedAvailable]
      for (const id of ids) addToGroup(id)
      selectedAvailable.clear()
    } else {
      addToGroup(studentId)
    }
  } else {
    if (selectedGroup.has(studentId) && selectedGroup.size > 1) {
      const ids = [...selectedGroup]
      for (const id of ids) removeFromGroup(id)
      selectedGroup.clear()
    } else {
      removeFromGroup(studentId)
    }
  }
  dragSource.value = null
}

// Deferred persistence: collect promises, flush on Done/Update
const pendingOps = ref([])
const flushing = ref(false)
const hasChanges = computed(() => pendingOps.value.length > 0)

// Actions — optimistic commit is instant, Agent persistence is deferred
function addToGroup(userId) {
  pendingOps.value.push(
    store.dispatch('groups/addMember', { user_id: userId, group_id: props.groupId, defer: true })
  )
}

function removeFromGroup(userId) {
  selectedGroup.delete(userId)
  pendingOps.value.push(
    store.dispatch('groups/removeMember', { user_id: userId, group_id: props.groupId, defer: true })
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
    } finally {
      flushing.value = false
    }
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

.panel-student-name {
  flex: 1;
  font-size: 14px;
  color: #334155;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* Footer layout */
.modal-footer-left {
  margin-right: auto;
}
.modal-footer-right {
  display: flex;
  gap: 8px;
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
