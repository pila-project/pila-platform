<template>
  <div class="student-summary">
    <span>{{ `${props.numCorrect} / ${props.numItems}` }}</span>
    <span>{{ timeString }}</span>
  </div>
</template>

<script setup>
  import { computed } from 'vue'

  const o = x => ( x<10 ? '0'+x : ''+x )

  const props = defineProps({
    totalTime: Number,
    numItems: Number,
    numCorrect: Number
  })

  const timeString = computed(() => {
    if (!props.totalTime) return '00:00'
    const mins = Math.floor(props.totalTime/60)
    const secs = props.totalTime % 60
    return `${o(mins)}:${o(secs)}`
  })

</script>