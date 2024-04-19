<template>
  <tr>
    <td style="white-space: nowrap;">
      <DecryptedName :user="user" />
    </td>
    <td>
      <StudentSummary :performance="performance" />
    </td>
    <td
      v-for="(id, index) in props.items"
      :key="`cell-${id}-${index}`"
      class="item-cell"
    >
      <ItemInfo
        :info="{
          isCorrect: performance?.isCorrectArray?.[index],
          timeOnTask: performance?.timeOnTasks?.[index]
        }"
      />
    </td>
  </tr>
</template>

<script setup>
  import { ref } from 'vue'
  import ItemInfo from './ItemInfo.vue'
  import StudentSummary from './StudentSummary.vue'
  import DecryptedName from '../decrypted-name.vue'

  const props = defineProps({
    user: String,
    items: Array,
    assignment: String,
    sequence: String
  })

  const performanceId = `${props.assignment}/sequence-${props.sequence}`

  const performance = ref(null)

  await new Promise(r => {
    Agent.watch(performanceId, ({ state }) => {
      performance.value = state
      r()
    })
  })

  function inventItemInfo() {
    let isCorrect
    let rando = Math.random()
    if (rando < 0.7) isCorrect = true
    else if (rando < 0.85) isCorrect = false
    else isCorrect = undefined

    return {
      isCorrect,
      timeOnTask: Math.floor(Math.random() * 200)
    }
  }
</script>