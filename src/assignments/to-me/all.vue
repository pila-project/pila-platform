<template>
  <div class="assigned-to-me">
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
    />

    <v-alert
      v-else-if="loadError"
      class="load-error"
      type="error"
      variant="tonal"
    >
      <div class="error-content">
        <span>{{ t('unable-to-load-your-tasks') }}</span>
        <v-btn
          size="small"
          variant="text"
          @click="loadAssignments()"
        >
          Try again
        </v-btn>
      </div>
    </v-alert>

    <div v-else-if="noAssignments" class="empty-state">
      {{ t('it-looks-like-you-do-not-have-any-assignments') }}
    </div>

    <v-row v-else class="assignment-grid">
      <v-col
        v-for="assignment in sortedAssignments"
        :key="assignment.id"
        cols="12"
        lg="3"
        md="4"
        sm="6"
      >
        <NewBadge :show="isNewAssignment(assignment)">
          <TeacherTaskCard
            :assignment="assignment"
            @play="play(assignment.content_id)"
          />
        </NewBadge>
      </v-col>
    </v-row>
  </div>

  <v-overlay
    v-if="activeTask"
    :model-value="true"
    persistent
  >
    <div v-if="taskEnvironmentProxy" class="assignment-overlay">
      <vueEmbedComponent
        :id="activeTask.content_id"
        :namespace="activeTaskNamespace"
        :environment-proxy="taskEnvironmentProxy"
        @close="$router.push('/teacher/tasks')"
        allow="camera;microphone;fullscreen"
      />
    </div>

    <v-card
      v-else
      class="task-launch-status"
      width="min(420px, calc(100vw - 32px))"
    >
      <v-card-text class="task-launch-status-content">
        <v-progress-circular
          v-if="loadingTaskEnvironment"
          indeterminate
          color="primary"
        />
        <v-alert v-else type="error" variant="tonal">
          {{ taskEnvironmentError || 'Unable to prepare this task.' }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-btn variant="text" @click="router.push('/teacher/tasks')">
          Close
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="taskEnvironmentError"
          color="primary"
          variant="tonal"
          @click="loadTaskEnvironmentProxy"
        >
          Try again
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-overlay>
</template>

<script setup>
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useStore } from 'vuex'
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import { adminTeacherTaskNamespace } from '../../admin-teacher-grants.js'
  import studyEnvironmentVariableProxy from '../../study-environment-variable-proxy.js'
  import NewBadge from '../../components/new-badge.vue'
  import TeacherTaskCard from './teacher-task-card.vue'

  const NEW_ASSIGNMENT_DAYS = 5

  const props = defineProps({
    id: String
  })

  const router = useRouter()
  const store = useStore()
  const assignments = ref([])
  const loading = ref(true)
  const loadError = ref(null)
  const hasLoaded = ref(false)
  const taskEnvironmentProxy = ref(null)
  const loadingTaskEnvironment = ref(false)
  const taskEnvironmentError = ref('')
  let assignmentLoadPromise = null
  let refreshTimer = null

  const noAssignments = computed(() => assignments.value.length === 0)
  const sortedAssignments = computed(() => (
    [...assignments.value].sort((left, right) => {
      return timestamp(right.updated) - timestamp(left.updated)
    })
  ))
  const activeTask = computed(() => {
    if (!props.id) return null
    return assignments.value.find(assignment => assignment.content_id === props.id) || null
  })
  const activeTaskNamespace = computed(() => {
    if (!activeTask.value) return null
    return adminTeacherTaskNamespace(
      activeTask.value.teacher_id,
      activeTask.value.content_id
    )
  })

  watch(
    [() => props.id, hasLoaded, activeTask],
    ([routeTaskId, loaded, task]) => {
      if (routeTaskId && loaded && !task) router.replace('/teacher/tasks')
    }
  )

  onMounted(() => {
    void loadAssignments()
    void loadTaskEnvironmentProxy()
    refreshTimer = window.setInterval(() => void loadAssignments(true), 10_000)
  })

  onBeforeUnmount(() => {
    if (refreshTimer) window.clearInterval(refreshTimer)
  })

  function t(slug) {
    return store.getters.t(slug)
  }

  function timestamp(value) {
    const parsed = new Date(value).getTime()
    return Number.isNaN(parsed) ? 0 : parsed
  }

  function isNewAssignment(assignment) {
    const createdAt = timestamp(assignment.updated)
    const cutoff = Date.now() - (NEW_ASSIGNMENT_DAYS * 24 * 60 * 60 * 1000)
    return createdAt >= cutoff
  }

  function loadAssignments(background = false) {
    if (assignmentLoadPromise) return assignmentLoadPromise

    assignmentLoadPromise = fetchAssignments(background)
      .finally(() => assignmentLoadPromise = null)
    return assignmentLoadPromise
  }

  async function fetchAssignments(background) {
    const showLoading = !background || !hasLoaded.value
    if (showLoading) loading.value = true
    if (!background) loadError.value = null

    try {
      const result = await Agent.query('admin-assigned-to-me')
      assignments.value = Array.isArray(result)
        ? result.filter(assignment => (
          assignment
          && typeof assignment.content_id === 'string'
          && assignment.content_id.length > 0
        ))
        : []
      hasLoaded.value = true
      loadError.value = null
    } catch (error) {
      console.warn('Unable to load admin-assigned teacher tasks.', error)
      if (showLoading) loadError.value = error
    } finally {
      if (showLoading) loading.value = false
    }
  }

  async function loadTaskEnvironmentProxy() {
    if (loadingTaskEnvironment.value) return

    loadingTaskEnvironment.value = true
    taskEnvironmentError.value = ''
    try {
      taskEnvironmentProxy.value = await studyEnvironmentVariableProxy()
    } catch (error) {
      console.warn('Unable to load task environment variables.', error)
      taskEnvironmentError.value = 'Unable to prepare this task. Check your connection and try again.'
    } finally {
      loadingTaskEnvironment.value = false
    }
  }

  function play(contentId) {
    router.push(`/teacher/tasks/${encodeURIComponent(contentId)}`)
  }
</script>

<style scoped>
.assigned-to-me {
  width: 100%;
  padding: 16px;
}

.assignment-grid {
  width: 100%;
}

.empty-state {
  width: 100%;
}

.load-error {
  width: 100%;
}

.error-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.assignment-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: calc(var(--vh, 1vh) * 100);
  overflow: hidden;
  background: white;
  line-height: 0;
}

.assignment-overlay :deep(iframe) {
  display: block;
}

.task-launch-status {
  line-height: normal;
}

.task-launch-status-content {
  display: flex;
  justify-content: center;
  min-height: 96px;
}
</style>