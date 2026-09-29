<template>
  <section class="academy-check" :aria-label="heading">
    <div v-if="showHeading" class="academy-check-head">
      <span class="academy-q">{{ qLabel }}</span>
      <h3>{{ heading }}</h3>
    </div>
    <p v-if="lead" class="lead">{{ lead }}</p>
    <p class="prompt">{{ prompt }}</p>
    <div class="academy-options">
      <button
        v-for="(option, index) in options"
        :key="index"
        type="button"
        class="academy-option"
        :class="optionClass(index)"
        :aria-pressed="selected === index ? 'true' : 'false'"
        @click="choose(index)"
      >
        <span class="academy-radio" aria-hidden="true" />
        <span>{{ option }}</span>
      </button>
    </div>
    <button
      v-if="!revealed || continueLabel"
      type="button"
      class="academy-continue"
      :disabled="!revealed && selected == null"
      @click="revealed ? $emit('continue') : $emit('check')"
    >
      {{ revealed ? continueLabel : checkLabel }}
      <LucideIcon v-if="revealed" name="arrow-right" :size="16" />
    </button>
    <button
      v-if="showPrevious"
      type="button"
      class="academy-previous"
      @click="$emit('previous')"
    >
      <LucideIcon name="arrow-left" :size="16" />
      {{ previousLabel }}
    </button>
  </section>
</template>

<script setup>
import LucideIcon from '@/components/ui/LucideIcon.vue'

const props = defineProps({
  heading: { type: String, default: '' },
  qLabel: { type: String, default: '' },
  lead: { type: String, default: '' },
  prompt: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  selected: { default: null },
  correctIndex: { type: Number, default: -1 },
  continueLabel: { type: String, default: '' },
  checkLabel: { type: String, default: '' },
  revealed: { type: Boolean, default: false },
  showResult: { type: Boolean, default: true },
  showHeading: { type: Boolean, default: true },
  showPrevious: { type: Boolean, default: false },
  previousLabel: { type: String, default: '' },
})

const emit = defineEmits(['select', 'check', 'continue', 'previous'])

function choose(index) {
  if (props.revealed) return
  emit('select', index)
}

function optionClass(index) {
  if (!props.revealed || !props.showResult) return props.selected === index ? 'picked' : ''
  if (index === props.correctIndex) return 'correct'
  if (props.selected === index) return 'incorrect'
  return ''
}
</script>

<style src="./academy.css"></style>
