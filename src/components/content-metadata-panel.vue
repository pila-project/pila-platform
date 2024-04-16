<template>
  <v-list>
    <v-list-item>
      <template v-slot:prepend>
        <v-btn
          variant="plain"
          @click="emit('back')"
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
      v-for="path in ancestorPaths"
      class="mt-2"
    >
      <span v-for="ancestor, index in path">
        <v-icon
          v-if="index > 0"
          icon="fa-solid fa-chevron-right"
        />
        <v-chip
          variant="outlined"
        >
          <vueScopeComponent :id="ancestor" :path="['name']" />
        </v-chip>
      </span>
    </v-list-item>
  </v-list>
</template>

<script setup>
  import { ref, watch } from 'vue'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'

  const props = defineProps({ id: String, partition: String })
  const emit = defineEmits(['back'])

  const loading = ref(true)
  const ancestorPaths = ref([])

  fetchCompetencies()
  watch(() => props.id, fetchCompetencies)

  function fetchCompetencies() {
    loading.value = true
    Agent
      .query('tag-ancestor-paths', [props.partition, props.id], 'tags.knowlearning.systems')
      .then(r => {
        ancestorPaths.value = r.map(({ path }) => path)
        loading.value = false
      })
  }
</script>