<template>
  <vueEmbedComponent
    :namespace="props.assignment"
    :id="`https://competency-dashboard.pilaproject.org/?domain=${domain}&${params}`"
    :environmentProxy="proxyEnvironmentCall"
  />
</template>

<script setup>
  import { useStore } from 'vuex'
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import { CANDLI_SEQUENCES } from '../../constants.js'

  const props = defineProps({
    assignment: String,
    games: Array
  })

  const store = useStore()

  const { domain } = await Agent.environment()

  const candliSequence = (await Agent.state(props.assignment)).content
  const assignmentUsers = store.getters['assignments/assignedStudents'](props.assignment, 'teacher-to-student')

  const params = new URLSearchParams([
    ...props.games.map(id => ['game', id]),
    ...assignmentUsers.map(id => ['user', id])
  ])

  async function proxyEnvironmentCall(user) {
    if (user) {
      const info = await store.getters.decryptUserInfo(user)
      return { auth: { user, info } }
    }
    else return Agent.environment()
  }
</script>