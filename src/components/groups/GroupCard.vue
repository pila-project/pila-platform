<template>
  <div
    class="group-card"
    :class="{ 'group-card--drop-target': isDragOver }"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="group-card-header">
      <h3 class="group-card-name">{{ groupName }}</h3>
      <PMenu align-right>
        <template #activator="{ props }">
          <button class="group-card-menu-btn" @click="props.onClick">
            <LucideIcon name="ellipsis-vertical" :size="16" />
          </button>
        </template>
        <PMenuItem
          v-if="!archived"
          :title="t('edit')"
          prepend-icon="lucide:pencil"
          @click="$emit('edit')"
        />
        <PMenuItem
          v-if="!archived"
          :title="t('assign-students-to-group')"
          prepend-icon="lucide:users"
          @click="$emit('manage')"
        />
        <PMenuItem
          v-if="!archived"
          :title="t('print-login-codes')"
          prepend-icon="lucide:printer"
          @click="$emit('print-login-codes')"
        />
        <PMenuItem
          v-if="!archived"
          :title="t('archive')"
          prepend-icon="lucide:archive"
          @click="$emit('archive')"
        />
        <PMenuItem
          v-if="archived"
          :title="t('unarchive')"
          prepend-icon="lucide:archive-restore"
          @click="$emit('unarchive')"
        />
        <PDivider v-if="!archived" />
        <PMenuItem
          v-if="!archived"
          :title="t('delete-group')"
          prepend-icon="lucide:trash-2"
          danger
          @click="$emit('delete')"
        />
      </PMenu>
    </div>

    <div class="group-card-details">
      <div class="group-card-row" v-if="groupGrade">
        <span class="group-card-label">{{ t('grade') }}</span>
        <span class="group-card-value">{{ groupGrade }}</span>
      </div>
      <div class="group-card-row" v-if="groupSubject">
        <span class="group-card-label">{{ t('subject') }}</span>
        <span class="group-card-value">{{ groupSubject }}</span>
      </div>
      <div class="group-card-row">
        <span class="group-card-label">{{ t('students') }}</span>
        <span class="group-card-value">{{ memberCount }}</span>
      </div>
    </div>

    <button v-if="!archived" class="group-card-add-link" @click="$emit('manage')">
      <LucideIcon name="user-plus" :size="14" />
      {{ t('add-more-students') }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { PMenu, PMenuItem, PDivider } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'

const props = defineProps({
  groupId: { type: String, required: true },
  archived: Boolean,
})

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const groupData = computed(() => store.state.groups.groups[props.groupId] || {})
const groupName = computed(() => groupData.value.name || t('unnamed'))
const groupGrade = computed(() => groupData.value.grade || '')
const groupSubject = computed(() => groupData.value.subject || '')
const memberCount = computed(() => store.getters['groups/members'](props.groupId).length)

const isDragOver = ref(false)
const emit = defineEmits(['manage', 'edit', 'archive', 'unarchive', 'delete', 'print-login-codes', 'drop-student'])

function onDragOver() {
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(event) {
  isDragOver.value = false
  try {
    const data = JSON.parse(event.dataTransfer.getData('application/json'))
    if (data?.id) {
      emit('drop-student', data.id)
    }
  } catch (e) { /* ignore invalid drop data */ }
}
</script>

<style scoped>
.group-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 8px;
  transition: all 150ms;
}

.group-card--drop-target {
  background: var(--color-primary-50);
  outline: 2px dashed var(--color-primary-400);
  outline-offset: -2px;
}

.group-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-slate-200);
}

.group-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin: 0;
}

.group-card-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  border-radius: 6px;
  color: var(--color-slate-400);
  cursor: pointer;
  transition: all 150ms;
}
.group-card-menu-btn:hover {
  background: var(--color-slate-100);
  color: var(--color-slate-700);
}

.group-card-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.group-card-label {
  color: var(--color-slate-500);
}

.group-card-value {
  font-weight: 600;
  color: #334155;
}

.group-card-add-link {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--color-primary-600);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  transition: color 150ms;
}
.group-card-add-link:hover {
  color: var(--color-primary-700);
}
</style>
