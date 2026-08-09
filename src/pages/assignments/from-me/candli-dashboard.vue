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

  const props = defineProps({
    assignment: String,
    games: { type: Array, default: () => [] },
  })

  const store = useStore()

  const { domain } = await Agent.environment()

  // games must be resolved by parent (CANDLI_SEQUENCES map and/or candliGamesForSequenceItems)
  const games = Array.isArray(props.games) ? props.games : []
  const assignmentUsers = store.getters['assignments/assignedStudents'](props.assignment, 'teacher-to-student')

  const params = new URLSearchParams([
    ...games.map(id => ['game', id]),
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