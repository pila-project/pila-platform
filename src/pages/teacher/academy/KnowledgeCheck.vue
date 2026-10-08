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
        :aria-pressed="isPicked(index) ? 'true' : 'false'"
        @click="choose(index)"
      >
        <span class="academy-radio" aria-hidden="true" />
        <span>{{ option }}</span>
      </button>
    </div>
    <p v-if="feedback" class="academy-widget-label">{{ feedback }}</p>
    <button
      v-if="!revealed || continueLabel"
      type="button"
      class="academy-continue"
      :disabled="!revealed && !hasSelection"
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
import { computed } from 'vue'
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
  feedback: { type: String, default: '' },
  allowChange: { type: Boolean, default: false },
  multiple: { type: Boolean, default: false },
  graded: { default: null },
  correctIndexes: { type: Array, default: () => [] },
})

const emit = defineEmits(['select', 'check', 'continue', 'previous'])

const hasSelection = computed(() => (
  props.multiple ? (Array.isArray(props.selected) && props.selected.length > 0) : props.selected != null
))

function isPicked(index) {
  if (props.multiple) return Array.isArray(props.selected) && props.selected.includes(index)
  return props.selected === index
}

function choose(index) {
  if (props.revealed && !props.allowChange) return
  if (!props.multiple) {
    emit('select', index)
    return
  }
  const current = Array.isArray(props.selected) ? props.selected : []
  const next = current.includes(index) ? current.filter((item) => item !== index) : current.concat(index)
  emit('select', next)
}

function optionClass(index) {
  const show = props.graded == null ? props.revealed : props.graded
  if (!show || !props.showResult) return isPicked(index) ? 'picked' : ''
  const marked = props.multiple
    ? props.correctIndexes.includes(index)
    : index === props.correctIndex
  if (marked) return 'correct'
  if (isPicked(index)) return 'incorrect'
  return ''
}
</script>

<style src="./academy.css"></style>
