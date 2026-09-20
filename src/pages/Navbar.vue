<template>
    <header class="pila-navbar">
        <div class="pila-navbar-brand">
            <img
                src="/logo-green.svg"
                height="32"
                alt=""
            />
            <span class="pila-navbar-title">{{ store.getters.domainTitle }}</span>
        </div>
        <div class="pila-navbar-actions">
            <PButton
                v-if="teacherViewButton"
                variant="secondary"
                icon="lucide:users"
                @click="goToTeacherView"
                :text="t('teacher-view')"
            />
            <select
                id="pila-navbar-language"
                class="pila-navbar-lang"
                :value="store.getters.language()"
                :aria-label="t('language')"
                @change="setLanguage($event.target.value)"
            >
                <option v-for="lang in languageChoices" :key="lang" :value="lang">
                    {{ lang }}
                </option>
            </select>
        </div>
    </header>
</template>

<script setup>
import languageChoices from '../store/language-choices.js'
import { persistUiLanguage } from '@/store/ui-language.js'
import { useStore } from 'vuex'
import { PButton } from '@/components/ui/index.js'
const store = useStore()

defineProps(['teacherViewButton'])

function t(slug) {
  return store.getters.t(slug)
}

function setLanguage(code) {
  persistUiLanguage(code)
  store.dispatch('language', code)
}

function goToTeacherView() {
  window.location = '/teacher'
}
</script>

<style scoped>
.pila-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  height: 64px;
  padding: 0 16px;
  background: #1976d2;
  color: #fff;
}
.pila-navbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.pila-navbar-brand img {
  height: 32px;
  width: auto;
}
.pila-navbar-title {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pila-navbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.pila-navbar-lang {
  height: 32px;
  min-width: 72px;
  max-width: 100px;
  padding: 0 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: #0f172a;
  cursor: pointer;
}
</style>
