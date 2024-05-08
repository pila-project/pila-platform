<template>
    <v-container
      class="
        d-flex
        flex-column
        align-center
        mt-16
      "
      fluid
    >
      <img
        src="/not-found-icon.jpg"
        style="width:100px; height: 100px;"
      >
      <p class="mt-4">{{ t('no-results-found-for-your-filter') }}</p>
    </v-container>
</template>

<script setup>
import { useStore } from 'vuex'
const store = useStore()
function t(slug) { return store.getters.t(slug) }
</script>