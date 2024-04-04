<template>
  <v-list>
    <v-list-item>
      <template v-slot:prepend>
        <v-btn
          variant="plain"
          @click="$emit('back')"
          icon="fa-solid fa-chevron-left"
        />
      </template>
      <v-list-item-title>
        <vueScopeComponent :id="props.id" :path="['name']"/>
      </v-list-item-title>
      <v-list-item-subtitle>
        metadata
      </v-list-item-subtitle>
    </v-list-item>
    <v-divider></v-divider>
    <v-list-item
      v-for="id in competencies"
    >
      <v-list-item-title>
        <vueScopeComponent :id="id" :path="['name']" />
      </v-list-item-title>
    </v-list-item>
  </v-list>
</template>

<script setup>
  import { ref, watch } from 'vue'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'

  const props = defineProps({ id: String, partition: String })
  defineEmits(['back'])
  const competencies = ref([])
  const loading = ref(true)

  fetchCompetencies()
  watch(() => props.id, fetchCompetencies)

  function fetchCompetencies() {
    loading.value = true
    Agent
      .query('taggings-for-target', [props.partition, props.id], 'tags.knowlearning.systems')
      .then(result => {
        competencies.value = result.map(r => r.tag)
        loading.value = false
      })
  }
</script>