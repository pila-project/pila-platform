<template>
  <div v-if="loaded === false" class="loading-screen">
    <div class="loading-text">
      Loading<span class="dots"></span>
    </div>
  </div>
  <LoginMenu v-else-if="isAnonymous" />
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
  import LoginMenu from './login/index.vue'
  import AccessCodeScreen from './login/AccessCodeScreen.vue'
  import PToastContainer from '@/components/ui/PToastContainer.vue'
  import { SIMPLIFIED_STUDY_DOMAINS } from '@/utils/constants.js'

  export default {
    components: {
      LoginMenu,
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
    }
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
