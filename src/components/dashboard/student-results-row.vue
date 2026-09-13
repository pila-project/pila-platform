<template>
  <tr>
    <td class="student-name-cell">
      <span class="student-name-line">
        <span
          class="status-pip"
          :class="{ 'status-pip--active': userIsActive }"
        />
        <DecryptedName :user="user" />
      </span>
    </td>
    <td>
      <StudentSummary
        :totalTime="performance.totalTime"
        :numItems="numItems"
        :numCorrect="numCorrect"
      />
    </td>
    <td
      v-for="(id, i) in props.sequenceItems"
      :key="`cell-${id}-${i}`"
      :class="{
        'item-cell' : true,
        'active' : userIsActive && performance.activeItemIndex === i
      }"
    >
      <ItemInfo
        :info="{
          isCorrect: activeItemInfoArray?.[i]?.correct,
          timeOnTask: activeItemInfoArray?.[i]?.time || 0
        }"
      />
    </td>
  </tr>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import ItemInfo from './item-info.vue'
  import StudentSummary from './student-summary.vue'
  import DecryptedName from '@/components/common/decrypted-name.vue'

  const props = defineProps({
    user: String,
    sequenceItems: Array,
    assignment: String,
    sequenceId: String
  })

  const userIsActive = ref(null)

  const performance = ref(null)

  const startCountdown = () => setTimeout(() => userIsActive.value = false, 3000)
  let countdown = startCountdown()

  const { auth } = await Agent.environment()

  let initialLoad = true
  await new Promise(r => {
    Agent
      .watch(
        `${props.assignment}/sequence-${props.sequenceId}`,
        ({ state }) => {
          performance.value = state
          clearTimeout(countdown)
          countdown = startCountdown()
          if (initialLoad) {
            r()
            initialLoad = false
          } else {
            userIsActive.value = true
          }
        },
        props.user === auth.user ? undefined : props.user
      )
  })

// gross. build only for "active items" [ { time, correct}, ... ]
  const activeItemInfoArray = computed(() => {
    const userItemInfo = performance?.value?.itemInfo
    if (userItemInfo) {
      return props.sequenceItems.map((_,i) => userItemInfo[key(i)])
    } else {
      return props.sequenceItems.map(() => ({ correct: null, time: 0 }))
    }
  })

  const numItems = computed(() => activeItemInfoArray.value.length)
  const numCorrect = computed(() => activeItemInfoArray.value.filter(obj => obj?.correct).length)

  function key(i) {
    return `${i}/${props.sequenceItems[i]}`
  }
</script>

<style scoped>
.student-name-cell {
  white-space: nowrap;
}
.student-name-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.status-pip {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
  flex-shrink: 0;
}
.status-pip--active {
  background: limegreen;
}
td.active {
  background: rgba(255, 255, 0, 0.3);;
}
</style>
