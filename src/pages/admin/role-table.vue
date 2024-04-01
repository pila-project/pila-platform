<template>
  <div class="text-h3">{{ props.header }}</div>
  <v-data-table
    sticky
    :items="taggings"
    :loading="loading"
    :headers="headers"
  >
    <template v-slot:item.target="data">
      {{ data.item.target }}
    </template>
    <template v-slot:item.contributor="data">
      {{ data.item.contributor }}
    </template>
  </v-data-table>
  </template>

<script setup>
  import { ref } from 'vue'

  const props = defineProps({ partition: String, tag: String, header: String })

  const loading = ref(true)
  const taggings = ref([])

  const headers = [
    { key: 'target', title: 'User' },
    { key: 'contributor', title: 'Assigned By' }
  ]

  Agent
    .query('taggings-for-tag', [props.partition, props.tag], 'tags.knowlearning.systems')
    .then(result => {
      taggings.value = result
      loading.value = false
    })
</script>
