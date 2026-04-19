<template>
  <span>{{ name }}</span>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({ id: { type: String, required: true } })
const name = ref('...')

onMounted(async () => {
  try {
    const state = await Agent.state(props.id)
    name.value = state.name || 'Untitled'
  } catch {
    name.value = 'Untitled'
  }
})
</script>
