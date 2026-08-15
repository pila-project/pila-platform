<template>
  <Teleport to="body">
    <div class="modal-overlay">
      <div class="modal-backdrop" @click="$emit('close')" />
      <div class="modal-dialog" role="dialog" aria-modal="true">
        <div v-if="loading" class="details-loading">
          <LucideIcon name="loader-2" :size="14" :spin="true" /> {{ t('loading') }}
        </div>
        <template v-else>
          <!-- Header -->
          <div class="details-header">
            <div>
              <h2 class="details-title">{{ t('view-assignment-details') }}</h2>
            </div>
            <PButton variant="icon" size="xsm" icon="lucide:x" iconOnly @click="$emit('close')" />
          </div>

          <div class="details-body">
            <!-- Assignment Information -->
            <div class="details-section">
              <h3 class="section-heading">
                <LucideIcon name="file-text" :size="14" class="section-icon" />
                {{ t('assignment-information') }}
              </h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">{{ t('title') }}</span>
                  <span class="info-value">{{ data.name || '--' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('type') }}</span>
                  <span class="info-value">{{ t(data.assignmentType ? data.assignmentType.toLowerCase() : 'assignment') }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('due-date') }}</span>
                  <span class="info-value">{{ data.dueDate ? formatDate(data.dueDate) : t('not-set') }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t('status') }}</span>
                  <span class="info-value" :class="statusClass">{{ t(status.toLowerCase()) }}</span>
                </div>
              </div>
              <div class="info-full">
                <span class="info-label">{{ t('instructions') }}</span>
                <span class="info-value">{{ data.description || t('no-instructions-provided') }}</span>
              </div>
            </div>

            <!--
              UIUX-79: Assignment settings category hidden for now (matches hidden wizard step).
              Re-enable with SHOW_ASSIGNMENT_SETTINGS in teacher-to-student when product wants it back.
            -->

            <!-- Assignment Groups & Students -->
            <div class="details-section">
              <h3 class="section-heading">
                <LucideIcon name="users" :size="14" class="section-icon" />
                {{ t('assignment-groups-students') }} ({{ assignedGroups.length }})
              </h3>
              <div v-if="assignedGroups.length === 0" class="empty-text">
                {{ t('no-groups-assigned') }}
              </div>
              <div v-else class="group-list">
                <div v-for="gid in assignedGroups" :key="gid" class="group-row">
                  <div class="group-icon">
                    <LucideIcon name="users" :size="14" />
                  </div>
                  <div class="group-info">
                    <span class="group-name">
                      <vueScopeComponent :id="gid" :path="['name']" />
                    </span>
                    <span class="group-meta">
                      <vueScopeComponent :id="gid" :path="['grade']">
                        <template v-slot="d">{{ d.value || '' }}</template>
                      </vueScopeComponent>
                      <template v-if="getGroupMembers(gid).length"> | {{ getGroupMembers(gid).length }} {{ t('students') }}</template>
                    </span>
                  </div>
                  <span class="group-badge">{{ getGroupMembers(gid).length }} {{ t('students') }}</span>
                </div>
              </div>
            </div>

            <!-- Content Items -->
            <div class="details-section">
              <h3 class="section-heading">
                <LucideIcon name="book-open" :size="14" class="section-icon" />
                {{ t('assignment-content') }} ({{ contentItems.length }})
              </h3>
              <div v-if="!contentItems.length" class="empty-text">
                {{ t('no-content-items-added') }}
              </div>
              <div v-else class="content-list">
                <div v-for="cid in contentItems" :key="cid" class="content-row">
                  <div class="content-info">
                    <span class="content-name">
                      <vueScopeComponent :id="cid" :path="['name']" />
                    </span>
                    <span class="content-desc">
                      <vueScopeComponent :id="cid" :path="['description']">
                        <template v-slot="d">{{ d.value || '' }}</template>
                      </vueScopeComponent>
                    </span>
                  </div>
                  <PButton variant="secondary" size="xsm" :text="t('preview')" @click="openPreview(cid)" />
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="details-footer">
            <PButton variant="secondary" color="danger" :text="t('cancel')" @click="$emit('close')" />
            <PButton variant="primary" :text="t('edit-assignment')" @click="$emit('edit')" />
          </div>
        </template>
      </div>
    </div>
  </Teleport>

  <PreviewModal
    v-if="previewing"
    :id="previewing"
    @close="previewing = null"
  />

  <SequencePreviewModal
    v-if="sequenceToPreview"
    :id="sequenceToPreview"
    @close="sequenceToPreview = null"
  />
</template>

