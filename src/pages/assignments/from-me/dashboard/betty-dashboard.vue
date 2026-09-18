<template>
  <vueEmbedComponent
    :id="`https://bettysbrain-dashboard.knowlearning.systems/bb-dash/${props.module}/OverviewView?oecd=true&${params}`"
    :namespace="props.assignment"
    :environmentProxy="proxyEnvironmentCall"
  />
</template>

<script setup>
  import { computed } from 'vue'
  import { useStore } from 'vuex'
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import { usersForDashboardEmbed } from '@/utils/assignment-dashboards.js'

  const props = defineProps({ assignment: String, module: String, users: Array })

  const store = useStore()
  const users = computed(() =>
    usersForDashboardEmbed(props.users, store, props.assignment),
  )
  const params = computed(() =>
    new URLSearchParams(users.value.map(id => ['user', id])).toString(),
  )

  async function proxyEnvironmentCall(user) {
    if (user) {
      const info = await store.getters.decryptUserInfo(user)
      return { auth: { user, info } }
    }
    else return Agent.environment()
  }
</script>
