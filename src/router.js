import { createRouter, createWebHistory } from 'vue-router'
import AdminView from './pages/admin/index.vue'
import ResearcherView from './pages/researcher/index.vue'
import TeacherView from './pages/teacher/index.vue'
import TeacherCodesView from './pages/teacher/codes.vue'
import StudentView from './pages/student/index.vue'
import JoinTeacherView from './pages/student/join-teacher.vue'
import AssignmentView from './pages/assignment/index.vue'
import CandliStates from './pages/candli-states.vue'

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
        { path: 'classes', component: () => import('./pages/teacher/manage-classes.vue') },
        {
          path: 'assignments-from-me',
          component: () => import('./assignments/from-me/all.vue'),
          props: {
            assignable_item_type: 'teacher-created',
            assignment_type: 'teacher-to-student'
          }
        },
        { path: 'content', component: () => import('./components/content-library.vue') },
        { path: 'create', component: () => import('./pages/teacher/teacher-create-tab.vue') },
        { path: 'resources', component: () => import('./pages/teacher/resources-page.vue') },
        { path: 'trainer', component: () => import('./pages/teacher/trainer-page.vue') },
        { path: 'support', component: () => import('./components/bug-report.vue') },
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
