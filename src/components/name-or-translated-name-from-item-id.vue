<template>
  <span :style="nameStyle">{{ displayString }}</span>
</template>

<script setup>
  import { computed } from 'vue'
  import { useStore } from 'vuex'
  import getName from '../name-and-translation-for-content.js'

  const props = defineProps({ itemId: String })
  const store = useStore()

  const displayString = await getName(props.itemId, store.getters.language())

  const nameStyle = computed(() => ({
    fontSize: displayString.length > 20 ? '0.9rem' : 'inherit'
  }))
</script>
