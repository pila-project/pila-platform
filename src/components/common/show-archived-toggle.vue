<template>
  <div class="show-archived-toggle">
    <PCheckbox v-model="modelValue" :id="checkboxId" size="sm" />
    <label :for="checkboxId">
      <em>{{ t('show-archived') }}</em>
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PCheckbox } from '@/components/ui/index.js'
import { useStore } from 'vuex'

const store = useStore()

function t(slug) { return store.getters.t(slug) }

const props = defineProps({
  modelValue: {
  	type: Boolean,
  	required: true
  }
})
const emit = defineEmits(['update:modelValue'])

const checkboxId = `show-archived-${Math.random().toString(36).substring(2, 8)}`

const modelValue = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
</script>

<style scoped>
.show-archived-toggle {
  color: #888888;
  display: flex;
  align-items: center;
  user-select: none;
  cursor: pointer;
}

.show-archived-toggle label {
  margin-left: 4px;
}
</style>