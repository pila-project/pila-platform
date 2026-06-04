<template>
  <div class="login-codes-view">
    <div v-if="!studentIds.length" class="login-codes-empty">
      <p>{{ t('no-students-selected') || 'No students selected.' }}</p>
    </div>
    <template v-else>
      <div
        v-for="id in studentIds"
        :key="id"
        class="login-code-card"
      >
        <div class="login-code-card-header">
          <DecryptedName :user="id" />
        </div>
        <div class="login-code-card-body">
          <QRCodeDisplay :data="`${siteOrigin}/join/${id}`" size="160px" />
          <div class="login-code-secret">
            <span class="login-code-label">{{ t('login-code') }}</span>
            <code class="login-code-plain">{{ formatLoginCodePlain(users[id]?.secret) }}</code>
            <div class="login-code-icons" aria-hidden="true">{{ loginCodeIconsFor(id) }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import DecryptedName from '@/components/common/decrypted-name.vue'
import QRCodeDisplay from '@/components/common/qrcode.vue'
import { formatLoginCodePlain, formatLoginCodeIcons } from '@/utils/login-code-display.js'

const props = defineProps({
  studentIds: {
    type: Array,
    default: () => [],
  },
  users: {
    type: Object,
    default: () => ({}),
  },
})

const store = useStore()
const siteOrigin = window.location.origin
function t(slug) { return store.getters.t(slug) }

const studentIds = computed(() =>
  props.studentIds.filter(id => !props.users[id]?.archived)
)

function loginCodeIconsFor(id) {
  return formatLoginCodeIcons(props.users[id]?.secret)
}


</script>

<style scoped>
.login-codes-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.login-codes-empty {
  text-align: center;
  color: var(--color-slate-500);
  padding: 24px;
}
.login-code-card {
  border: 1px solid var(--color-slate-200);
  border-radius: 8px;
  padding: 16px;
}
.login-code-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 600;
}
.login-code-card-body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.login-code-secret {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.login-code-label {
  font-size: 12px;
  color: var(--color-slate-500);
}
.login-code-plain {
  display: block;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.12em;
  font-family: ui-monospace, monospace;
}
.login-code-icons {
  font-size: 14px;
  color: var(--color-slate-500);
  margin-top: 4px;
}
</style>