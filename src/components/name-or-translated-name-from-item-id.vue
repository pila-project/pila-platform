<template>
  <span :style="nameStyle">{{ displayString }}</span>
</template>

<script setup>
  import { computed, ref, watch } from 'vue'
  import { useStore } from 'vuex'
  import getName from '../name-and-translation-for-content.js'

  const props = defineProps({ itemId: String })
  const store = useStore()
  const displayString = ref('')
  const selectedLanguage = computed(() => store.getters.language())
  let loadRun = 0

  watch(
    () => [props.itemId, selectedLanguage.value],
    async ([itemId, language]) => {
      const runId = ++loadRun
      const name = itemId ? await getName(itemId, language) : ''

      if (runId === loadRun) displayString.value = name || ''
    },
    { immediate: true }
  )

  const nameStyle = computed(() => ({
    fontSize: displayString.value.length > 28 ? '0.9rem' : 'inherit'
  }))
</script>
