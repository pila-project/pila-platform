<template>
  <aside class="academy-finish" role="status">
    <div class="academy-finish-title">
      <LucideIcon name="circle-check" :size="18" color="#16a34a" />
      <h3>{{ title }}</h3>
    </div>
    <p>{{ body }}</p>
    <div class="academy-finish-actions">
      <button type="button" class="academy-finish-cancel" @click="$emit('cancel')">{{ cancelLabel }}</button>
      <button type="button" class="academy-finish-submit" @click="$emit('submit')">
        <LucideIcon name="file-text" :size="16" />
        {{ submitLabel }}
      </button>
    </div>
  </aside>
</template>

<script setup>
import LucideIcon from '@/components/ui/LucideIcon.vue'

defineProps({
  title: { type: String, default: '' },
  body: { type: String, default: '' },
  cancelLabel: { type: String, default: '' },
  submitLabel: { type: String, default: '' },
})

defineEmits(['cancel', 'submit'])
</script>

<style src="./academy.css"></style>
