<template>
  <div class="eap-header">
    <div class="eap-header-text">
      <div class="eap-title-row">
        <LucideIcon name="plus" :size="14" class="eap-title-icon" />
        <h2 class="eap-title">{{ title }}</h2>
      </div>
      <p v-if="subtitle" class="eap-subtitle">{{ subtitle }}</p>
    </div>
  </div>
</template>

<script setup>
import LucideIcon from '@/components/ui/LucideIcon.vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.eap-header {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
}

.eap-header-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.eap-title-row {
  display: flex;
  align-items: center;
  gap: 3px;
}

.eap-title-icon {
  color: #334155;
  flex-shrink: 0;
}

.eap-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
  color: #334155;
}

.eap-subtitle {
  margin: 0;
  font-size: 12px;
  line-height: 16px;
  color: #334155;
}
</style>
