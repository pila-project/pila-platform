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
        {{ displayDate }}
      </p>
      <button
        v-if="instructions"
        type="button"
        class="assignment-instructions"
        :class="{ expanded: instructionsOpen }"
        @click.stop="instructionsOpen = !instructionsOpen"
      >
        {{ instructions }}
      </button>
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
  import { validate as isUUID } from 'uuid'
  import getName, { localizedNameFromValue } from '@/utils/name-and-translation-for-content.js'
  import { normalizeAssignmentContent } from '@/utils/assignment-content.js'
  import { formatDateForDisplay } from '@/utils/iso-date.js'
  import { PCard, PButton } from '@/components/ui/index.js'
  const store = useStore()

  const props = defineProps(['assignment', 'selected'])
  const assignment = await Agent.state(props.assignment)
  const assignmentItem = await Agent.state(assignment.item_id)
  const assignmentMetadata = await Agent.metadata(props.assignment)
  const name = ref('')
  const instructionsOpen = ref(false)
  const selectedLanguage = computed(() => store.getters.language())
  const instructions = computed(() => String(assignmentItem?.description || '').trim())
  const displayDate = computed(() => (
    formatDateForDisplay(new Date(assignmentMetadata.created), selectedLanguage.value)
  ))
  let nameLoadRun = 0
  const contentId = normalizeAssignmentContent(assignmentItem?.content).find(id => typeof id === 'string' && id) || null
  let content = {}
  let metadata = {}
  let image = ref('/mascotte.png')

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

  try {
    if (contentId) {
      content = await Agent.state(contentId) || {}
      metadata = await Agent.metadata(contentId) || {}
    }

    if (isUUID(content.image)) image = await Agent.download(content.image).url()
    else if (content.image) image = content.image
    else if (metadata.active_type?.startsWith('application/json;type=sequence')) {
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
  } catch (error) {
    console.warn(`Unable to load assignment content image for ${contentId}.`, error)
    image = '/mascotte.png'
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
.assignment-instructions {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  width: 100%;
  min-width: 0;
  margin: 0.35rem 0 0;
  padding: 0;
  border: 0;
  background: none;
  text-align: left;
  font: inherit;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--color-slate-600, #475569);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  cursor: pointer;
}
.assignment-instructions.expanded {
  display: block;
  -webkit-line-clamp: unset;
}
</style>