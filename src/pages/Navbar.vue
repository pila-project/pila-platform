<template>
    <v-app-bar
        color="primary"
        :title="$store.getters.domainTitle"
    >
        <template v-slot:prepend>
            <v-icon icon="mdi-menu" />
            <img
                src="/logo-green.svg"
                height="32"
            />
        </template>
        <v-spacer />
        <span
          v-if="teacherViewButton"
          style="margin-right: 1em"
        >
            <PButton
                variant="secondary"
                icon="lucide:users"
                @click="goToTeacherView"
                :text="t('teacher-view')"
            />
        </span>
        <v-select
            class="pr-4"
            density="compact"
            hide-details
            bg-color="white"
            :items="languageChoices"
            style="max-width: 100px;"
            :model-value="store.getters.language()"
            @update:model-value="store.dispatch('language', $event)"

        />
    </v-app-bar>
</template>

<script setup>
import languageChoices from '../store/language-choices.js'
import { useStore } from 'vuex'
import { PButton } from '@/components/ui/index.js'
const store = useStore()

defineProps(['teacherViewButton'])

function t(slug) {
  return store.getters.t(slug)
}

function goToTeacherView() {
  window.location = '/teacher'
}
</script>