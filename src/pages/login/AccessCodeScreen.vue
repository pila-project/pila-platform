<template>
  <div style="max-width: 600px; margin: auto; position: relative; padding-top: 32px;">
    <div style="text-align: center; margin: 32px;">
      <img src="/logo-green.svg" style="width: 300px;" />
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
    <p>{{ t("create-an-account-or-log-in-with-the-service-tha") }}</p>
    <br>
    <p>{{ t('to-create-a-teacher-or-researcher-account-please') }}</p>
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
        type="text"
        @keypress.enter="submitAccessCode"
      />
      <PButton
        variant="primary"
        :text="t('enter')"
        @click="submitAccessCode"
      />
    </div>
    <p>
    {{ t("dont-have-an-access-code-contact-edu-pila-oecd-o") }}
    </p>
  </div>
</template>

<script>
  import { PButton } from '@/components/ui/index.js'
  import { DEFAULT_CODE_LIST, DOMAIN_CODE_LISTS } from '../../constants.js'

  export default {
    components: {
      PButton
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
        if ((DOMAIN_CODE_LISTS[location.host] || DEFAULT_CODE_LIST).includes(this.accessCode)) {
          this.$store.state.codeEntered = true
        }
        else alert( this.t('invalid-access-code') )
      }
    }
  }
</script>
