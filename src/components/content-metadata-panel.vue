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
      <TagCloud
        :target="props.id"
        :partition="props.partition"
      />
    </v-list-item>
    <v-divider></v-divider>
    <v-list-item v-if="contentMetadata">
      {{ t('created-by') }}:
      <DecryptedName
        :user="contentMetadata.owner"
        alias
      />
    </v-list-item>
    <v-list-item v-if="contentMetadata">
      {{ t('created') }}: {{ contentCreated }}
    </v-list-item>
    <v-list-item v-if="contentMetadata">
      {{ t('updated') }}: {{ contentUpdated }}
    </v-list-item>
    <v-list-item v-if="contentMetadata">
      {{ t('available-languages') }}: ...
    </v-list-item>
  </v-list>
</template>

<script setup>
  import { ref, watch, computed } from 'vue'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import DecryptedName from './decrypted-name.vue'
  import TagCloud from './tag-cloud.vue'
  
  import { useStore } from 'vuex'
  const store = useStore()
  function t(slug) { return store.getters.t(slug) }

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