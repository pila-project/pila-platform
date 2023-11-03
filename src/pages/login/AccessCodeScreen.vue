<template>
  <div style="max-width: 600px; margin: auto; position: relative; padding-top: 32px;">
    <div style="text-align: center; margin: 32px;">
      <img
        @click.shift="$store.dispatch('cycleLanguageAndRefetch')"
        src="/logo-green.svg" style="width: 300px;"
      />
    </div>
    <img
      src="/mascotte.png"
      style="
        width: 128px;
        position: absolute;
        left: -155px;
        top: 170px;
      "
    />
    <p>{{ t("create-an-account-or-log-in-with-the-service-that-you-use-at-your-school-if-the-service-you-normally-use-is-not-among-the-options-please-ask-your-teacher-to-contact-edu-pila-oecd-org") }}</p>
    <br>
    <p>{{ t('to-create-a-teacher-or-researcher-account-please-enter-your-access-code-below') }}</p>
    <div
      style="
        background: #CCCCCC;
        border-radius: 16px;
        padding: 16px 32px;
        margin: 40px 0;
        display: flex;
        align-items: center;
        justify-content: center;
      "
    >
      <span>{{ t('access-code') }}</span>
      <input
        style="
          border: none;
          padding: 8px;
          font-size: 1.25em;
          text-align: center;
          border-radius: 16px;
          margin: 16px;
        "
        placeholder="- - - - -"
        v-model="accessCode"
        @keypress.enter="submitAccessCode"
      />
      <IconButton
        @click="submitAccessCode"
        :text="t('enter')"
        background="green"
        textColor="#f7f7f7"
      />
    </div>
    <p>
    {{ t("dont-have-an-access-code-contact-edu-pila-oecd-org-to-express-interest-in-using-pila-in-your-classroom-or-for-your-research") }}
    </p>
  </div>
</template>

<script>
  import IconButton from '../../components/icon-button.vue'
  export default {
    components: {
      IconButton
    },
    data() {
      return {
        accessCode: ''
      }
    },
    methods: {
      t(slug) {
        return this.$store.getters.t(slug)
      },
      submitAccessCode() {
        if (this.accessCode === 'ACCESS') {
          this.$store.state.codeEntered = true
        }
        else alert('GO TO HELL!')
      }
    }
  }
</script>
