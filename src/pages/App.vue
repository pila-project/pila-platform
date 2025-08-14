<template>
  <div v-if="loaded === false">
    loading...
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
</template>

<script>
  import LoginMenu from './login/index.vue'
  import AccessCodeScreen from './login/AccessCodeScreen.vue'
  import { SIMPLIFIED_STUDY_DOMAINS } from '../constants.js'

  export default {
    components: {
      LoginMenu,
      AccessCodeScreen
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
