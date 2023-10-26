<template>
  <div v-if="isLoaded === false">
    loading...
  </div>
  <LoginMenu v-else-if="isAnonymous" />
  <AccessCodeScreen v-if="false && !$store.state.codeEntered" />
  <div
    id="main-app"
    v-else
  >
    <div id="main-app-body">
      <router-view></router-view>
    </div>
  </div>
</template>

<script>
  import LoginMenu from './login/index.vue'
  import AccessCodeScreen from './login/AccessCodeScreen.vue'

  export default {
    components: {
      LoginMenu,
      AccessCodeScreen
    },
    computed: {
      isLoaded() { return this.$store.state.loaded },
      isAnonymous() { return this.$store.getters['isAnonymous']() }
    },
    methods: {
      logOut() {
        Agent.logout()
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
  height: 100vh;
}
#main-app-body
{
  flex-grow: 1;
}
</style>
