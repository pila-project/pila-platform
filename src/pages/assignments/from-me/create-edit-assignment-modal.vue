<template>
  <Teleport to="body">
    <div class="modal-overlay" @keydown.esc="$emit('close')">
      <div class="modal-backdrop" @click.self="() => {}" />
      <div
        ref="modalRef"
        class="modal-dialog"
        :style="{ width: modalWidth }"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
      >
        <ResearcherToTeacherAssignment
          v-if="researcher"
          :id="id"
        />
        <TeacherToStudentAssignment
          v-else-if="teacher"
          :id="id"
          :editing="editing"
          :initial-content-ids="initialContentIds"
          @close="$emit('close')"
          @saved="$emit('saved', $event)"
          @update:width="w => modalWidth = w"
          @preview-active="childPreviewActive = $event"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
  import { ref, onMounted, onBeforeUnmount } from 'vue'
  import { lockBodyScroll, unlockBodyScroll } from '@/utils/body-scroll-lock.js'
  import ResearcherToTeacherAssignment from './researcher-to-teacher.vue'
  import TeacherToStudentAssignment from './teacher-to-student.vue'

  defineProps({
    id: String,
    teacher: Boolean,
    researcher: Boolean,
    editing: Boolean,
    initialContentIds: {
      type: Array,
      default: () => [],
    },
  })

  const emit = defineEmits(['close', 'saved'])
  const modalRef = ref(null)
  const modalWidth = ref('92vw')
  const childPreviewActive = ref(false)

  function handleKeydown(e) {
    if (e.key === 'Escape' && !childPreviewActive.value) emit('close')
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
    lockBodyScroll()
    modalRef.value?.focus()
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown)
    unlockBodyScroll()
  })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
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
  max-width: 96vw;
  width: 92vw;
  height: 90vh;
  overflow: hidden;
  padding: 20px;
  transition: width 300ms ease;
}

/* Mobile: bottom sheet style */
@media (max-width: 768px) {
  .modal-overlay {
    align-items: flex-end;
  }

  .modal-dialog {
    width: 100% !important;
    max-width: 100vw;
    height: 92vh;
    border-radius: 16px 16px 0 0;
    padding: 16px;
  }
}
</style>
