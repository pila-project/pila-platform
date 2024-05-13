<template>
  <span>{{ displayString }}</span>
</template>

<script setup>
  import { useStore } from 'vuex'
  import getName from '../name-and-translation-for-content.js'

  const props = defineProps({ itemId: String })
  const store = useStore()

  const displayString = await getName(props.itemId, store.getters.language())
</script>
