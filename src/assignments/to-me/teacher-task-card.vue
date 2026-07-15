<template>
  <v-card class="task-card" elevation="3">
    <template #title>
      <NameOrTranslatedNameFromItemId :item-id="assignment.content_id" />
    </template>

    <template #text>
      <div class="image-container">
        <v-progress-circular
          v-if="loadingImage"
          indeterminate
          size="28"
          width="3"
        />
        <v-img
          v-else
          :src="image"
          height="112"
        />
      </div>

      <dl class="assignment-details">
        <div v-if="assignment.starts_at" class="detail-row">
          <dt>Starts:</dt>
          <dd>{{ formatDate(assignment.starts_at) }}</dd>
        </div>
        <div v-if="assignment.ends_at" class="detail-row">
          <dt>Ends:</dt>
          <dd>{{ formatDate(assignment.ends_at) }}</dd>
        </div>
      </dl>
    </template>

    <template #actions>
      <v-spacer />
      <v-btn
        prepend-icon="fa-solid fa-play"
        :text="t('play')"
        @click="$emit('play')"
      />
    </template>
  </v-card>
</template>

<script setup>
  import { ref, watch } from 'vue'
  import { useStore } from 'vuex'
  import NameOrTranslatedNameFromItemId from '../../components/name-or-translated-name-from-item-id.vue'
  import displayContentImage from '../../image-ref-for-content.js'

  const props = defineProps({
    assignment: {
      type: Object,
      required: true
    }
  })

  defineEmits(['play'])

  const store = useStore()
  const image = ref('/logo-green.svg')
  const loadingImage = ref(true)
  let imageLoadRun = 0

  watch(
    () => props.assignment.content_id,
    async contentId => {
      const runId = ++imageLoadRun
      loadingImage.value = true

      try {
        const nextImage = await displayContentImage(contentId)
        if (runId === imageLoadRun) image.value = nextImage
      } catch (error) {
        console.warn(`Unable to load task image for ${contentId}.`, error)
        if (runId === imageLoadRun) image.value = '/logo-green.svg'
      } finally {
        if (runId === imageLoadRun) loadingImage.value = false
      }
    },
    { immediate: true }
  )

  function t(slug) {
    return store.getters.t(slug)
  }

  function formatDate(value) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Not set'
    return date.toLocaleString()
  }
</script>

<style scoped>
.task-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.task-card :deep(.v-card-text) {
  flex: 1;
}

.image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 128px;
  margin-bottom: 12px;
  overflow: hidden;
}

.assignment-details {
  display: grid;
  gap: 4px;
  margin: 0;
}

.detail-row {
  display: grid;
  grid-template-columns: minmax(72px, auto) 1fr;
  gap: 8px;
}

.detail-row dt {
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-weight: 600;
}

.detail-row dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
