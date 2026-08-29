<template>
  <div class="assigned-to-me p-4">
    <div v-if="loading" class="h-1 bg-slate-200 animate-pulse rounded mb-4" />

    <div v-else-if="loadError" class="p-4 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
      <span>{{ t('unable-to-load-your-tasks') }}</span>
      <button type="button" class="ml-2 underline" @click="loadAssignments()">Try again</button>
    </div>

    <div v-else-if="noAssignments" class="empty-state text-sm text-slate-500 py-8 text-center">
      {{ t('it-looks-like-you-do-not-have-any-assignments-pl') }}
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <NewBadge
        v-for="assignment in sortedAssignments"
        :key="assignment.id"
        :show="isNewAssignment(assignment)"
      >
        <TeacherTaskCard
          :assignment="assignment"
          @play="play(assignment.content_id)"
        />
      </NewBadge>
    </div>
  </div>

  <div
    v-if="activeTask"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
  >
    <div v-if="taskEnvironmentProxy" class="assignment-overlay w-full h-full max-w-[100vw] max-h-[100vh]">
      <vueEmbedComponent
        :id="activeTask.content_id"
        :namespace="activeTaskNamespace"
        :environment-proxy="taskEnvironmentProxy"
        @close="$router.push('/teacher/tasks')"
        allow="camera;microphone;fullscreen"
      />
    </div>
    <div v-else class="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
      <div class="flex flex-col items-center gap-3">
        <span
          v-if="loadingTaskEnvironment"
          class="inline-block w-8 h-8 border-2 border-slate-300 border-t-primary-600 rounded-full animate-spin"
        />
        <p v-else class="text-sm text-red-600">
          {{ taskEnvironmentError || 'Unable to prepare this task.' }}
        </p>
      </div>
      <div class="flex justify-between mt-4">
        <button type="button" class="text-sm underline" @click="router.push('/teacher/tasks')">Close</button>
        <button
          v-if="taskEnvironmentError"
          type="button"
          class="text-sm px-3 py-1 rounded border"
          @click="loadTaskEnvironmentProxy"
        >
          Try again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>

  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useStore } from 'vuex'
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import { adminTeacherTaskNamespace } from '@/admin-teacher-grants.js'
  import studyEnvironmentVariableProxy from '@/study-environment-variable-proxy.js'
  import NewBadge from '@/components/new-badge.vue'
  import TeacherTaskCard from './teacher-task-card.vue'

  const NEW_ASSIGNMENT_DAYS = 3

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
.assigned-to-me { width: 100%; }
.assignment-overlay { width: 100%; height: 100%; overflow: hidden; }
.assignment-overlay :deep(iframe) { width: 100%; height: 100%; border: 0; }
</style>
