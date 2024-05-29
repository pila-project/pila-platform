<template>
  <v-container>
    <v-btn
      class="ma-2"
      :color="selected === 'assignment-report' ? 'primary' : ''"
      @click="pullReport('assignment-report')"
    >
      {{ t('assignments') }}
    </v-btn>
    <v-btn
      class="ma-2"
      :color="selected === 'customised_items_report' ? 'primary' : ''"
      @click="pullReport('customised_items_report', [], 'create.pilaproject.org')"
    >
      {{ t('customised-items') }}
    </v-btn>

    <v-data-table
      sticky
      :loading="loading"
      :items="results"
      :headers="headers"
      :items-per-page-text="t('items-per-page')"
      :items-per-page-options="[
        {value: 10, title: '10'},
        {value: 25, title: '25'},
        {value: 50, title: '50'},
        {value: 100, title: '100'},
        {value: -1, title: t('all')}
      ]"
    >
      <template v-slot:item.owner="data">
        <DecryptedName
          avatar
          :user="data.item.owner"
        />
      </template>
    </v-data-table>

  </v-container>
</template>

<script setup>
  import { ref } from 'vue'
  import { useStore } from 'vuex'
  import DecryptedName from '../../components/decrypted-name.vue'

  const store = useStore()

  const results = ref([])
  const loading = ref(false)
  const selected = ref(null)
  const headers = ref([])

  function t(slug) { return store.getters.t(slug)}

  async function pullReport(query, params, domain) {
    loading.value = true
    selected.value = query
    headers.value = undefined
    results.value = await Agent.query(query, params, domain)
    if (results.value[0]) {
      headers.value = (
        Object
          .keys(results.value[0])
          .map(key => ({ key, title: t(key) }))
      )
    }
    loading.value = false
  }

</script>
