<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import LoginCodesView from '@/components/teacher/LoginCodesView.vue'
import { PButton } from '@/components/ui/index.js'
import languageChoices from '@/store/language-choices.js'
import { persistUiLanguage } from '@/store/ui-language.js'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const users = await Agent.state('users')
const params = new URLSearchParams(window.location.search)
const langParam = String(params.get('lang') || '').split(/[-_]/)[0]
if (languageChoices.includes(langParam)) {
  persistUiLanguage(langParam)
  await store.dispatch('language', langParam)
}
const studentFilter = params.get('students')
const filterIds = studentFilter ? studentFilter.split(',').filter(Boolean) : null

const visibleUsers = computed(() =>
  Object.keys(users).filter(id => {
    if (users[id].archived) return false
    if (filterIds) return filterIds.includes(id)
    return true
  })
)

function printCodes() {
  window.print()
}
</script>

<template>
  <div class="codes-page p-6">
    <div v-if="visibleUsers.length" class="codes-toolbar no-print">
      <PButton
        variant="primary"
        icon="lucide:printer"
        :text="t('print')"
        @click="printCodes"
      />
    </div>
    <LoginCodesView v-if="visibleUsers.length" :student-ids="visibleUsers" :users="users" />
    <p v-if="!visibleUsers.length" class="codes-empty">
      {{ t('no-students-selected') }}
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
.codes-empty {
  text-align: center;
  margin-top: 16px;
  color: var(--color-slate-500);
  font-size: 14px;
}
@media print {
  .no-print {
    display: none !important;
  }
}
</style>