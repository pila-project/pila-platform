<template>
  <div class="group-card content-card">
    <div class="group-card-header">
      <h3 class="group-card-name">{{ groupName }}</h3>
      <PMenu align-right>
        <template #activator="{ props }">
          <button class="group-card-menu-btn" @click="props.onClick">
            <i class="fa-solid fa-ellipsis-vertical" />
          </button>
        </template>
        <PMenuItem
          v-if="!archived"
          :title="t('edit')"
          prepend-icon="fa-solid fa-pencil"
          @click="$emit('edit')"
        />
        <PMenuItem
          v-if="!archived"
          :title="t('assign-students-to-group')"
          prepend-icon="fa-solid fa-users"
          @click="$emit('manage')"
        />
        <PMenuItem
          v-if="!archived"
          :title="t('archive')"
          prepend-icon="fa-solid fa-box-archive"
          @click="$emit('archive')"
        />
        <PMenuItem
          v-if="archived"
          :title="t('unarchive')"
          prepend-icon="fa-solid fa-box-open"
          @click="$emit('unarchive')"
        />
      </PMenu>
    </div>

    <div class="group-card-details">
      <div class="group-card-row" v-if="groupGrade">
        <span class="group-card-label">{{ t('group-details') }}</span>
        <span class="group-card-value">{{ groupGrade }}</span>
      </div>
      <div class="group-card-row">
        <span class="group-card-label">{{ t('students') }}</span>
        <span class="group-card-value">{{ memberCount }}</span>
      </div>
    </div>

    <button v-if="!archived" class="group-card-add-link" @click="$emit('manage')">
      <i class="fa-solid fa-user-plus" />
      {{ t('add-more-students') }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { PMenu, PMenuItem } from '@/components/ui/index.js'

const props = defineProps({
  groupId: { type: String, required: true },
  archived: Boolean,
})

defineEmits(['manage', 'edit', 'archive', 'unarchive'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const groupData = computed(() => store.state.groups.groups[props.groupId] || {})
const groupName = computed(() => groupData.value.name || t('unnamed'))
const groupGrade = computed(() => groupData.value.grade || '')
const memberCount = computed(() => store.getters['groups/members'](props.groupId).length)
</script>

<style scoped>
.group-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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
