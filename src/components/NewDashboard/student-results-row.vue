<template>
  <tr>
    <td style="white-space: nowrap;">
      <DecryptedName :user="user" />
    </td>
    <td>
      <StudentSummary :info="studentInfo" />
    </td>
    <td
      v-for="(info, i) in studentInfo"
      :key="`cell-${i}`"
      class="item-cell"
    >
      <ItemInfo :info="info" />
    </td>
  </tr>
</template>

<script setup>
  import ItemInfo from './ItemInfo.vue'
  import StudentSummary from './StudentSummary.vue'
  import DecryptedName from '../decrypted-name.vue'

  const props = defineProps({
    user: String,
    items: Array
  })

  const studentInfo = props.items.map(inventItemInfo)

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