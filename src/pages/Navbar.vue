<template>
    <v-app-bar
        color="primary"
        :title="$store.getters.isThailandDomain ? 'ประเทศไทย' : 'International'"
    >
        <template v-slot:prepend>
            <v-icon class="fa-solid fa-menue" />
            <img
                src="/logo-green.svg"
                height="32"
            />
        </template>
        <v-spacer />
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
import languageChoices from '../store/languageChoices.js'
import { useStore } from 'vuex'
const store = useStore()
</script>