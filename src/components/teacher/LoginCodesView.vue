<template>
  <div class="login-codes-view">
    <div v-if="!studentIds.length" class="login-codes-empty">
      <p>{{ t('no-students-selected') }}</p>
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
          <QRCodeDisplay :data="`${siteOrigin}/join/${id}`" size="112px" />
          <div class="login-code-secret">
            <span class="login-code-label">{{ t('pila-login-code') }}</span>
            <div class="login-code-icons" :aria-label="t('pila-login-code')">
              <template v-for="(char, index) in users[id]?.secret || ''" :key="`${id}-${index}`">
                <i
                  v-if="faIconForCodeChar(char)"
                  class="login-code-glyph"
                  :class="faIconForCodeChar(char)"
                />
                <span v-else class="login-code-glyph">{{ char }}</span>
              </template>
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
import { faIconForCodeChar } from '@/utils/login-code-symbols.js'

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
  justify-content: center;
  margin-bottom: 12px;
  font-weight: 700;
  font-size: 1.15rem;
  text-align: center;
}
.login-code-card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.login-code-secret {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.login-code-label {
  font-size: 12px;
  color: var(--color-slate-500);
}

.login-code-icons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.login-code-glyph {
  min-width: 1.1em;
  font-size: 22px;
  line-height: 1;
  color: #334155;
  text-align: center;
}
@media print {
  .login-code-glyph {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>