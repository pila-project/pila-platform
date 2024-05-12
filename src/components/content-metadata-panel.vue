<template>
  <v-list>
    <v-list-item>
      <template v-slot:append>
        <v-btn
          variant="plain"
          @click="emit('back')"
          icon="fa-solid fa-xmark"
        />
      </template>
    </v-list-item>
    <v-list-item>
      <TagAncestorTree
        :target="props.id"
        :partition="props.partition"
      />
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
  import TagAncestorTree from './tag-ancestor-tree.vue'

  const props = defineProps({ id: String, partition: String })
  const emit = defineEmits(['back'])

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

</script>