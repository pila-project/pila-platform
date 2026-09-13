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
      <p v-if="createdLabel" class="text-xs text-slate-500 mt-0.5">
        {{ createdLabel }}
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
        icon="lucide:play"
        :text="t('play')"
        @click.stop="$emit('play')"
      />
    </template>
  </PCard>
</template>

<script setup>
  import { computed, ref, watch } from 'vue'
  import { useStore } from 'vuex'
  import getName, { localizedNameFromValue } from '@/utils/name-and-translation-for-content.js'
  import { normalizeAssignmentContent } from '@/utils/assignment-content.js'
  import { getContentImage } from '@/utils/content-cache.js'
  import { PCard, PButton } from '@/components/ui/index.js'

  const store = useStore()
  const props = defineProps(['assignment', 'selected'])

  const assignmentState = ref(null)
  const assignmentItem = ref(null)
  const assignmentMetadata = ref(null)
  const name = ref('')
  const image = ref('/mascotte.png')
  const selectedLanguage = computed(() => store.getters.language())
  let nameLoadRun = 0
  let imageLoadRun = 0
  let cardLoadRun = 0

  const createdLabel = computed(() => {
    const created = assignmentMetadata.value?.created
    if (!created) return ''
    const date = new Date(created)
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString()
  })

  function isStringId(value) {
    return typeof value === 'string' && value.length > 0
  }

  async function loadName(language) {
    const runId = ++nameLoadRun
    const itemId = assignmentState.value?.item_id
    try {
      if (!isStringId(itemId)) {
        if (runId === nameLoadRun) name.value = ''
        return
      }
      const translatedName = await getName(itemId, language)
      if (runId === nameLoadRun) name.value = translatedName || ''
    } catch (error) {
      console.warn(`Unable to load translated assignment item name for ${itemId}.`, error)
      if (runId === nameLoadRun) {
        name.value = localizedNameFromValue(assignmentItem.value?.name, language)
      }
    }
  }

  async function loadImage() {
    const runId = ++imageLoadRun
    try {
      const contentIds = normalizeAssignmentContent(assignmentItem.value?.content)
      const contentId = contentIds.find(id => isStringId(id)) || null
      if (!contentId) {
        if (runId === imageLoadRun) image.value = '/mascotte.png'
        return
      }
      const nextImage = await getContentImage(contentId)
      if (runId === imageLoadRun) image.value = nextImage || '/mascotte.png'
    } catch (error) {
      console.warn(`Unable to load student assignment image for ${props.assignment}.`, error)
      if (runId === imageLoadRun) image.value = '/mascotte.png'
    }
  }

  watch(
    () => props.assignment,
    async (assignmentId) => {
      const runId = ++cardLoadRun
      assignmentState.value = null
      assignmentItem.value = null
      assignmentMetadata.value = null
      name.value = ''
      image.value = '/mascotte.png'

      if (!isStringId(assignmentId)) return

      try {
        const [state, metadata] = await Promise.all([
          Agent.state(assignmentId).catch(() => null),
          Agent.metadata(assignmentId).catch(() => null),
        ])
        if (runId !== cardLoadRun) return

        assignmentState.value = state
        assignmentMetadata.value = metadata

        const itemId = state?.item_id
        if (isStringId(itemId)) {
          const item = await Agent.state(itemId).catch(() => null)
          if (runId !== cardLoadRun) return
          assignmentItem.value = item
        }

        await Promise.all([
          loadName(selectedLanguage.value),
          loadImage(),
        ])
      } catch (error) {
        console.warn(`Unable to load student assignment card for ${assignmentId}.`, error)
      }
    },
    { immediate: true }
  )

  watch(
    selectedLanguage,
    (language) => {
      if (!assignmentState.value?.item_id) return
      loadName(language)
    }
  )

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
