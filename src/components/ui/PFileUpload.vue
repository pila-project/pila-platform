<template>
  <div
    class="file-upload-area"
    :class="{ 'file-upload-area--drag': isDragging }"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
    @click="$refs.fileInput.click()"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      class="file-upload-input"
      @change="handleFileChange"
    />
    <LucideIcon name="upload" :size="24" class="file-upload-icon" />
    <span class="file-upload-label">{{ label || 'Drop file here or click to upload' }}</span>
    <span v-if="description" class="file-upload-desc">{{ description }}</span>
    <span v-if="selectedFileName" class="file-upload-file">{{ selectedFileName }}</span>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'

defineProps({
  accept: { type: String, default: '' },
  label: { type: String, default: '' },
  description: { type: String, default: '' },
})

const emit = defineEmits(['file-selected'])

const isDragging = ref(false)
const selectedFileName = ref('')

function handleDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer.files[0]
  if (file) {
    selectedFileName.value = file.name
    emit('file-selected', file)
  }
}

function handleFileChange(e) {
  const file = e.target.files[0]
  if (file) {
    selectedFileName.value = file.name
    emit('file-selected', file)
  }
}
</script>

<style scoped>
.file-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 24px;
  border: 2px dashed var(--color-slate-300, #cbd5e1);
  border-radius: 12px;
  background: var(--color-slate-50, #f8fafc);
  cursor: pointer;
  transition: all 150ms;
}
.file-upload-area:hover {
  border-color: var(--color-primary-400, #60a5fa);
  background: #eff6ff;
}
.file-upload-area--drag {
  border-color: var(--color-primary-500, #3b82f6);
  background: #dbeafe;
}

.file-upload-input {
  display: none;
}

.file-upload-icon {
  color: var(--color-slate-400, #94a3b8);
}

.file-upload-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-slate-600, #475569);
}

.file-upload-desc {
  font-size: 12px;
  color: var(--color-slate-400, #94a3b8);
}

.file-upload-file {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary-600, #2563eb);
  margin-top: 4px;
}
</style>
