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
    <v-list-item>
      <div class="text-h4 pt-6">PILA Competencies</div>
    </v-list-item>
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
    <v-divider></v-divider>
    <v-list-item>
      <div class="text-h4 pt-6">Metadata</div>
    </v-list-item>
    <v-list-item v-if="contentMetadata">
      Created By:
      <DecryptedName
        :user="contentMetadata.owner"
        alias
      />
    </v-list-item>
    <v-list-item v-if="contentMetadata">
      Created: {{ contentCreated }}
    </v-list-item>
    <v-list-item v-if="contentMetadata">
      Updated: {{ contentUpdated }}
    </v-list-item>
    <v-list-item v-if="contentMetadata">
      Available Languages: ...
    </v-list-item>
  </v-list>
</template>

<script setup>
  import { ref, watch, computed } from 'vue'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import DecryptedName from './decrypted-name.vue'

  const props = defineProps({ id: String, partition: String })
  const emit = defineEmits(['back'])

  const loading = ref(true)
  const ancestorPaths = ref([])
  const contentMetadata = ref(null)

  Agent
    .metadata(props.id)
    .then(md => contentMetadata.value = md)

  const contentCreated = computed(() => {
    if (!contentMetadata.value) return '...'
    else return new Date(contentMetadata.value.created).toLocaleDateString()
  })

  const contentUpdated = computed(() => {
    if (!contentMetadata.value) return '...'
    else return new Date(contentMetadata.value.updated).toLocaleDateString()
  })

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