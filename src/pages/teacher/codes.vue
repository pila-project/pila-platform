<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import LoginCodesView from '@/components/teacher/LoginCodesView.vue'
import { PButton } from '@/components/ui/index.js'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const users = await Agent.state('users')
const params = new URLSearchParams(window.location.search)
const studentFilter = params.get('students')
const filterIds = studentFilter ? studentFilter.split(',').filter(Boolean) : null

const visibleUsers = computed(() =>
  Object.keys(users).filter(id => {
    if (users[id].archived) return false
    if (filterIds) return filterIds.includes(id)
    return true
  })
)

const usersWithCodes = computed(() =>
  visibleUsers.value.filter(id => users[id]?.secret)
)

const usersMissingCodes = computed(() =>
  visibleUsers.value.filter(id => !users[id]?.secret)
)

function printCodes() {
  window.print()
}
</script>

<template>
  <div class="codes-page p-6">
    <div v-if="usersWithCodes.length" class="codes-toolbar no-print">
      <PButton
        variant="primary"
        icon="lucide:printer"
        :text="t('print') || 'Print'"
        @click="printCodes"
      />
    </div>
    <p v-if="usersMissingCodes.length" class="codes-missing no-print">
      {{ usersMissingCodes.length }} {{ t('student') || 'student' }}{{ usersMissingCodes.length === 1 ? '' : 's' }}
      {{ t('without-login-codes') || 'without login codes (not shown below).' }}
    </p>
    <LoginCodesView v-if="usersWithCodes.length" :student-ids="usersWithCodes" :users="users" />
    <p v-if="!visibleUsers.length" class="codes-empty">
      {{ t('no-students-selected') || 'No students selected.' }}
    </p>
    <p v-else-if="!usersWithCodes.length" class="codes-empty">
      {{ t('no-active-users-with-login-codes') || 'No active users with login codes.' }}
    </p>
  </div>
</template>

<style scoped>
.codes-page {
  max-width: 720px;
  margin: 0 auto;
}
.codes-toolbar {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}
.codes-empty,
.codes-missing {
  text-align: center;
  margin-top: 16px;
  color: var(--color-slate-500);
  font-size: 14px;
}
.codes-missing {
  margin-bottom: 16px;
  color: var(--color-amber-700, #b45309);
}
@media print {
  .no-print {
    display: none !important;
  }
}
</style>