<template>
  <RefreshingIndicator />
  <StudentAgreement v-if="!hasStudentAgreement" />
  <div
    class="student-view"
    v-else
  >
    <Navbar
      :teacherViewButton="$store.getters['roles/hasPermission']($store.state.user, 'teacher')"
    />

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <nav class="flex flex-col w-16 border-r border-slate-200 bg-white flex-shrink-0">
        <!-- User info -->
        <div class="flex items-center justify-center py-3 border-b border-slate-200">
          <PAvatar
            @click.shift="alertUserName"
            :image="userInfo.picture"
            :name="userInfo.name"
            :size="32"
          />
        </div>

        <PDivider />

        <div class="flex-1" />

        <!-- Settings -->
        <div class="border-t border-slate-200 py-2">
          <PMenu>
            <template #activator="{ props }">
              <button class="flex items-center justify-center w-full py-2 text-slate-500 hover:text-slate-700" @click="props.onClick">
                <LucideIcon name="settings" :size="16" />
              </button>
            </template>
            <PMenuItem
              :title="t('log-out')"
              append-icon="lucide:log-out"
              @click="logout"
            />
          </PMenu>
        </div>
      </nav>

      <!-- Main content -->
      <main class="flex-1 overflow-auto">
        <StudentAssignments :id="id" />
      </main>
    </div>
  </div>
</template>

<script>
  import Navbar from '@/pages/Navbar.vue'
  import StudentAgreement from './student-agreement.vue'
  import StudentAssignments from './student-assignments.vue'
  import { PAvatar, PMenu, PMenuItem, PDivider } from '@/components/ui/index.js'
  import LucideIcon from '@/components/ui/LucideIcon.vue'
  import StudiesNotAvailable from '@/components/common/studies-not-available.vue'
  import { logout as doLogout } from '@/utils/logout.js'
  import RefreshingIndicator from '@/components/ui/RefreshingIndicator.vue'
  export default {
    components: {
      Navbar,
      StudentAgreement,
      StudentAssignments,
      PAvatar,
      PMenu,
      PMenuItem,
      PDivider,
      StudiesNotAvailable,
      LucideIcon,
      RefreshingIndicator
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
      ) this.$router.push('/teacher')
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
      logout() { doLogout(this.$store.state.user) },
      alertUserName() { alert(this.$store.state.user ) }
    }
  }
</script>

<style scoped>
.student-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
