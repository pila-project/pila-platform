<template>
  <v-card
    :elevation="props.selected ? 10 : 3"
    :variant="props.selected ? 'tonal' : ''"
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
        @click.stop
      />
    </template>
  </v-card>
</template>

<script setup>
  import { ref } from 'vue'
  import { useStore } from 'vuex'
  import { validate as isUUID } from 'uuid'

  const store = useStore()

  const props = defineProps(['id', 'selected'])
  const content = await Agent.state(props.id)
  const metadata = await Agent.metadata(props.id)

  let name, image

  if (isUUID(content.name)) name = `TRANSLATE: ${content.name}`
  else if (content.name) name = content.name

  if (isUUID(content.image)) image = Agent.download(content.image).url()
  else if (content.image) image = content.image
  else {
    if (content.id?.includes('cand.li')) {
      image = '/candi-logo.svg'
    }
    else image = '/logo-green.svg'
  }

  function t(slug) { return store.getters.t(slug)}
</script>

<style scoped>
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 128px;
    overflow: hidden;
  }

  .container img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
</style>