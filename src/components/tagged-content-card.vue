<template>
  <v-card
    :elevation="props.selected ? 10 : 3"
    :variant="props.selected ? 'tonal' : 'elevated'"
    draggable="true"
    @dragstart="$event.dataTransfer.setData('text', props.id)"
  >
    <template v-slot:title>
      <NameOrTranslatedNameFromItemId
        :itemId="props.id"
      />
    </template>
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
        :loading="props.removing"
        :disabled="props.removeDisabled"
        @click.stop="$emit('remove')"
      />
      <v-spacer />
      <v-btn
        v-if="props.showTaggingIcon"
        :aria-label="t('tag')"
        @click.stop="$emit('tag')"
        color="grey"
      >
        <v-icon
          icon="fa-solid fa-tag"
          size="28"
        />
    </v-btn>

    </template>
  </v-card>
</template>

<script setup>
  import { ref } from 'vue'
  import { useStore } from 'vuex'
  import { validate as isUUID } from 'uuid'
  import NameOrTranslatedNameFromItemId from './name-or-translated-name-from-item-id.vue'
  import displayContentImage from '../image-ref-for-content.js'

  const store = useStore()
  function t(slug) { return store.getters.t(slug)}

  const props = defineProps({
    id: {
      type: String,
      required: true
    },
    selected: Boolean,
    removable: Boolean,
    removing: Boolean,
    removeDisabled: Boolean,
    showTaggingIcon: {
      type: Boolean,
      default: false
    },
  })

  const image = await displayContentImage(props.id)

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
