<template>
  <div :class="containerClass">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      :class="tabClass(tab)"
      @click="$emit('update:modelValue', tab.key)"
    >
      <LucideIcon v-if="tab.icon && tab.icon.startsWith('lucide:')" :name="tab.icon.slice(7)" :size="14" />
      <i v-else-if="tab.icon" :class="tab.icon.startsWith('fa') ? tab.icon : `fa fa-${tab.icon}`" />
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import LucideIcon from './LucideIcon.vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true,
  },
  tabs: {
    type: Array,
    required: true,
    // Each tab: { key: string, label: string, icon?: string }
  },
  type: {
    type: String,
    default: 'pill',
    validator: v => ['pill', 'line'].includes(v),
  },
  stretch: Boolean,
})

defineEmits(['update:modelValue'])

const containerClass = computed(() => [
  props.type === 'pill' ? 'ptabs-pill-container' : 'ptabs-line-container',
  props.stretch ? 'ptabs-stretch' : '',
])

function tabClass(tab) {
  const base = props.type === 'pill' ? 'ptabs-pill' : 'ptabs-line'
  const active = props.type === 'pill' ? 'ptabs-pill-active' : 'ptabs-line-active'
  return [base, tab.key === props.modelValue ? active : '']
}
</script>

<style scoped>
/* Pill tabs */
.ptabs-pill-container {
  display: inline-flex;
  gap: 0;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 4px;
  align-items: center;
}

.ptabs-pill {
  padding: 6px 10px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  border-radius: 6px;
  transition: all 150ms;
  white-space: nowrap;
  min-width: 56px;
  text-align: center;
}
.ptabs-pill:hover {
  color: #475569;
}
.ptabs-pill-active {
  background: white;
  color: #020617;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* Line tabs */
.ptabs-line-container {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #e2e8f0;
}

.ptabs-line {
  padding: 8px 16px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 150ms;
  white-space: nowrap;
}
.ptabs-line:hover {
  color: #334155;
}
.ptabs-line-active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

/* Stretch */
.ptabs-stretch > button {
  flex: 1;
}
</style>
