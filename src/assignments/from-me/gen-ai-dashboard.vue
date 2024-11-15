<template>
  <vueEmbedComponent
    :namespace="props.assignment"
    :id="` https://pila.oecd.jordanfung.com/genai/dashboard?domain=${domain}&${params}`"
    :environmentProxy="proxyEnvironmentCall"
  />
</template>

<script setup>
  import { useStore } from 'vuex'
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'

  const props = defineProps({
    assignment: String
  })

  const store = useStore()

  const { domain } = await Agent.environment()

  const assignmentUsers = store.getters['assignments/assignedStudents'](props.assignment, 'teacher-to-student')

  const params = new URLSearchParams(
    assignmentUsers.map(id => ['user', id])
  )

  async function proxyEnvironmentCall(user) {
    if (user) {
      const info = await store.getters.decryptUserInfo(user)
      return { auth: { user, info } }
    }
    else return Agent.environment()
  }
</script>