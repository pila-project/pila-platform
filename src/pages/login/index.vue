<template>
  <div id="login-page">
    <div id="login-page-inner">
      <img src="/logo.svg" />
      <input
        type="text"
        v-model="username"
        :placeholder="t('username')"
        @keypress.enter="login()"
        @keypress="error = null"
      />
      <br>
      <input
        type="password"
        v-model="password"
        :placeholder="t('password')"
        @keypress.enter="login()"
        @keypress="error = null"
      />
      <br>
      <IconButton
        @click="login()"
        class="login"
        :text="t('log-in')"
        icon="sign-in"
      />
      <div class="google-and-microsoft-wrapper">
        <IconButton
          @click="login('google')"
          text="google"
          icon="google"
        />
        <IconButton
          @click="login('microsoft')"
          text="microsoft"
          icon="windows"
        />
      </div>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script>
  import IconButton from './../../components/icon-button.vue'

  export default {
    components: { IconButton },
    props: {
      usernameProvider: {
        type: String,
        default: '@test-accounts.knowlearning.systems'
      }
    },
    data() {
      return {
        username: '',
        password: '',
        error: null
      }
    },
    methods: {
      t(slug) {
        return slug //this.$store.getters.translate(slug)
      },
      async login(provider=this.usernameProvider) {
        const { username, password } = this
        this.$emit('signingIn')
        await Agent.login(provider)
        //  TODO: handle username password login errors
      }
    }
  }
</script>

<style scoped>

  #login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    text-align: center;
  }
  input {
    margin: 6px;
  }
  button.login {
    display: inline;
    margin: 4px 0;
  }
  .google-and-microsoft-wrapper {
    display: flex;
    justify-content: center;
    width: 270px;
  }
  .google-and-microsoft-wrapper > button {
    margin: 4px;
  }
  .error {
    margin-top: 10px;
  }
</style>