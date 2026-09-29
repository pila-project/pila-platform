<template>
  <PModal :title="title" width="560px" @close="$emit('cancel')">
    <p class="academy-muted">{{ lead }}</p>
    <div v-if="resourceName" class="academy-reflection-resource">
      <LucideIcon name="file-text" :size="18" />
      <div>
        <strong>{{ resourceName }}</strong>
        <div class="academy-muted">{{ resourceMeta }}</div>
      </div>
    </div>
    <template v-if="mode === 'choice'">
      <p>{{ prompt }}</p>
      <button
        v-for="(option, index) in options"
        :key="index"
        type="button"
        class="academy-option"
        :class="{ selected: optionIndex === index }"
        :aria-pressed="optionIndex === index ? 'true' : 'false'"
        @click="optionIndex = index"
      >
        <LucideIcon :name="optionIndex === index ? 'circle-dot' : 'circle'" :size="16" />
        <span>{{ option }}</span>
      </button>
    </template>
    <template v-else>
      <PInput
        v-model="text"
        multiline
        :rows="6"
        :label="yourLabel"
        :placeholder="placeholder"
      />
      <div class="academy-progress-row">
        <span class="academy-muted">{{ hint }}</span>
        <span class="academy-muted">{{ characters }}</span>
      </div>
    </template>
    <template #footer>
      <PButton variant="outline" color="danger" :text="cancelLabel" @click="$emit('cancel')" />
      <PButton variant="primary" :text="submitLabel" :disabled="!canSubmit" :loading="submitting" @click="submit" />
    </template>
  </PModal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { PButton, PInput, PModal } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'

const props = defineProps({
  title: { type: String, default: '' },
  lead: { type: String, default: '' },
  resourceName: { type: String, default: '' },
  resourceMeta: { type: String, default: '' },
  mode: { type: String, default: 'text' },
  prompt: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  yourLabel: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  characterLabel: { type: Function, default: (n) => `${n}` },
  cancelLabel: { type: String, default: 'Cancel' },
  submitLabel: { type: String, default: 'Submit' },
  submitting: Boolean,
})

const emit = defineEmits(['cancel', 'submit'])
const text = ref('')
const optionIndex = ref(null)
const characters = computed(() => props.characterLabel(text.value.length))
const canSubmit = computed(() => (
  props.mode === 'choice' ? optionIndex.value != null : text.value.trim().length > 0
))

watch(() => props.mode, () => {
  text.value = ''
  optionIndex.value = null
})

function submit() {
  if (!canSubmit.value) return
  emit('submit', props.mode === 'choice'
    ? { optionIndex: optionIndex.value }
    : { text: text.value })
}
</script>

<style src="./academy.css"></style>
