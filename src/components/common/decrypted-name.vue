<template>
  <span
    class="decrypted-name"
    draggable
    @dragstart="$event.dataTransfer.setData('text', user)"
    @dragover.prevent
  >
    <PTruncatedText
      v-if="showName"
      class="decrypted-name-text"
      :text="displayName"
    />
  </span>
</template>

<script setup>
  import { reactive, computed, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { useStore } from 'vuex'
  import { useEncryptionKey } from '@/utils/useEncryptionKey.js'
  import { formatStudentPreferredName } from '@/utils/student-display-name.js'
  import { PTruncatedText } from '@/components/ui'

  const store = useStore()
  const route = useRoute()
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
    },
    /**
     * Prefer nickname display: "Nickname (Full Name)".
     * - true / false: force on/off
     * - undefined: auto on teacher routes (`/teacher...`)
     */
    preferNickname: {
      type: Boolean,
      default: undefined
    }
  })

  const info = reactive({
    name: '...'
  })

  async function decrypt() {
    // Reset so a previous user's nickname does not stick when switching ids
    info.name = '...'
    info.nickname = undefined
    try {
      const i = await store.getters.decryptUserInfo(props.user, props.alias)
      Object.assign(info, i || { name: '...' })
    } catch (e) {
      info.name = '...'
      info.nickname = undefined
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

  const usePreferredNickname = computed(() => {
    if (props.preferNickname === true) return true
    if (props.preferNickname === false) return false
    const path = route?.path || ''
    return path === '/teacher' || path.startsWith('/teacher/')
  })

  const displayName = computed(() => {
    if (usePreferredNickname.value) {
      const preferred = formatStudentPreferredName(info)
      if (preferred) return preferred
    }
    return info.name || '...'
  })
</script>

<style scoped>
.decrypted-name {
  display: block;
  min-width: 0;
  max-width: 100%;
}

.decrypted-name-text {
  min-width: 0;
  max-width: 100%;
}
</style>
