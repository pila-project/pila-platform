<template>
  <hr
    :class="[
      vertical ? 'border-l border-t-0 h-full' : 'border-t border-l-0 w-full',
      'border-slate-200 my-2'
    ]"
  />
</template>

<script setup>
defineProps({
  vertical: Boolean,
})
</script>