<script setup>
  import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
  import { useStore } from 'vuex'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import { PButton } from '@/components/ui/index.js'
  import LucideIcon from '@/components/ui/LucideIcon.vue'
  import PreviewModal from '@/components/common/preview-modal.vue'
  import SequencePreviewModal from '@/components/content/sequence-preview-modal.vue'
  import { openContentPreview } from '@/utils/open-content-preview.js'
  import {
    effectiveAssignmentStatus,
    tryPromoteScheduledAssignment,
  } from '@/utils/assignment-status.js'

  const props = defineProps({
    id: { type: String, required: true },
  })

  const emit = defineEmits(['close', 'edit'])

  const store = useStore()
  function t(slug) { return store.getters.t(slug) }

  const loading = ref(true)
  const data = ref({})
  const previewing = ref(null)
  const sequenceToPreview = ref(null)

  function openPreview(id) {
    void openContentPreview(id, { previewing, sequenceToPreview })
  }

  const assignedGroups = computed(() =>
    store.getters['assignments/assignedGroups'](props.id, 'teacher-to-student', false)
  )

  const status = computed(() =>
    effectiveAssignmentStatus(data.value, {
      hasAssignedGroups: assignedGroups.value.length > 0,
    }),
  )

  const contentItems = computed(() => {
    if (!data.value.content) return []
    if (Array.isArray(data.value.content)) return data.value.content
    return [data.value.content]
  })

  const feedbackTimingKey = computed(() => {
    const v = (data.value.feedbackTiming || '').toLowerCase()
    if (v.includes('each')) return 'after-each-question'
    if (v.includes('never')) return 'never'
    return 'at-the-end'
  })

  const statusClass = computed(() => {
    const s = status.value
    if (s === 'Published' || s === 'Completed') return 'status-published'
    if (s === 'Draft') return 'status-draft'
    return 'status-scheduled'
  })

  function getGroupMembers(gid) {
    return store.getters['groups/members'](gid) || []
  }

  function formatDate(ts) {
    if (!ts) return '--'
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') emit('close')
  }

  onMounted(() => document.addEventListener('keydown', handleKeydown))
  onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown))

  async function init() {
    loading.value = true
    try {
      await tryPromoteScheduledAssignment(props.id)
      const state = await Agent.state(props.id)
      data.value = {
        name: state.name || '',
        description: state.description || '',
        content: Array.isArray(state.content) ? state.content : (state.content ? [state.content] : []),
        assignmentType: state.assignmentType || 'Assignment',
        dueDate: state.dueDate || null,
        dueTime: state.dueTime || null,
        status: state.status || null,
        scheduledDate: state.scheduledDate || null,
        scheduledTime: state.scheduledTime || null,
        publishedAt: state.publishedAt || null,
        allowLate: state.allowLate,
        maxAttempts: state.maxAttempts || '1',
        feedbackTiming: state.feedbackTiming || 'At the end',
        shuffleQuestions: state.shuffleQuestions || false,
        showAnswers: state.showAnswers || false,
        teacherNotes: state.teacherNotes || '',
      }
    } catch {
      data.value = { name: t('error-loading-assignment') }
    }
    loading.value = false
  }

  init()
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-nested);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal-dialog {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  width: 520px;
  max-width: 90vw;
  max-height: 90vh;
  padding: 20px;
}

.details-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px;
  color: #64748b;
  font-size: 14px;
}

/* Header */
.details-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.details-title {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  margin: 0;
}

.details-subtitle {
  font-size: 12px;
  color: #64748b;
  margin: 4px 0 0 0;
}

/* Body */
.details-body {
  overflow-y: auto;
  flex: 1;
  padding: 4px 0;
}

/* Sections */
.details-section {
  padding: 16px 0;
  border-bottom: 1px solid #e2e8f0;
}
.details-section:last-child {
  border-bottom: none;
}

.section-heading {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 14px;
  color: #2563eb;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-full {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 12px;
}

.info-label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.status-published {
  color: #16a34a;
}
.status-draft {
  color: #ca8a04;
}
.status-scheduled {
  color: #334155;
}

.empty-text {
  font-size: 13px;
  color: #94a3b8;
  padding: 8px 0;
}

/* Groups */
.group-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.group-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #dbeafe;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  display: block;
}

.group-meta {
  font-size: 12px;
  color: #64748b;
}

.group-badge {
  font-size: 12px;
  font-weight: 500;
  color: #2563eb;
  background: #eff6ff;
  padding: 2px 8px;
  border-radius: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Content items */
.content-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.content-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.content-info {
  flex: 1;
  min-width: 0;
}

.content-name {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  display: block;
}

.content-desc {
  font-size: 12px;
  color: #64748b;
  display: block;
  margin-top: 2px;
}

.preview-btn {
  padding: 4px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  flex-shrink: 0;
}
.preview-btn:hover {
  background: #f8fafc;
}

/* Footer */
.details-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

/* ── Mobile Responsive ── */
@media (max-width: 768px) {
  .modal-overlay {
    align-items: flex-end;
  }

  .modal-dialog {
    width: 100% !important;
    max-width: 100vw;
    max-height: 92vh;
    border-radius: 16px 16px 0 0;
    padding: 16px;
  }

  .details-title {
    font-size: 15px;
  }

  .details-subtitle {
    font-size: 11px;
  }

  .info-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px 16px;
  }

  .info-label {
    font-size: 11px;
  }

  .info-value {
    font-size: 12px;
  }

  .section-heading {
    font-size: 13px;
    margin-bottom: 10px;
  }

  .group-row {
    padding: 6px 10px;
  }

  .group-icon {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }

  .group-name {
    font-size: 13px;
  }

  .group-badge {
    font-size: 11px;
    padding: 2px 6px;
  }

  .content-name {
    font-size: 13px;
  }

  .details-footer {
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .info-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
