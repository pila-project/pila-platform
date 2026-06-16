<template>
  <v-card
    :elevation="props.selected ? 10 : 3"
    :variant="props.selected ? 'tonal' : 'elevated'"
    density="compact"
  >
    <template v-slot:title>
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
    </template>
    <template v-slot:subtitle>
      {{ (new Date(assignmentMetadata.created)).toLocaleDateString() }}
    </template>
    <template v-slot:text>
      <div class="image-container">
        <v-img :src="image" height="80px" />
      </div>
    </template>
    <template v-slot:actions>
      <v-btn
        prepend-icon="fa-solid fa-play"
        :text="t('play')"
        @click.stop="$emit('play')"
      />
    </template>
  </v-card>
</template>

<script setup>
  import { computed, ref, watch } from 'vue'
  import { useStore } from 'vuex'
  import { validate as isUUID } from 'uuid'
  import getName, { localizedNameFromValue } from '../../name-and-translation-for-content.js'
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
