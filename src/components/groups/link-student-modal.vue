<template>
  <div class="link-student-modal">
    <div class="agreement-area">
      <span>
        {{ t('per-the-pila-personal-data-protection-notice-or') }}
      </span>
      <PCheckbox v-model="agreed" :disabled="agreed" size="sm" />
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
    async copyToClipboard() {
      try {
        // Copy text to clipboard
        await navigator.clipboard.writeText(this.link)
        this.clipped = true
      } catch (err) {
        alert('Error copying text: ' + this.link)
        console.error("Unable to copy text: " + err);
      }
    }
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
