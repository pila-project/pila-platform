<template>
  <v-card
    :elevation="props.selected ? 10 : 3"
    :variant="props.selected ? 'tonal' : 'elevated'"
    :title="name"
    draggable="true"
    @dragstart="$event.dataTransfer.setData('text', props.id)"
  >
    <template v-slot:text>
      <div class="image-container">
        <img style="pointer-events: none;" :src="image" />
      </div>
    </template>
    <template v-slot:actions>
      <v-btn
        :text="t('preview')"
        @click.stop="$emit('preview')"
      />
      <v-btn
        v-if="props.removable"
        :text="t('remove')"
        @click.stop="$emit('remove')"
      />
    </template>
  </v-card>
</template>

<script setup>
  import { ref } from 'vue'
  import { useStore } from 'vuex'
  import { validate as isUUID } from 'uuid'
  import { displayTranslatedContent } from '../nameAndTranslation.js'

  const store = useStore()

  const props = defineProps(['id', 'selected', 'removable'])

  const name = await displayTranslatedContent(props.id, store.getters.language())

  // image setting stuff... maybe can be cleaned up now that name stuff simplified
  let image
  if (isUUID(props.id)) {
    const content = await Agent.state(props.id)
    const metadata = await Agent.metadata(props.id)

    if (isUUID(content.image)) image = await Agent.download(content.image).url()
    else if (content.image) image = content.image
    else {
      if (metadata.active_type?.startsWith('application/json;type=sequence')) {
        image = '/pila_sequence.png'
      }
      else if (metadata.active_type?.startsWith('application/json;type=karel-map')) {
        image = '/karelSide.png'
      }
      else if (content.id?.includes('betty')) {
        image = '/betty.png'
      }
      else {
        image = '/logo-green.svg'
      }
    }
  }
  else {
    if (props.id.includes('bettysbrain')) {
      image = '/betty.png'
    }
    else if (props.id.includes('karel')) {
      image = '/karelSide.png'
    }
    else {
      image = '/logo-green.svg'
    }
  }

  function t(slug) { return store.getters.t(slug)}
</script>

<style scoped>
  .image-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 128px;
    overflow: hidden;
  }

  .image-container img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
</style>