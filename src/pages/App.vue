<template>
  <div v-if="loaded === false">
    loading...
  </div>
  <LoginMenu v-else-if="isAnonymous" />
  <AccessCodeScreen v-if="!$store.state.codeEntered" />
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
      loaded() { return this.$store.getters.loaded },
      isAnonymous() { return this.$store.getters.isAnonymous() }
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
