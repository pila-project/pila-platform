<template>
  <div class="dashboard-wrapper">
    <vueEmbedComponent
      v-if="!liveMode && customDashboardUrl"
      :id="customDashboardUrl"
      :namespace="props.assignment"
      :environmentProxy="proxyEnvironmentCall"
    />
    <UrlDashboard
      v-else-if="!liveMode && props.url"
      :url="props.url"
      :users="users"
      :assignment="props.assignment"
      :module="content"
    />
    <RCTDashboard
      v-else-if="!liveMode && rctAssignment"
      :users="users"
      :assignment="props.assignment"
      :module="content"
    />
    <BettyDashboard
      v-else-if="!liveMode && bettyModuleId"
      :users="users"
      :assignment="props.assignment"
      :module="bettyModuleId"
    />
    <Dashboard
      v-else
      :users="users"
      :assignment="props.assignment"
    />
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useStore } from 'vuex'
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import Dashboard from '@/components/dashboard/dashboard.vue'
  import BettyDashboard from './betty-dashboard.vue'
  import RCTDashboard from './rct-dashboard.vue'
  import UrlDashboard from './url-dashboard.vue'
  import { normalizeAssignmentContent } from '@/utils/assignment-content.js'
  import { primaryAssignmentContentId } from '@/utils/dashboard-sequence-items.js'
  import { normalizeSequenceItems } from '@/utils/sequence-items.js'
  import {
    candliProgrammingDashboardUrl,
    isCandliProgrammingContent,
    isLiveDashboardMode,
    resolveBettyDashboard,
    usersForDashboardEmbed,
  } from '@/utils/assignment-dashboards.js'

  const props = defineProps({ assignment: String, url: String, users: Array, mode: String })

  const store = useStore()
  const users = computed(() =>
    usersForDashboardEmbed(props.users, store, props.assignment),
  )
  const liveMode = isLiveDashboardMode(props.mode)

  const assignmentState = await Agent.state(props.assignment)
  const content = primaryAssignmentContentId(assignmentState)
  let contentState = null
  const customDashboardUrl = ref(null)
  let bettyModuleId = null
  let rctAssignment = false

  if (!liveMode) {
    if (content) {
      try {
        contentState = await Agent.state(content)
      } catch {
        contentState = null
      }
    }

    const isRCTAssignment = async () => {
      if (!content) return false
      try {
        const { domain } = await Agent.metadata(content)
        return domain === 'rct-problem-creator.pilaproject.org'
      } catch {
        return false
      }
    }

    const betty = await resolveBettyDashboard({
      contentId: content,
      contentState,
      sequenceItemIds: normalizeSequenceItems(contentState?.items),
    })
    bettyModuleId = betty.bettyModuleId
    rctAssignment = await isRCTAssignment()

    // Trunk allowlist, extended to every assignment content id and to
    // sub-items of the two expert sequences. A Datawise / reference URL
    // still wins, matching the app card's existing UrlDashboard.
    const contentIds = normalizeAssignmentContent(assignmentState?.content)
    let programmingContent = false
    for (const id of contentIds) {
      if (await isCandliProgrammingContent(id)) {
        programmingContent = true
        break
      }
    }

    if (programmingContent && !props.url) {
      const dashboardConfigId = Agent.uuid()
      const dashboardConfig = await Agent.state(dashboardConfigId)
      dashboardConfig.placeholder = {
        states: Object.fromEntries(users.value.map(id => [id, 'placeholder']))
      }
      console.log('dashboard cofing!', dashboardConfig)
      await Agent.response()
      customDashboardUrl.value = candliProgrammingDashboardUrl(dashboardConfigId)
    }
  }

  async function proxyEnvironmentCall(user) {
    if (user) {
      const info = await store.getters.decryptUserInfo(user)
      return { auth: { user, info } }
    }
    else return Agent.environment()
  }
</script>

<style scoped>

  .dashboard-wrapper
  {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    /* OWN HTML table (.new-dashboard) scrolls internally; iframe embeds stay clipped */
    overflow: hidden;
  }

</style>
