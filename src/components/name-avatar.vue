<template>
  <v-avatar :color="color" class="text-white">
    <span class="initial">{{ initial }}</span>
  </v-avatar>
</template>

<script setup>
  import { computed } from 'vue'

  const props = defineProps({ name: String })
  const name = computed(() => props.name?.trim() || '')
  const initial = computed(() => Array.from(name.value)[0]?.toUpperCase() || '?')
  const color = computed(() => {
    let hash = 0
    for (const character of name.value) {
      hash = (Math.imul(31, hash) + character.codePointAt(0)) >>> 0
    }
    return `hsl(${hash % 360}, 55%, 30%)`
  })
</script>

<style scoped>
  .initial {
    text-box: trim-both cap alphabetic;
  }
</style>
