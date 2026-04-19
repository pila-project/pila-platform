<template>
  <span v-if="displayString" :style="nameStyle">{{ displayString }}</span>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import getName from '@/utils/name-and-translation-for-content.js'

  const props = defineProps({ itemId: String })
  const store = useStore()

  const displayString = ref('')

  onMounted(async () => {
    try {
      displayString.value = await getName(props.itemId, store.getters.language())
    } catch (e) {
      displayString.value = props.itemId?.slice(0, 8) || ''
    }
  })

  const nameStyle = computed(() => ({
    fontSize: displayString.value.length > 28 ? '0.9rem' : 'inherit'
  }))
</script>
