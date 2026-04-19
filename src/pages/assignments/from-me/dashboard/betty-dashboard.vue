<template>
  <vueEmbedComponent
    :id="`https://bettysbrain-dashboard.knowlearning.systems/bb-dash/${props.module}/OverviewView?oecd=true&${params}`"
    :namespace="props.assignment"
    :environmentProxy="proxyEnvironmentCall"
  />
</template>

<script setup>
  import { useStore } from 'vuex'
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'

  const props = defineProps({ assignment: String, module: String, users: Array })

  const store = useStore()
  const users = store.getters['assignments/assignedStudents'](props.assignment, 'teacher-to-student')
  const params = new URLSearchParams(users.map(id => ['user', id]))

  async function proxyEnvironmentCall(user) {
    if (user) {
      const info = await store.getters.decryptUserInfo(user)
      return { auth: { user, info } }
    }
    else return Agent.environment()
  }
</script>