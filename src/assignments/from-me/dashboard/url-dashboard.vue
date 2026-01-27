<template>
  <vueEmbedComponent
    :id="`${props.url}?game=${props.module}&${params}`"
    :namespace="props.assignment"
    :environmentProxy="proxyEnvironmentCall"
  />
</template>

<script setup>
  import { useStore } from 'vuex'
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'

  const props = defineProps({ assignment: String, module: String, users: Array, url: String })

  const store = useStore()
  const users = store.getters['assignments/assignedStudents'](props.assignment, 'teacher-to-student')
  const params = new URLSearchParams(users.map(id => ['user', id]))

  async function proxyEnvironmentCall(user) {
    if (user) {
      const info = await store.getters.decryptUserInfo(user)
      return { auth: { user, info } }
    }
    else {
      const env = await Agent.environment()
      return {
        ...env,
        variables: {
          ...env.variables,
          users: props.users,
          assignment: props.assignment
        }
      }
    }
  }
</script>