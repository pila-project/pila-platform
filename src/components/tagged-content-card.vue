<template>
  <v-card
    :elevation="props.selected ? 10 : 3"
    :variant="props.selected ? 'tonal' : 'elevated'"
    :title="name"
  >
    <template v-slot:text>
      <div class="image-container">
        <img :src="image" />
      </div>
    </template>
    <template v-slot:actions>
      <v-btn
        :text="t('preview')"
        @click.stop="$emit('preview')"
      />
    </template>
  </v-card>
</template>

<script setup>
  import { ref } from 'vue'
  import { useStore } from 'vuex'
  import { validate as isUUID } from 'uuid'
  import { CANDLI_SEQUENCES } from '../constants.js'

  const store = useStore()

  const props = defineProps(['id', 'selected'])
  const content = await Agent.state(props.id)
  const metadata = await Agent.metadata(props.id)

  let name, image
  if (isUUID(content.name)) {
    // TODO: don't just rely on source_string fallback
    name = (await Agent.state(content.name)).source_string
  }
  else if (content.name) name = content.name

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
      image = '/betty.jpg'
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