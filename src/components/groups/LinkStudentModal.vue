<template>
  <div class="link-student-modal">
    <div class="agreement-area">
      <span>
        Per the PILA Personal Data Protection Notice, please check this box to confirm you have collected parental/guarding consent from your students as required by your local or national laws.
      </span>
      <input type="checkbox" v-model="agreed" :disabled="agreed" >
    </div>

    <div class="agreed" v-show="agreed">
      <div>
        Share this link with your students:
        <input id="link-input" disabled :placeholder="link">
      </div>
      <button @click="copyToClipboard">Copy Link</button>
    </div>
   
  </div>
</template>

<script>
export default {
  name: 'link-student-modal',
  data() {
    return {
      host: window.location.host,
      agreed: false
    }
  },
  computed: {
    user() {
      return this.$store.state.user
    },
    link() {
      return `https://${this.host}/join/${this. user}`
    }
  },
  methods: {


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
  padding: 10px 30px;
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
