<template>
  <v-dialog v-model="open" :width="width" :min-height="height">
    <template v-slot:default="{ isActive }"><v-card :min-height="height">
      <div class="modal-header">
        <div class="placeholder"></div>
        <slot name="title">
          <h2>Modal Title</h2>
        </slot>
        <v-btn
          @click="$emit('close', 'top-x')"
          class="mr-2"
          size="x-small"
          density="comfortable"
          icon="fa fa-xmark"
          color="red"
        />
      </div>
      <div class="modal-body">
        <slot name="body">
          <p>Modal body content goes here.</p>
        </slot>
      </div>
      <div class="modal-footer">
        <IconButton
          v-if="showCloseButton"
          background="green"
          :text="closeButtonText"
          textColor="white"
          @click="$emit('close', 'primary-button')"
        />
      </div>
    </v-card></template>
  </v-dialog>
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
      required: false,
      default: '800px'
    },
    height: {
      type: String,
      required: false,
      default: 'auto'
    },
  },
  components: { IconButton },
  computed: {
    open: {
      get() { return true },
      set(value) {
        if (!value) this.$emit('close', 'outside')
      }
    }
  }
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
.modal::-webkit-scrollbar,
.modal-body::-webkit-scrollbar {
  display: none;
}

.modal-content {
  margin-top: 5vh;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  border: 4px solid rgb(46, 157, 249);
  width: 800px;
  max-width: 90vw;
  position: relative;
}

.modal-header {
  flex-grow: 0;
  flex-shrink: 0;
  width: 100%;
  background: rgb(46, 157, 249);
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
  flex-grow: 1;
  overflow: scroll;
  position: relative;
}
.modal-footer {
  flex-grow: 0;
  flex-shrink: 0;
  text-align: right;
  padding: 4px;
  background: #F2F2F2;
  border-top: 2px solid #EEEEEE;
}
</style>