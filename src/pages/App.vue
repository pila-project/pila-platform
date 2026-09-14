<template>
  <div v-if="loaded === false" class="loading-screen">
    <div class="loading-text">
      Loading<span class="dots"></span>
    </div>
  </div>
  <AccessCodeScreen v-else-if="accessCodeRequired" />
  <div
    id="main-app"
    v-else
  >
    <div id="main-app-body">
      <Suspense>
        <router-view></router-view>
      </Suspense>
    </div>
  </div>
  <PToastContainer />
</template>

<script>
  import AccessCodeScreen from './login/AccessCodeScreen.vue'
  import PToastContainer from '@/components/ui/PToastContainer.vue'
  import { SIMPLIFIED_STUDY_DOMAINS } from '@/utils/constants.js'

  export default {
    components: {
      AccessCodeScreen,
      PToastContainer,
    },
    computed: {
      loaded() { return this.$store.getters.loaded() },
      isAnonymous() { return this.$store.getters.isAnonymous() },
      accessCodeRequired() {
        const user = this.$store.state.user
        const role = this.$store.getters['roles/role'](user)
        if (
          role === 'student'
          || Agent.embedded
          || SIMPLIFIED_STUDY_DOMAINS.includes(window.location.host)
        ) return false
        else return !this.$store.state.codeEntered
      }
    },
    watch: {
      // After auth: honor teacher/student tab (or /teacher path) from login UI
      isAnonymous(anonymous, wasAnonymous) {
        if (wasAnonymous && !anonymous) this.routeAfterLoginIntent()
      },
      loaded(v) {
        if (v && !this.isAnonymous) this.routeAfterLoginIntent()
      },
    },
    methods: {
      routeAfterLoginIntent() {
        try {
          // Roles default to 'student' until loaded; do not consume intent yet.
          if (!this.loaded) return

          const returnPath = sessionStorage.getItem('pila-return-path')
          if (
            returnPath
            && returnPath.startsWith('/')
            && !returnPath.startsWith('//')
            && !returnPath.startsWith('/login')
          ) {
            sessionStorage.removeItem('pila-return-path')
            sessionStorage.removeItem('pila-login-intent')
            if (this.$route.fullPath !== returnPath) this.$router.push(returnPath)
            return
          }

          const intent = sessionStorage.getItem('pila-login-intent')
          if (!intent) return

          const user = this.$store.state.user
          const hasTeacher = this.$store.getters['roles/hasPermission'](user, 'teacher')
          const onTeacherPath = this.$route.path.startsWith('/teacher')

          if (intent === 'teacher') {
            // Teachers and aspiring teachers (no tag yet → RoleRequester) go to /teacher.
            if (!onTeacherPath) this.$router.push('/teacher')
            // Keep intent while they lack the teacher tag so /teacher can
            // show RoleRequester instead of ejecting them as a student.
            if (hasTeacher) sessionStorage.removeItem('pila-login-intent')
          } else {
            if (onTeacherPath) this.$router.push('/')
            sessionStorage.removeItem('pila-login-intent')
          }
        } catch { /* ignore */ }
      },
    },
  }
</script>

<style scoped>
#root,
.loading-screen {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.loading-text {
  font-size: 1.1rem;
  color: #666;
  letter-spacing: 0.5px;
}
.dots::after {
  content: '';
  display: inline-block;
  width: 1.2em;
  text-align: left;
  animation: dots 1.6s steps(4, end) infinite;
}
@keyframes dots {
  0%   { content: ''; }
  25%  { content: '.'; }
  50%  { content: '..'; }
  75%  { content: '...'; }
  100% { content: ''; }
}
#main-app
{
  display: flex;
  flex-direction: column;
  position: absolute;
  width: 100vw;
  height: calc(var(--vh, 1vh) * 100);
}
#main-app-body
{
  flex-grow: 1;
}
</style>
