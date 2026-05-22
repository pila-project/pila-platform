<template>
  <span
      draggable
      @dragstart="$event.dataTransfer.setData('text', user)"
      @dragover.prevent
  >
    <span v-if="showName">
      {{ displayName }}
    </span>
  </span>
</template>

<script setup>
  import { reactive, computed, watch } from 'vue'
  import { useStore } from 'vuex'
  import { useEncryptionKey } from '@/utils/useEncryptionKey.js'

  const store = useStore()
  const { namePassword: encryptionKey } = useEncryptionKey(store)

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

  async function decrypt() {
    try {
      const i = await store.getters.decryptUserInfo(props.user, props.alias)
      Object.assign(info, i)
    } catch (e) {
      info.name = '...'
    }
  }

  // Re-decrypt when the user changes OR when the encryption key changes
  watch(
    [() => props.user, () => encryptionKey.value],
    async () => {
      if (props.user) {
        await decrypt()
      }
    },
    { immediate: true }
  )

  const displayName = computed(() => {
    return info.name || '...'
  })

  function logUser() {
    console.log(props.user)
  }

</script>

<style scoped>
  span {
    white-space: nowrap;
  }
</style>