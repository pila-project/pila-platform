<template>
  <v-container>
    <v-btn
      @click="pullReport('assignment-report')"
    >
      {{ t('assignments') }}
    </v-btn>
    <v-data-table
      sticky
      :loading="loading"
      :items="results"
      :items-per-page-text="t('items-per-page')"
      :items-per-page-options="[
        {value: 10, title: '10'},
        {value: 25, title: '25'},
        {value: 50, title: '50'},
        {value: 100, title: '100'},
        {value: -1, title: t('all')}
      ]"
    />

  </v-container>
</template>

<script setup>
  import { ref } from 'vue'
  import { useStore } from 'vuex'

  const store = useStore()

  const results = ref([])
  const loading = ref(false)

  function t(slug) { return store.getters.t(slug)}

  async function pullReport(report) {
    loading.value = true
    results.value = await Agent.query(report)
    loading.value = false
  }

</script>
