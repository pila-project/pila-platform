<template>
  <div class="task-card border border-slate-200 rounded-lg bg-white p-3 shadow-sm">
    <h3 class="text-sm font-semibold text-zinc-950 truncate">
      <NameOrTranslatedNameFromItemId :item-id="assignment.content_id" />
    </h3>

    <div class="image-container mt-2">
      <span
        v-if="loadingImage"
        class="inline-block w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"
      />
      <img
        v-else
        class="w-full h-28 object-cover rounded"
        :src="image"
        alt=""
      />
    </div>

    <dl class="assignment-details mt-2 text-xs text-slate-600">
      <div v-if="assignment.starts_at" class="detail-row">
        <dt>Starts:</dt>
        <dd>{{ formatDate(assignment.starts_at) }}</dd>
      </div>
      <div v-if="assignment.ends_at" class="detail-row">
        <dt>Ends:</dt>
        <dd>{{ formatDate(assignment.ends_at) }}</dd>
      </div>
    </dl>

    <div class="flex justify-end mt-3">
      <button
        type="button"
        class="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
        @click="$emit('play')"
      >
        {{ t('play') }}
      </button>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue'
  import { useStore } from 'vuex'
  import NameOrTranslatedNameFromItemId from '@/components/content/name-or-translated-name-from-item-id.vue'
  import { getContentImage } from '@/utils/content-cache.js'

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
        const nextImage = await getContentImage(contentId)
        if (runId === imageLoadRun) image.value = nextImage || '/logo-green.svg'
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
.image-container {
  min-height: 7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 0.5rem;
}
.detail-row {
  display: flex;
  gap: 0.35rem;
}
.detail-row dt {
  font-weight: 600;
}
</style>
