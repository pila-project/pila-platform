<template>
  <vueEmbedComponent
    :namespace="props.assignment"
    :id="`https://competency-dashboard.pilaproject.org/?domain=${domain}&${params}`"
  />
</template>

<script setup>
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import { CANDLI_SEQUENCES } from '../../constants.js'

  const props = defineProps({
    assignment: String
  })

  const { domain } = await Agent.environment()

  const candliSequence = (await Agent.state(props.assignment)).content
  const candliGames = CANDLI_SEQUENCES[candliSequence] || []
  const assignmentUsers = store.getters['assignments/assignedStudents'](props.assignment, 'teacher-to-student')

  const params = new URLSearchParams([
    ...candliGames.map(id => ['game', id]),
    ...assignmentUsers.map(id => ['user', id])
  ])
</script>