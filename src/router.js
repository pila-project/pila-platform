import { createRouter, createWebHistory } from 'vue-router'
import AdminView from './pages/admin/index.vue'
import ResearcherView from './pages/researcher/index.vue'
import TeacherView from './pages/teacher/index.vue'
import StudentView from './pages/student/index.vue'
import JoinTeacherView from './pages/student/join-teacher.vue'
import AssignmentView from './pages/assignment/index.vue'

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
      component: TeacherView
    },
    {
      path: '/',
      component: StudentView
    },
    {
      path: '/join/:teacher',
      component: JoinTeacherView
    },
    {
      path: '/assignment/:item_id',
      component: AssignmentView
    }
  ]
})
