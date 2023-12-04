<template>
  <div class="modal" @click="$emit('close', 'background')">
    <div class="modal-content" @click.stop :style="{ width, height }" >
      <div class="modal-header">
        <div class="placeholder"></div>
        <slot name="title">
          <h2>Modal Title</h2>
        </slot>
        <button id="close" @click="$emit('close', 'top-x')">x</button>
      </div>
      <div class="modal-body">
        <slot name="body">
          <p>Modal body content goes here.</p>
        </slot>
      </div>
      <div style="text-align: right; padding: 24px; font-size: 2em;">
        <IconButton
          v-if="showCloseButton"
          background="green"
          :text="closeButtonText"
          textColor="white"
          @click="$emit('close', 'primary-button')"
        />
    </div>
    </div>
  </div>
</template>

<script>
import IconButton from './icon-button.vue'
export default {
  name: 'pila-modal',
  props: {
    showCloseButton: {
      type: Boolean,
      required: false,
      default: false
    },
    closeButtonText: {
      type: String,
      required: false,
      default: 'Close'
    },
    width: {
      type: String,
      default: '800px'
    },
    height: {
      type: String,
      default: '800px'
    }
  },
  components: { IconButton }
}
</script>

<style scoped>
.modal {
  position: fixed;
  overflow: scroll;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* Chrome, Safari and Opera */
.modal::-webkit-scrollbar {
  display: none;
}


.modal-content {
  margin-top: 20vh;
  margin-bottom: 5vh;
  background: white;
  border-radius: 20px;
  border: 4px solid #1b1b83;
  width: 800px;
  max-width: 90vw;
}

.modal-header {
  width: 100%;
  background: #1b1b83;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0 auto;
  text-align: center;
}

.modal-body {
  margin-top: 20px;
}
button#close {
  background: red;
  border-radius: 1000px;
  cursor: pointer;
  color: white;
  width: 26px;
  height: 26px;
  border: none;
  margin: 5px;
  font-size: 1.2em;
  cursor: pointer;
}
</style>