<template>
  <span
      draggable
      @dragstart="$event.dataTransfer.setData('text', user)"
      @dragover.prevent
  >
    <span v-if="showName">
      {{ info.name }}
    </span>
  </span>
</template>

<script setup>
  import { reactive, watch } from 'vue'
  import { useStore } from 'vuex'

  const store = useStore()

  const props = defineProps({
    user: String,
    alias: {
      type: Boolean,
      default: false
    },
    avatar: {
      type: Boolean,
      default: false
    },
    showName: {
      type: Boolean,
      default: true
    },
    size: {
      type: String,
      default: 'small',
      validator: val => ['x-small', 'small', 'default', 'large', 'x-large'].includes(val)
    }
  })

  const info = reactive({
    name: '...'
  })

  watch(
    () => props.user,
    async () => {
      const i = await store.getters.decryptUserInfo(props.user, props.alias)
      Object.assign(info, i)
    },
    {
      immediate: true
    }
  )

  function logUser() {
    console.log(props.user)
  }

</script>

<style scoped>
  span {
    white-space: nowrap;
  }
</style>