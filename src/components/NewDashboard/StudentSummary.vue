<template>
  <div class="student-summary">
    <span>{{ correctnessString }}</span>
    <span>{{ timeString }}</span>
  </div>
</template>

<script setup>
  import { computed } from 'vue'

  const o = x => ( x<10 ? '0'+x : ''+x )

  const props = defineProps({
    performance: Object
  })

  const timeString = computed(() => {
    if (!props.performance.totalTime) return '00:00'

    const mins = Math.floor(props.performance.totalTime/60)
    const secs = props.performance.totalTime % 60
    return `${o(mins)}:${o(secs)}`
  })

  const correctnessString = computed(() => {
    if (!props.performance.isCorrectArray) return '0 / 0'

    const numItems = props.performance.isCorrectArray.length
    const numCorrect = (
      props
        .performance
        .isCorrectArray
        .reduce((acc, correct) => correct ? acc + 1 : acc, 0)
    )
    return `${numCorrect} / ${numItems}`
  })

</script>