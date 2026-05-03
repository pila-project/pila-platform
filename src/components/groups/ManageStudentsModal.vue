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
        <span>{{ t('drag-students-info') }}</span>
      </div>

      <div class="panels">
        <!-- Left: Available students -->
        <div class="panel">
          <div class="panel-title-row">
            <h3 class="panel-title">{{ t('available-students') }} ({{ availableStudents.length }})</h3>
            <PButton
              v-if="selectedAvailable.size"
              variant="primary"
              size="sm"
              icon="lucide:user-plus"
              :text="`${t('add-selected')} (${selectedAvailable.size})`"
              @click="addSelectedToGroup"
            />
          </div>
          <div class="panel-search">
            <input
              v-model="availableSearch"
              class="input"
              :placeholder="t('search-available-students')"
            />
          </div>
          <div class="panel-list">
            <div class="panel-list-header">
              <label class="panel-checkbox-cell">
                <input
                  type="checkbox"
                  :checked="allAvailableSelected"
                  :indeterminate="someAvailableSelected && !allAvailableSelected"
                  @change="toggleAllAvailable"
                />
              </label>
              <span class="panel-name-header">{{ t('name') }}</span>
            </div>
            <div
              v-for="student in filteredAvailable"
              :key="student.id"
              class="panel-row"
            >
              <label class="panel-checkbox-cell">
                <input
                  type="checkbox"
                  :checked="selectedAvailable.has(student.id)"
                  @change="toggleAvailableSelection(student.id)"
                />
              </label>
              <span class="panel-student-name">
                <DecryptedName :user="student.id" />
              </span>
              <button class="panel-drag-handle" @click="addToGroup(student.id)" :title="t('add')">
                <LucideIcon name="grip-vertical" :size="12" />
              </button>
            </div>
            <div v-if="!filteredAvailable.length" class="panel-empty">
              {{ t('no-available-students') }}
            </div>
          </div>
        </div>

        <!-- Right: Group students -->
        <div class="panel">
          <h3 class="panel-title">{{ t('students-in-group') }} '{{ groupName }}' ({{ groupStudents.length }})</h3>
          <div class="panel-search">
            <input
              v-model="groupSearch"
              class="input"
              :placeholder="t('search-group-students')"
            />
          </div>
          <div class="panel-list">
            <div class="panel-list-header">
              <label class="panel-checkbox-cell">
                <input
                  type="checkbox"
                  :checked="allGroupSelected"
                  :indeterminate="someGroupSelected && !allGroupSelected"
                  @change="toggleAllGroup"
                />
              </label>
              <span class="panel-name-header">{{ t('name') }}</span>
            </div>
            <div
              v-for="student in filteredGroup"
              :key="student.id"
              class="panel-row"
            >
              <label class="panel-checkbox-cell">
                <input
                  type="checkbox"
                  :checked="selectedGroup.has(student.id)"
                  @change="toggleGroupSelection(student.id)"
                />
              </label>
              <span class="panel-student-name">
                <DecryptedName :user="student.id" />
              </span>
              <button class="panel-drag-handle" @click="removeFromGroup(student.id)" :title="t('remove')">
                <LucideIcon name="grip-vertical" :size="12" />
              </button>
            </div>
            <div v-if="!filteredGroup.length" class="panel-empty">
              {{ t('no-students-in-group') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Bulk remove button -->
      <div v-if="selectedGroup.size" class="bulk-actions">
        <PButton
          variant="danger"
          size="sm"
          icon="lucide:user-minus"
          :text="`${t('remove-selected')} (${selectedGroup.size})`"
          @click="removeSelectedFromGroup"
        />
      </div>
    </template>

    <template #footer>
      <div class="modal-footer-left">
        <PButton variant="outline" :text="t('back')" @click="$emit('close')" />
      </div>
      <div class="modal-footer-right">
        <PButton variant="secondary" :text="t('cancel')" @click="$emit('close')" />
        <PButton variant="primary" :text="t('save')" @click="$emit('close')" />
      </div>
    </template>
  </PModal>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useStore } from 'vuex'
import { PModal, PButton } from '@/components/ui/index.js'
import DecryptedName from '@/components/common/decrypted-name.vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'

const props = defineProps({
  groupId: { type: String, required: true },
  students: { type: Array, default: () => [] },
})

defineEmits(['close'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const availableSearch = ref('')
const groupSearch = ref('')
const selectedAvailable = reactive(new Set())
const selectedGroup = reactive(new Set())

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
  return availableStudents.value.filter(s => s.id.toLowerCase().includes(q))
})

const filteredGroup = computed(() => {
  if (!groupSearch.value) return groupStudents.value
  const q = groupSearch.value.toLowerCase()
  return groupStudents.value.filter(s => s.id.toLowerCase().includes(q))
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

// Actions
async function addToGroup(userId) {
  await store.dispatch('groups/addMember', { user_id: userId, group_id: props.groupId })
}

async function removeFromGroup(userId) {
  await store.dispatch('groups/removeMember', { user_id: userId, group_id: props.groupId })
  selectedGroup.delete(userId)
}

async function addSelectedToGroup() {
  const ids = [...selectedAvailable]
  for (const id of ids) {
    await store.dispatch('groups/addMember', { user_id: id, group_id: props.groupId })
  }
  selectedAvailable.clear()
}

async function removeSelectedFromGroup() {
  const ids = [...selectedGroup]
  for (const id of ids) {
    await store.dispatch('groups/removeMember', { user_id: id, group_id: props.groupId })
  }
  selectedGroup.clear()
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
  transition: background 150ms;
}
.panel-row:hover {
  background: var(--color-slate-50);
}
.panel-row:last-child {
  border-bottom: none;
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

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-slate-200);
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
