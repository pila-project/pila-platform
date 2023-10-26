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
    <p>Welcome to the OECD's Platform for Innovative Learning Assessments (PILA)!</p>
    <br>
    <p>To create a teacher or researcher account, please enter your access code below:</p>
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
      <span>Access Code:</span>
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
        text="Enter"
        background="green"
      />
    </div>
    <p>
      Don't have an access code? Contact edu.pila@oecd.org to express interest in using PILA in your classroom or for your research.
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
      submitAccessCode() {
        if (this.accessCode === 'ACCESS') {
          this.$store.state.codeEntered = true
        }
        else alert('GO TO HELL!')
      }
    }
  }
</script>
