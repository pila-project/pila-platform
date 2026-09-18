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
  import { ref, computed, reactive } from 'vue'
  import ItemInfo from './item-info.vue'
  import StudentSummary from './student-summary.vue'
  import DecryptedName from '@/components/common/decrypted-name.vue'

  const props = defineProps({
    user: String,
    sequenceItems: Array,
    assignment: String,
    sequenceId: String,
    sequenceGroups: Array,
  })

  const userIsActive = ref(null)
  const performanceBySeq = reactive({})

  const groups = (
    Array.isArray(props.sequenceGroups) && props.sequenceGroups.length
      ? props.sequenceGroups
      : (props.sequenceId
        ? [{ sequenceId: props.sequenceId, itemIds: props.sequenceItems || [] }]
        : [])
  )
  const uniqueSeqIds = [...new Set(groups.map(g => g.sequenceId).filter(Boolean))]

  const startCountdown = () => setTimeout(() => userIsActive.value = false, 3000)
  let countdown = startCountdown()

  const { auth } = await Agent.environment()

  if (uniqueSeqIds.length) {
    await Promise.all(uniqueSeqIds.map(seqId => new Promise(r => {
      let initialLoad = true
      const resolveInitial = () => {
        if (!initialLoad) return
        initialLoad = false
        r()
      }
      Agent.watch(
        `${props.assignment}/sequence-${seqId}`,
        ({ state }) => {
          performanceBySeq[seqId] = state
          clearTimeout(countdown)
          countdown = startCountdown()
          if (initialLoad) {
            resolveInitial()
          } else {
            userIsActive.value = true
          }
        },
        props.user === auth.user ? undefined : props.user
      )
      // Mixed assignments may include a content id with no sequence performance.
      setTimeout(resolveInitial, 3000)
    })))
  }

  const performance = computed(() => {
    let totalTime = 0
    let activeItemIndex = null
    for (const group of groups) {
      const state = performanceBySeq[group.sequenceId]
      if (!state) continue
      totalTime += Number(state.totalTime) || 0
      if (state.activeItemIndex != null && state.activeItemIndex !== '') {
        const localId = group.itemIds?.[state.activeItemIndex]
        const unionIndex = (props.sequenceItems || []).indexOf(localId)
        if (unionIndex !== -1) activeItemIndex = unionIndex
      }
    }
    return { totalTime, activeItemIndex }
  })

  // Look up itemInfo by item id + that content's local index, not unioned column index.
  const activeItemInfoArray = computed(() => {
    return (props.sequenceItems || []).map((itemId) => {
      for (const group of groups) {
        const localIndex = group.itemIds?.indexOf(itemId)
        if (localIndex == null || localIndex === -1) continue
        const info = performanceBySeq[group.sequenceId]?.itemInfo?.[`${localIndex}/${itemId}`]
        if (info) return info
      }
      return { correct: null, time: 0 }
    })
  })

  const numItems = computed(() => activeItemInfoArray.value.length)
  const numCorrect = computed(() => activeItemInfoArray.value.filter(obj => obj?.correct).length)
</script>

<style scoped>
.student-name-cell {
  white-space: nowrap;
  vertical-align: middle;
}
.student-name-line {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.student-name-cell .student-name-line :deep(.decrypted-name),
.student-name-cell .student-name-line :deep(.p-truncated-text) {
  display: inline;
  max-width: none;
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
