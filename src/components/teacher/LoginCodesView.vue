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
          <DecryptedName :user="id" source="roster" />
        </div>
        <div class="login-code-card-body">
          <QRCodeDisplay
            v-if="secretFor(id)"
            :data="pilaSecretLoginUrl(secretFor(id))"
            size="112px"
          />
          <p v-else-if="lookupFor(id) === 'missing'" class="login-code-missing">{{ t('no-pila-login-code') }}</p>
          <p v-else class="login-code-missing">{{ t('loading') }}...</p>
          <div v-if="secretFor(id)" class="login-code-secret">
            <div class="login-code-icons" :aria-label="t('pila-login-code')">
              <template v-for="(char, index) in secretFor(id)" :key="`${id}-${index}`">
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
import { computed, reactive, watch } from 'vue'
import { useStore } from 'vuex'
import { useEncryptionKey } from '@/utils/useEncryptionKey.js'
import DecryptedName from '@/components/common/decrypted-name.vue'
import QRCodeDisplay from '@/components/common/qrcode.vue'
import { faIconForCodeChar, pilaSecretLoginUrl } from '@/utils/login-code-symbols.js'
import {
  namedStudentLoginSecret,
  resolveStudentLoginSecret,
} from '@/utils/student-login-secret.js'

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
const { namePassword } = useEncryptionKey(store)
function t(slug) { return store.getters.t(slug) }

const studentIds = computed(() =>
  props.studentIds.filter(id => !props.users[id]?.archived)
)

const resolvedSecrets = reactive({})
const lookupState = reactive({})
let resolveGen = 0

watch(
  () => [
    namePassword.value || '',
    studentIds.value.map(id => `${id}:${props.users[id]?.secret || ''}`).join('|'),
  ],
  async () => {
    const gen = ++resolveGen
    const ids = studentIds.value
    for (const id of ids) {
      const named = namedStudentLoginSecret(props.users[id]?.secret)
      if (named) {
        resolvedSecrets[id] = named
        lookupState[id] = 'ready'
      } else {
        resolvedSecrets[id] = ''
        lookupState[id] = 'loading'
      }
    }
    await Promise.all(ids.map(async id => {
      if (lookupState[id] === 'ready') return
      const secret = await resolveStudentLoginSecret(
        '',
        id,
        store.getters.decryptUserSecret,
      )
      if (gen !== resolveGen) return
      resolvedSecrets[id] = secret
      lookupState[id] = secret ? 'ready' : 'missing'
    }))
  },
  { immediate: true },
)

function secretFor(id) {
  return resolvedSecrets[id] || ''
}

function lookupFor(id) {
  return lookupState[id] || 'loading'
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
.login-code-missing {
  margin: 0;
  text-align: center;
  color: var(--color-slate-600, #475569);
  line-height: 1.4;
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