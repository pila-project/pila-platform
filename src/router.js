import { createRouter, createWebHistory } from 'vue-router'
import { defineComponent, h, ref, onMounted, markRaw } from 'vue'

import AdminView from '@/pages/admin/index.vue'
import ResearcherView from '@/pages/researcher/index.vue'
import TeacherView from '@/pages/teacher/index.vue'
import TeacherCodesView from '@/pages/teacher/codes.vue'
import StudentView from '@/pages/student/index.vue'
import JoinTeacherView from '@/pages/student/join-teacher.vue'
import AssignmentView from '@/pages/assignment/index.vue'
import LoginMenu from '@/pages/login/index.vue'
import CandliStates from '@/pages/candli-states.vue'
import { isThailandTeacherHost } from '@/utils/constants.js'

const LOGIN_INTENT_KEY = 'pila-login-intent'
const RETURN_PATH_KEY = 'pila-return-path'

const RESERVED_APP_SEGMENTS = new Set([
  'admin',
  'researcher',
  'teacher',
  'login',
  'candli-states',
  'test',
  'join',
  'assignment',
])

function isEmbedded() {
  return typeof Agent !== 'undefined' && Agent.embedded
}

function setSessionItem(key, value) {
  try { sessionStorage.setItem(key, value) } catch { /* private mode */ }
}

function getSessionItem(key) {
  try { return sessionStorage.getItem(key) } catch { return null }
}

function isSafeInternalPath(path) {
  return typeof path === 'string'
    && path.startsWith('/')
    && !path.startsWith('//')
}

function isIntentionallyPublic(path) {
  if (path === '/login' || path.startsWith('/login/')) return true
  if (path === '/join' || path.startsWith('/join/')) return true
  if (path === '/assignment' || path.startsWith('/assignment/')) return true
  if (path === '/candli-states' || path.startsWith('/candli-states/')) return true

  const segments = path.split('/').filter(Boolean)
  return segments.length === 1 && !RESERVED_APP_SEGMENTS.has(segments[0])
}

function postLoginHome(store) {
  const intent = getSessionItem(LOGIN_INTENT_KEY)
  // Student tab must win over hasTeacher (admins/teachers also have teacher perm).
  if (intent === 'student') return '/'
  const hasTeacher = store.getters['roles/hasPermission'](store.state.user, 'teacher')
  if (intent === 'teacher' || hasTeacher) return '/teacher'
  return '/'
}

function authRedirectFor(to, store) {
  if (isEmbedded()) return null
  if (!store.getters.loaded()) return null

  const path = to.path
  const anonymous = store.getters.isAnonymous()

  if (anonymous) {
    if (path === '/') {
      setSessionItem(LOGIN_INTENT_KEY, 'student')
      return '/login'
    }
    if (path.startsWith('/teacher')) {
      setSessionItem(LOGIN_INTENT_KEY, 'teacher')
      // Preserve deep links (e.g. /teacher/classes); intent kept for aspiring teachers.
      setSessionItem(RETURN_PATH_KEY, to.fullPath)
      return '/login'
    }
    if (isIntentionallyPublic(path)) return null
    setSessionItem(RETURN_PATH_KEY, to.fullPath)
    return '/login'
  }

  if (path === '/login') {
    const returnPath = getSessionItem(RETURN_PATH_KEY)
    const intent = getSessionItem(LOGIN_INTENT_KEY)
    // Student tab overrides a stale /teacher* deep-link return path.
    const skipTeacherReturn = intent === 'student' && returnPath?.startsWith('/teacher')
    if (
      returnPath
      && !skipTeacherReturn
      && isSafeInternalPath(returnPath)
      && !returnPath.startsWith('/login')
    ) {
      try {
        sessionStorage.removeItem(RETURN_PATH_KEY)
        // Keep teacher intent on /teacher* restores so aspiring RoleRequester survives.
        if (!returnPath.startsWith('/teacher')) {
          sessionStorage.removeItem(LOGIN_INTENT_KEY)
        }
      } catch { /* private mode */ }
      return returnPath
    }
    if (skipTeacherReturn) {
      try { sessionStorage.removeItem(RETURN_PATH_KEY) } catch { /* private mode */ }
    }
    return postLoginHome(store)
  }

  return null
}

