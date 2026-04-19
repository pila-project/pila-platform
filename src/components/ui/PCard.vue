<template>
  <div
    class="card"
    :class="[
      elevated ? 'shadow-md' : '',
      clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : '',
    ]"
    :draggable="draggable"
    @click="$emit('click', $event)"
    @dragstart="$emit('dragstart', $event)"
  >
    <div v-if="$slots.header || title" class="card-header">
      <slot name="header">
        <h3 class="text-sm font-semibold text-zinc-950">{{ title }}</h3>
        <p v-if="subtitle" class="text-xs text-slate-500 mt-0.5">{{ subtitle }}</p>
      </slot>
    </div>
    <div class="card-body" :class="{ 'p-0': noPadding }">
      <slot name="text">
        <slot />
      </slot>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2 px-6 py-3 border-t border-slate-200">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  subtitle: String,
  elevated: Boolean,
  clickable: Boolean,
  draggable: Boolean,
  noPadding: Boolean,
})

defineEmits(['click', 'dragstart'])
</script>
