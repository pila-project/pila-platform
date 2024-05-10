<template>
  <v-card
    :elevation="props.selected ? 10 : 3"
    :variant="props.selected ? 'tonal' : 'elevated'"
    :title="name"
  >
    <template v-slot:text>
      <p>{{ (new Date(assignmentMetadata.created)).toLocaleDateString() }}</p>
      <div class="image-container">
        <v-img :src="image" height="150px" />
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
  import { ref } from 'vue'
  import { useStore } from 'vuex'
  import { validate as isUUID } from 'uuid'
  import { CANDLI_SEQUENCES } from '../../constants.js'

  const store = useStore()

  const props = defineProps(['assignment', 'selected'])
  const assignment = await Agent.state(props.assignment)
  const assignmentItem = await Agent.state(assignment.item_id)
  const assignmentMetadata = await Agent.metadata(props.assignment)
  const name = assignmentItem.name
  const content = await Agent.state(assignmentItem.content)
  const metadata = await Agent.metadata(assignmentItem.content)

  console.log('asssfdasdfasdfa', assignment, content)
  let image = ref('')

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

  function t(slug) { return store.getters.t(slug)}
</script>