export function installAuthNavigationGuards(router, store) {
  router.beforeEach((to, _from, next) => {
    const redirect = authRedirectFor(to, store)
    if (redirect && redirect !== to.fullPath && redirect !== to.path) next(redirect)
    else next()
  })

  store.watch(
    (state) => state.loaded,
    (loaded) => {
      if (!loaded) return
      const current = router.currentRoute.value
      const redirect = authRedirectFor(current, store)
      if (redirect && redirect !== current.fullPath && redirect !== current.path) {
        router.replace(redirect)
      }
    }
  )
}


// Wrap  async components in synchronous wrapper
function makeRouteShell(loader, { cache = true } = {}) {
  let cached = null

  return defineComponent({
    name: 'RouteShell',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const Inner = ref(cached)

      onMounted(async () => {
        if (!Inner.value) {
          try {
            const mod = await loader()
            Inner.value = markRaw(mod?.default || mod)
            if (cache) cached = Inner.value
          } catch (e) {
            console.error('[RouteShell] Failed to load route component:', e)
          }
        }
      })

      return () =>
        h(
          'div',
          { style: { width: '100%', height: '100%' } },
          Inner.value ? [h(Inner.value, { ...attrs }, slots)] : []
        )
    }
  })
}


// TeacherView child routes wrapped in shells
const TeacherHome = makeRouteShell(() => import('@/pages/teacher/home.vue'))
const ManageClasses = makeRouteShell(() => import('@/pages/teacher/manage-classes.vue'))
const AssignmentsFromMe = makeRouteShell(() => import('@/pages/assignments/from-me/assignments-list.vue'))
const AssignmentsToMe = makeRouteShell(() => import('@/pages/assignments/to-me/assignments-list.vue'))
const ContentLibrary = makeRouteShell(() => import('@/components/content/content-library.vue'))
const TeacherCreateTab = makeRouteShell(() => import('@/pages/teacher/teacher-create-tab.vue'))
const TeacherResourcesPage = makeRouteShell(() => import('@/pages/teacher/resources-page.vue'))
const TeacherTrainerPage = makeRouteShell(() => import('@/pages/teacher/trainer-page.vue'))
const BugReport = makeRouteShell(() => import('@/components/common/bug-report.vue'))
const TeacherStudyOptOut = makeRouteShell(() => import('@/pages/teacher/study-opt-out.vue'))

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/admin',
      component: AdminView
    },
    {
      path: '/researcher',
      component: ResearcherView
    },
    {
      path: '/teacher',
      component: TeacherView,
      children: [
        { path: 'classes', component: ManageClasses },
        {
          path: 'assignments-from-me',
          component: AssignmentsFromMe,
          props: {
            assignable_item_type: 'teacher-created',
            assignment_type: 'teacher-to-student'
          }
        },
        {
          path: 'tasks/:id?',
          component: AssignmentsToMe,
          props: route => ({
            id: route.params.id
          })
        },
        { path: 'content', component: ContentLibrary },
        { path: 'create', component: TeacherCreateTab },
        { path: 'resources', component: TeacherResourcesPage },
        {
          path: 'trainer',
          component: TeacherTrainerPage,
          beforeEnter: (_to, _from, next) => {
            if (isThailandTeacherHost()) next()
            else next('/teacher')
          },
        },
        { path: 'support', component: BugReport },
        { path: 'feedback', redirect: '/teacher/support' },
        { path: 'groups', redirect: '/teacher/classes' },
        { path: 'sequences', redirect: '/teacher/content' },
        { path: 'opt-out', component: TeacherStudyOptOut },
        { path: '', component: TeacherHome },
        { path: 'home', redirect: '/teacher' },
      ]
    },
    {
      path: '/teacher/codes',
      component: TeacherCodesView
    },
    {
      path: '/',
      component: StudentView
    },
    {
      path: '/assignment/:id',
      component: StudentView,
      props: true
    },
    {
      path: '/join/:teacher',
      component: JoinTeacherView
    },
    {
      path: '/login',
      component: LoginMenu
    },
    {
      path: '/candli-states',
      component: CandliStates
    },
    {
      path: '/:id',
      component: AssignmentView
    },

  ]
})

export default router
