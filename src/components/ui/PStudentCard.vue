<template>
  <div :class="cardClasses" @click="$emit('click')">
    <PAvatar :name="name" :image="avatar" :size="40" />
    <div class="student-card-info">
      <span class="student-card-name">{{ name }}</span>
      <span v-if="email" class="student-card-email">{{ email }}</span>
    </div>
    <PCheckbox
      v-if="variant === 'selection'"
      :modelValue="selected"
      @update:modelValue="$emit('select', $event)"
      @click.stop
    />
    <PBadge v-if="variant === 'linked'" variant="success" text="Linked" />
    <slot name="actions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PAvatar from './PAvatar.vue'
import PCheckbox from './PCheckbox.vue'
import PBadge from './PBadge.vue'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  avatar: String,
  email: String,
  variant: {
    type: String,
    default: 'default',
    validator: v => ['default', 'selection', 'linked'].includes(v),
  },
  selected: Boolean,
  groups: Array,
})

defineEmits(['click', 'select'])

const cardClasses = computed(() => [
  'student-card',
  props.selected ? 'student-card-selected' : '',
  props.variant === 'linked' ? 'student-card-linked' : '',
])
</script>
