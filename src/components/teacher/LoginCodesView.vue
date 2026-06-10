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
            <span class="login-code-label login-code-label-secondary">{{ t('symbol-passphrase') }}</span>
            <div class="login-code-icons" aria-hidden="true">
              <i
                v-for="(char, index) in users[id]?.secret || ''"
                :key="`${id}-${index}`"
                :class="codeCharToIcon[char]"
                class="login-code-icon"
              />
            </div>
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
import { formatLoginCodePlain } from '@/utils/login-code-display.js'
import codeCharToIcon from '@/utils/code-char-to-icon.js'

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
  page-break-inside: avoid;
  break-inside: avoid;
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
.login-code-label-secondary {
  margin-top: 8px;
}

.login-code-icons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.login-code-icon {
  font-size: 20px;
  color: #334155;
}
</style>