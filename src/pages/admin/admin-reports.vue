<template>
  <div class="p-6">
    <div class="flex gap-2 mb-4">
      <PButton
        :variant="selected === 'login-report' ? 'primary' : 'secondary'"
        @click="pullReport('login-report')"
        :text="t('login-report')"
      />
      <PButton
        :variant="selected === 'assignment-report' ? 'primary' : 'secondary'"
        @click="pullReport('assignment-report')"
        :text="t('assignments')"
      />
      <PButton
        :variant="selected === 'customised_items_report' ? 'primary' : 'secondary'"
        @click="pullReport('customised_items_report', [], 'create.pilaproject.org')"
        :text="t('customised-items')"
      />
    </div>

    <PTable
      :loading="loading"
      :items="results"
      :headers="headers"
      :noDataText="t('no-data-available')"
      :itemsPerPageText="t('items-per-page')"
      :itemsPerPage="10"
      :itemsPerPageOptions="[
        {value: 10, title: '10'},
        {value: 25, title: '25'},
        {value: 50, title: '50'},
        {value: 100, title: '100'},
        {value: -1, title: t('all')}
      ]"
    >
      <template #item.owner="{ item }">
        <DecryptedName avatar :user="item.owner" />
      </template>
      <template #[`item.assigner-id`]="{ item }">
        <DecryptedName avatar :user="item['assigner-id']" />
      </template>
      <template #item.user="{ item }">
        <DecryptedName avatar :user="item.user" />
      </template>
    </PTable>
    <PButton
      v-if="results[0]"
      variant="secondary"
      @click="download"
      :text="t('download')"
      class="mt-4"
    />
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { useStore } from 'vuex'
  import DecryptedName from '@/components/common/decrypted-name.vue'
  import { json2csv } from 'json-2-csv'
  import { PTable, PButton } from '@/components/ui/index.js'

  const store = useStore()

  const results = ref([])
  const loading = ref(false)
  const selected = ref(null)
  const headers = ref([])

  function t(slug) { return store.getters.t(slug)}

  async function pullReport(query, params, domain) {
    loading.value = true
    selected.value = query
    headers.value = []
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

  async function download() {
    const csv = await json2csv(results.value)
    const file = new File([csv], `${selected.value}-${(new Date()).toLocaleString()}.csv`, {
      type: 'text/plain',
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(file)

    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()

    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

</script>
