<template>
  <vueEmbedComponent
    :id="`https://bettysbrain-dashboard.knowlearning.systems/bb-dash/${props.module}/OverviewView?oecd=true&${params}`"
    :namespace="props.assignment"
  />
</template>

<script setup>
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
  const props = defineProps({ assignment: String, module: String, users: Array })

  const users = store.getters['assignments/assignedStudents'](props.assignment, 'teacher-to-student')
  const params = new URLSearchParams(users.map(id => ['user', id]))
</script>