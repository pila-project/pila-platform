<template>
  <vueEmbedComponent
    :namespace="{
      prefix: props.assignment,
      allow: [
        'pila/competencies'
      ]
    }"
    :id="`https://competency-dashboard.pilaproject.org/?domain=${domain}&${params}`"
    :environmentProxy="proxyEnvironmentCall"
  />
</template>

<script setup>
  import { useStore } from 'vuex'
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import { CANDLI_SEQUENCES } from '../../constants.js'

  const props = defineProps({
    assignment: String
  })

  const store = useStore()

  const { domain } = await Agent.environment()

  const candliSequence = (await Agent.state(props.assignment)).content
  const candliGames = CANDLI_SEQUENCES[candliSequence] || []
  const assignmentUsers = store.getters['assignments/assignedStudents'](props.assignment, 'teacher-to-student')

  const params = new URLSearchParams([
    ...candliGames.map(id => ['game', id]),
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