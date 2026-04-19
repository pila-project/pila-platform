<template>
    <div class="flex flex-col items-center mt-16">
      <img
        src="/not-found-icon.jpg"
        style="width:100px; height: 100px;"
      >
      <p class="mt-4 text-sm text-slate-500">{{ t('no-results-found-for-your-filter') }}</p>
    </div>
</template>

<script setup>
import { useStore } from 'vuex'
const store = useStore()
function t(slug) { return store.getters.t(slug) }
</script>
