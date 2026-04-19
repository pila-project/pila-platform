<template>
  <div class="divide-y divide-slate-200">
    <div class="px-4 py-3 flex items-center justify-end">
      <button
        class="text-slate-400 hover:text-slate-600"
        @click="emit('back')"
      >
        <i class="fa-solid fa-xmark" />
      </button>
    </div>
    <div class="px-4 py-3">
      <TagCloud
        :target="props.id"
        :partition="props.partition"
      />
    </div>
    <div v-if="contentMetadata" class="px-4 py-3 text-sm text-slate-700">
      {{ t('created-by') }}:
      <DecryptedName
        :user="contentMetadata.owner"
        alias
      />
    </div>
    <div v-if="contentMetadata" class="px-4 py-3 text-sm text-slate-700">
      {{ t('created') }}: {{ contentCreated }}
    </div>
    <div v-if="contentMetadata" class="px-4 py-3 text-sm text-slate-700">
      {{ t('updated') }}: {{ contentUpdated }}
    </div>
    <div v-if="contentMetadata" class="px-4 py-3 text-sm text-slate-700">
      {{ t('available-languages') }}: ...
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, computed } from 'vue'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import DecryptedName from '@/components/common/decrypted-name.vue'
  import TagCloud from '@/components/tags/tag-cloud.vue'

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
