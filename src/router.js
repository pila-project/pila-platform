import { createRouter, createWebHistory } from 'vue-router'
import { defineComponent, h, ref, onMounted, markRaw } from 'vue'

import AdminView from './pages/admin/index.vue'
import ResearcherView from './pages/researcher/index.vue'
import TeacherView from './pages/teacher/index.vue'
import TeacherCodesView from './pages/teacher/codes.vue'
import StudentView from './pages/student/index.vue'
import JoinTeacherView from './pages/student/join-teacher.vue'
import AssignmentView from './pages/assignment/index.vue'
import CandliStates from './pages/candli-states.vue'

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
          const mod = await loader()
          Inner.value = markRaw(mod?.default || mod)
          if (cache) cached = Inner.value
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
const ManageClasses = makeRouteShell(() => import('./pages/teacher/manage-classes.vue'))
const AssignmentsFromMe = makeRouteShell(() => import('./assignments/from-me/all.vue'))
const ContentLibrary = makeRouteShell(() => import('./components/content-library.vue'))
const TeacherCreateTab = makeRouteShell(() => import('./pages/teacher/teacher-create-tab.vue'))
const TeacherResourcesPage = makeRouteShell(() => import('./pages/teacher/resources-page.vue'))
const TeacherTrainerPage = makeRouteShell(() => import('./pages/teacher/trainer-page.vue'))
const BugReport = makeRouteShell(() => import('./components/bug-report.vue'))
const TeacherStudyOptOut = makeRouteShell(() => import('./pages/teacher/study-opt-out.vue'))

export default createRouter({
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
        { path: 'content', component: ContentLibrary },
        { path: 'create', component: TeacherCreateTab },
        { path: 'resources', component: TeacherResourcesPage },
        { path: 'trainer', component: TeacherTrainerPage },
        { path: 'support', component: BugReport },
        { path: 'opt-out', component: TeacherStudyOptOut },
        { path: '', redirect: 'teacher/classes' }
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
      path: '/:id',
      component: AssignmentView
    },
    {
      path: '/candli-states',
      component: CandliStates
    }
  ]
})
