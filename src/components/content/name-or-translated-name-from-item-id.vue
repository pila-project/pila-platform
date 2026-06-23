<template>
  <span v-if="displayString" :style="nameStyle">{{ displayString }}</span>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { useStore } from 'vuex'
  import { getContentName } from '@/utils/content-cache.js'

  const props = defineProps({ itemId: String })
  const store = useStore()

  const displayString = ref('')
  const selectedLanguage = computed(() => store.getters.language())
  let loadRun = 0

  watch(
    () => [props.itemId, selectedLanguage.value],
    async ([itemId, language]) => {
      const runId = ++loadRun
      try {
        const name = itemId ? await getContentName(itemId, language) : ''
        if (runId === loadRun) displayString.value = name || ''
      } catch {
        if (runId === loadRun) displayString.value = itemId?.slice(0, 8) || ''
      }
    },
    { immediate: true }
  )

  const nameStyle = computed(() => ({
    fontSize: displayString.value.length > 28 ? '0.9rem' : 'inherit'
  }))
</script>