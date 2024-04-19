<template>
  <tr>
    <td style="white-space: nowrap;">
      <i
        :class="{
          'fas': true,
          'fa-circle': true,
          'mr-2': true,
          'active': userIsActive
        }"
      />
      <DecryptedName :user="user" />
    </td>
    <td>
      <StudentSummary :performance="performance" />
    </td>
    <td
      v-for="(id, i) in props.items"
      :key="`cell-${id}-${i}`"
      :class="{
        'item-cell' : true,
        'active' : userIsActive && performance.activeItemIndex === i
      }"
    >
      <ItemInfo
        :info="{
          isCorrect: performance?.isCorrectArray?.[i],
          timeOnTask: performance?.timeOnTasks?.[i]
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

  const userIsActive = ref(null)

  const performance = ref(null)

  const startCountdown = () => setTimeout(() => userIsActive.value = false, 3000)
  let countdown = startCountdown()

  let initialLoad = true
  await new Promise(r => {
    Agent
      .watch(
        `${props.assignment}/sequence-${props.sequence}`,
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
        props.user
      )
  })

</script>

<style scoped>
i { color: #ccc; }
i.active { color: limegreen; }
td.active {
  background: rgba(255, 255, 0, 0.3);;
}
</style>
