<template>
  <div id="login-page">
    <div id="login-page-inner" style="max-width: 256px;">
      <img
        src="/logo-green.svg"
        @click.shift="$store.dispatch('cycleLanguageAndRefetch')"
      />
      <div style="margin: 16px;">
        <div
          class="login-button"
          @click="login('google')"
        >
          <img class="login-button-icon" src="/external-logos/google.png" />
          <div class="login-button-divider"></div>
          <div>{{ t('log-in-with') }} Google</div>
        </div>
        <div
          class="login-button"
          @click="login('microsoft')"
        >
          <img class="login-button-icon" src="/external-logos/microsoft.png" />
          <div class="login-button-divider"></div>
          <div>{{ t('log-in-with') }}  Microsoft</div>
        </div>
        <div
          class="login-button"
          @click="login('clever')"
        >
          <img class="login-button-icon" src="/external-logos/clever.png" />
          <div class="login-button-divider"></div>
          <div>{{ t('log-in-with') }}  Clever</div>
        </div>
        <div
          class="login-button"
          @click="login('classlink')"
        >
          <img class="login-button-icon" src="/external-logos/classlink.png" />
          <div class="login-button-divider"></div>
          <div>{{ t('log-in-with') }}  ClassLink</div>
        </div>
      </div>
      <div v-if="error" class="error">{{ error }}</div>
      <div style="display: flex; margin: 16px 0; align-items: center;">
        <img src="/mascotte.png" style="width: 92px" />
        <div>
          <p style="padding: 16px; width: 450px; text-align: left;">
            {{ t("create-an-account-or-log-in-with-the-service-that-you-use-at-your-school-if-the-service-you-normally-use-is-not-among-the-options-please-ask-your-teacher-to-contact-edu-pila-oecd-org") }}
          </p>
        </div>
      </div>
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
        return this.$store.getters.t(slug)
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
  #login-page-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
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
  .login-button
  {
    display: flex;
    align-items: center;
    width: 256px;
    height: 32px;
    padding: 8px;
    margin: 8px;
    border-radius: 8px;
    box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px;
    cursor: pointer;
  }
  .login-button-icon
  {
    width: 32px;
  }
  .login-button-divider
  {
    height: 100%;
    margin: 8px;
    border-right:
    1px solid #EEEEEE;
  }
</style>