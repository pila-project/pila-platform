<template>
  <div class="link-student-modal">
    <div class="agreement-area">
      <span>
        {{ t('per-the-pila-personal-data-protection-notice-please-check-this-box-to-confirm-you-have-collected-parental-guarding-consent-from-your-students-as-required-by-your-local-or-national-laws') }}
      </span>
      <input type="checkbox" v-model="agreed" :disabled="agreed" >
    </div>

    <div class="agreed" v-show="agreed">
      <div>
        {{ t('share-this-link-with-your-students') }}
        <input id="link-input" disabled :placeholder="link">
      </div>
      <button @click="copyToClipboard">{{ t('copy-link') }}</button>
      <span style="color: grey; font-size: 0.8em;" v-if="clipped"><em>{{ t('link-copied') }}</em></span>
    </div>
   
  </div>
</template>

<script>
export default {
  name: 'link-student-modal',
  data() {
    return {
      host: window.location.host,
      agreed: false,
      clipped: false
    }
  },
  computed: {
    user() {
      return this.$store.state.user
    },
    link() {
      return `https://${this.host}/join/${this.user}`
    }
  },
  methods: {
    t(slug) { return this.$store.getters.t(slug) },
    copyToClipboard() {

      // Create a temporary textarea element to copy text to clipboard
      const textarea = document.createElement("textarea");
      textarea.value = this.link;
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);

      // Select the text within the textarea
      textarea.select();

      try {
        // Copy text to clipboard
        document.execCommand("copy");
        this.clipped = true
      } catch (err) {
        console.error("Unable to copy text: " + err);
      } finally {
        // Clean up: remove the temporary textarea
        document.body.removeChild(textarea);
      }
    },


  }
}
</script>

<style scoped>
.link-student-modal {
  padding: 10px 30px 0 30px;
  color: #1B1B83;
}
.agreement-area {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30px;
}
.agreement-area span {
  margin-right: 30px;
}
button {
  background: #1B1B83;
  color: white;
}
input#link-input {
  width: 420px;
}
button {
  padding: 6px 20px;
  border-radius: 8px;
  border: none;
  margin: 20px;
  cursor: pointer;
}
</style>
