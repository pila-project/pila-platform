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
    const mins = Math.floor(props.performance.totalTime/60)
    const secs = props.performance.totalTime % 60
    return `${o(mins)}:${o(secs)}`
  })

  const correctnessString = computed(() => {
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

<style scoped>
  .student-summary {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0 5px;
  }
  .student-summary span {
    font-size: 12px;
  }
  .student-summary > * {
    padding: 1px;
  }
</style>