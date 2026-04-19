<template>
  <div
    :class="[
      'inline-flex items-center justify-center overflow-hidden bg-slate-200 text-slate-600 font-medium flex-shrink-0',
      rounded === '0' ? 'rounded-none' : 'rounded-full'
    ]"
    :style="{ width: sizeValue, height: sizeValue, fontSize: fontSizeValue }"
    @click="$emit('click', $event)"
  >
    <img
      v-if="image"
      :src="image"
      :alt="alt"
      class="w-full h-full object-cover"
      @error="onImageError"
    />
    <span v-else>{{ initials }}</span>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  image: String,
  alt: {
    type: String,
    default: ''
  },
  name: String,
  size: {
    type: [String, Number],
    default: 40
  },
  rounded: {
    type: String,
    default: 'full'
  },
})

defineEmits(['click'])

const imgFailed = ref(false)

const sizeValue = computed(() => {
  const s = Number(props.size)
  return isNaN(s) ? props.size : `${s}px`
})

const fontSizeValue = computed(() => {
  const s = Number(props.size)
  return isNaN(s) ? '0.875rem' : `${Math.max(12, s * 0.4)}px`
})

const initials = computed(() => {
  if (!props.name) return '?'
  return props.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

function onImageError() {
  imgFailed.value = true
}
</script>
