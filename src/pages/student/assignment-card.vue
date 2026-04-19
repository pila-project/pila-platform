<template>
  <PCard :elevated="props.selected">
    <template #header>
      <span
        :style="`font-size: ${
          name.length > 30
            ? '0.75rem'
            : name.length > 20
              ? '1rem'
              : 'inherit'
        };`"
      >
        {{ name }}
      </span>
      <p class="text-xs text-slate-500 mt-0.5">
        {{ (new Date(assignmentMetadata.created)).toLocaleDateString() }}
      </p>
    </template>
    <template #text>
      <div class="image-container">
        <img :src="image" class="max-w-full max-h-full object-contain" />
      </div>
    </template>
    <template #actions>
      <PButton
        variant="primary"
        size="sm"
        icon="fa-solid fa-play"
        :text="t('play')"
        @click.stop="$emit('play')"
      />
    </template>
  </PCard>
</template>

<script setup>
  import { computed, ref, watch } from 'vue'
  import { useStore } from 'vuex'
  import { validate as isUUID } from 'uuid'
  import getName, { localizedNameFromValue } from '@/utils/name-and-translation-for-content.js'
  import { PCard, PButton } from '@/components/ui/index.js'
  const store = useStore()

  const props = defineProps(['assignment', 'selected'])
  const assignment = await Agent.state(props.assignment)
  const assignmentItem = await Agent.state(assignment.item_id)
  const assignmentMetadata = await Agent.metadata(props.assignment)
  const name = ref('')
  const selectedLanguage = computed(() => store.getters.language())
  let nameLoadRun = 0
  const content = await Agent.state(assignmentItem.content)
  const metadata = await Agent.metadata(assignmentItem.content)
  let image = ref('')

  watch(
    selectedLanguage,
    async (language) => {
      const runId = ++nameLoadRun

      try {
        const translatedName = await getName(assignment.item_id, language)
        if (runId === nameLoadRun) name.value = translatedName || ''
      } catch (error) {
        console.warn(`Unable to load translated assignment item name for ${assignment.item_id}.`, error)
        if (runId === nameLoadRun) {
          name.value = localizedNameFromValue(assignmentItem.name, language)
        }
      }
    },
    { immediate: true }
  )

  if (isUUID(content.image)) image = await Agent.download(content.image).url()
  else if (content.image) image = content.image
  else {
    if (metadata.active_type?.startsWith('application/json;type=sequence')) {
      image = '/pila_sequence.png'
    }
    else if (metadata.active_type?.startsWith('application/json;type=karel-map')) {
      image = '/karel_new.png'
    }
    else if (content.id?.includes('betty')) {
      image = '/betty.png'
    }
    else {
      image = '/mascotte.png'
    }
  }

  function t(slug) { return store.getters.t(slug)}
</script>

<style scoped>
.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
}
</style>