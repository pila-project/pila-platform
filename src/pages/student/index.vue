<template>
  <StudentAgreement v-if="!hasStudentAgreement" />
  <v-app
    class="student-view"
    v-else
  >
    <Navbar
      :teacherViewButton="$store.getters['roles/hasPermission']($store.state.user, 'teacher')"
    />

    <v-navigation-drawer rail permanent>
      <v-list-item
        :title="userInfo.name"
        :subtitle="$store.getters['roles/role']()"
        nav
      >
        <template v-slot:prepend>
          <v-avatar :image="userInfo.picture" />
        </template>
      </v-list-item>

      <v-divider></v-divider>

      <template v-slot:append>
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-icon
              v-bind="props"
              class="ma-4"
              icon="fa-solid fa-gear"
            />
          </template>
          <v-list>
            <v-list-item
              @click="logout"
              append-icon="fa-solid fa-arrow-right-from-bracket"
              :title="t('log-out')"
            >
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
    </v-navigation-drawer>

    <v-main>
      <StudentAssignments :id="id" />
    </v-main>
  </v-app>
</template>

<script>
  import Navbar from '../Navbar.vue'
  import StudentAgreement from './student-agreement.vue'
  import StudentAssignments from './student-assignments.vue'
  import TabMenu from '../../components/tab-menu.vue'
  import IconButton from '../../components/icon-button.vue'
  import StudiesNotAvailable from '../../components/studies-not-available.vue'
  export default {
    components: {
      Navbar,
      StudentAgreement,
      StudentAssignments,
      TabMenu,
      IconButton,
      StudiesNotAvailable
    },
    props: ['id'],
    data() {
      return {
        tab: 'class-assignments',
        userInfo: {}
      }
    },
    async created() {
      const { auth: { user, provider, info } } = await Agent.environment()
      this.userInfo = info

      if ( provider !== 'anonymous'
        && this.$store.getters['roles/hasPermission'](user, 'teacher')
        && document.referrer.startsWith('https://pilaproject.org/')
        && location.pathname === '/'
      ) window.location = '/teacher'
    },
    computed: {
      hasStudentAgreement() {
        return this.$store.getters.hasAcceptedStudentAgreement()
      },
      assignmentType() {
        return {
          'class-assignments': 'teacher-to-student',
          'study-assignments': 'teacher-to-student-research'
        }[this.tab]
      }
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) },
      logout() {
        Agent.logout()
      }
    }
  }
</script>