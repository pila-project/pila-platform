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
          @close="$emit('close')"
          @update:width="w => modalWidth = w"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
  import { ref, onMounted, onBeforeUnmount } from 'vue'
  import ResearcherToTeacherAssignment from './researcher-to-teacher.vue'
  import TeacherToStudentAssignment from './teacher-to-student.vue'

  defineProps({
    id: String,
    teacher: Boolean,
    researcher: Boolean,
  })

  const emit = defineEmits(['close'])
  const modalRef = ref(null)
  const modalWidth = ref('480px')

  function handleKeydown(e) {
    if (e.key === 'Escape') emit('close')
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'
    modalRef.value?.focus()
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
  })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
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
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px;
  transition: width 300ms ease;
}
</style>
