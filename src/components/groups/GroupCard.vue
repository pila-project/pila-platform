<template>
  <div
    class="group-card"
    :class="{ 'group-card--drop-target': isDragOver && !archived }"
    @dragover.prevent="!archived && onDragOver($event)"
    @dragleave="!archived && onDragLeave()"
    @drop.prevent="!archived && onDrop($event)"
  >
    <div class="group-card-header">
      <div class="group-card-title-row">
        <h3 class="group-card-name">{{ groupName }}</h3>
        <span v-if="archived" class="group-card-archived-badge">{{ t('archived') }}</span>
      </div>
      <PMenu align-right>
        <template #activator="{ props: menuProps }">
          <PButton variant="icon" size="sm" icon="lucide:ellipsis-vertical" iconOnly @click="menuProps.onClick" />
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
          :title="t('restore') || 'Restore'"
          prepend-icon="lucide:archive-restore"
          @click="$emit('unarchive')"
        />
      </PMenu>
    </div>

    <div class="group-card-divider" />

    <div class="group-card-content" :class="{ 'group-card-content--archived': archived }">
      <div class="group-card-row">
        <span class="group-card-label">{{ t('grade') }}</span>
        <span class="group-card-value">{{ groupGrade || '—' }}</span>
      </div>
      <div class="group-card-row">
        <span class="group-card-label">{{ t('subject') }}</span>
        <span class="group-card-value">{{ groupSubject || '—' }}</span>
      </div>
      <div class="group-card-students-row">
        <div class="group-card-row group-card-row--inline">
          <span class="group-card-label">{{ t('students') }}</span>
          <span class="group-card-value">{{ memberCount }}</span>
        </div>
        <PButton
          v-if="!archived"
          variant="link"
          size="xsm"
          icon="lucide:users"
          :text="t('view-students')"
          class="group-card-add-btn"
          @click="$emit('manage')"
        />
        <button
          v-else
          type="button"
          class="group-card-restore-btn"
          @click="$emit('unarchive')"
        >
          {{ t('restore') || 'Restore' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { PMenu, PMenuItem } from '@/components/ui/index.js'
import PButton from '@/components/ui/PButton.vue'

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
const emit = defineEmits(['manage', 'edit', 'archive', 'unarchive', 'print-login-codes', 'drop-student'])

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
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border-radius: 8px;
  overflow: hidden;
  transition: background 150ms, outline 150ms;
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
  gap: 12px;
  padding: 12px 16px;
}

.group-card-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.group-card-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: #334155;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-card-archived-badge {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 4px 12px;
  border-radius: 9999px;
  background: #fff7ed;
  border: 1px solid #ea580c;
  color: #ea580c;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}

.group-card-divider {
  height: 1px;
  margin: 0 16px;
  background: #e2e8f0;
}

.group-card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 6px 16px 16px;
}

.group-card-content--archived .group-card-label,
.group-card-content--archived .group-card-value {
  color: #949dab;
}

.group-card-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 16px;
}

.group-card-row--inline {
  flex: 1;
  min-width: 0;
}

.group-card-label {
  flex-shrink: 0;
  width: 60px;
  color: #64748b;
  font-weight: 400;
}

.group-card-value {
  font-weight: 500;
  color: #334155;
}

.group-card-students-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.group-card-add-btn {
  flex-shrink: 0;
}

.group-card-restore-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid #2563eb;
  background: #ffffff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
  transition: background 150ms;
}

.group-card-restore-btn:hover {
  background: #eff6ff;
}
</style>