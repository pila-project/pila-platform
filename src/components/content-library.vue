<template>
  <div
    :class="{
      'content-wrapper': true,
      'metadata-open': !!selfSelected
    }"
  >
    <v-container>
      <TagFilters
        v-model="selectedTagFilters"
        :partition="tagRootPartition"
        :roots="tagFilters"
        select-leaves-only
        :LabelComponent="TagTranslation"
      />
      <v-progress-linear v-if="loading" indeterminate />
      <NoResultsFound v-else-if="!currentContentList.length" />
      <v-row v-else>
        <v-col
          v-for="(id, index) in currentContentList"
          :key="id + index"
          cols="12"
          lg="4"
          md="6"
          sm="12"
        >
          <TaggedContentCard
            :id="id"
            :selected="selfSelected === id"
            :removable="myContent.includes(id)"
            :showTaggingIcon="!isSimplifiedDomain && !!taggingIconVisibility[id]"
            @click="() => {
              if (selfSelected === id) selfSelected = null
              else selfSelected = id
              $emit('select', selfSelected)
            }"
            @preview="previewing = id"
            @tag="tagging = id"
            @remove="() => {
              setTagging({ tag: MY_CONTENT_TAG, target: id, value: null })
              myContent.splice(myContent.indexOf(id), 1)
            }"
          />
        </v-col>
      </v-row>
      <PreviewModal
        v-if="previewing"
        :id="previewing"
        width="90vw"
        height="90vh"
        @close="previewing = null"
      />
      <TaggingModal
        v-if="tagging && !isSimplifiedDomain"
        :id="tagging"
        :roots="tagRoots"
        @close="tagging = null"
      />

    </v-container>
    <div
      v-if="selfSelected"
      style="
        position: fixed;
        right: 0;
        height: 100%;
        padding-bottom: 100px;
        overflow: scroll;
        min-width: 200px;
        max-width: 30%;
        border-left: 1px solid #EEEEEE;
      "
    >
      <ContentMetadataPanel
        :key="selfSelected"
        @back="selfSelected = null"
        :id="selfSelected"
        :partition="TAG_HIERARCHY_PARTITION"
      />
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, watch, computed } from 'vue'
  import { useStore } from 'vuex'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import { Filters as TagFilters } from '@knowlearning/tags'
  import ContentMetadataPanel from './content-metadata-panel.vue'
  import NoResultsFound from './no-results-found.vue'
  import TaggedContentCard from './tagged-content-card.vue'
  import PreviewModal from './PreviewModal.vue'
  import TagTranslation from './tag-translation.vue'
  import setTagging from '../set-tagging.js'
  import TaggingModal from './tagging-modal.vue'
  import { MY_CONTENT_TAG, SIMPLIFIED_STUDY_DOMAINS } from '../constants.js'

  // use build local name map for alphabetical sorting
  import getName from '../name-and-translation-for-content.js'
  async function getDisplayNames(itemIds, language) {
    const entries = await Promise.all(
      itemIds.map(async itemId => [
        itemId,
        (await getName(itemId, language)) || ''
      ])
    )

    return Object.fromEntries(entries)
  }

  const store = useStore()

  const DEFAULT_CONTENT_TAG = '1a53db50-e248-11ee-ab5f-07f4a7408770'
  const SIMPLIFIED_TAG_ROOT = 'f760dad0-f133-11ee-804e-27f76a81958c'
  const THAILAND_COMPETENCIES_TAG_ROOT = 'fde718b0-762e-11f1-a2c5-33e64ed6c140'
  const THAILAND_OTHER_TAGS_ROOT = '3241cb20-94ff-11f1-836c-fb0d26641e20'
  const TAG_HIERARCHY_PARTITION = 'PILA Tag Hierarchy'
  const DEFAULT_CONTENT_PARTITION = store.getters.tagPartition

  const isSimplifiedDomain = SIMPLIFIED_STUDY_DOMAINS.includes(window.location.host)
  const tagRoots = isSimplifiedDomain
    ? [ SIMPLIFIED_TAG_ROOT ]
    : [ THAILAND_COMPETENCIES_TAG_ROOT, THAILAND_OTHER_TAGS_ROOT ]
  const tagRootPartition = isSimplifiedDomain ? store.getters.tagPartition : TAG_HIERARCHY_PARTITION

  const { auth: { user } } = await Agent.environment()

  const loading = ref(true)
  const taggedContent = ref([])
  const selfSelected = ref(null)
  const tagFilters = ref([])
  const previewing = ref(null)
  const tagging = ref(null)

  const selectedTagFilters = ref([])

  const displayNames = ref({})
  const selectedLanguage = computed(() => store.getters.language())

  const myContent = reactive(
    await (
      Agent
        .query('taggings-for-tag', [user, MY_CONTENT_TAG], 'tags.knowlearning.systems')
        .then(r => r.map(t => t.target))
    )
  )

  const unsortedContentList = computed(() => {
    let l = taggedContent.value.map(t => t.target)
    if (selectedTagFilters.value.length === 0) {
      l = [...l, ...myContent]
    }
    return l
  })

  const currentContentList = computed(() => {
    return [...unsortedContentList.value].sort((a, b) =>
      (displayNames.value[a] || '').localeCompare(
        displayNames.value[b] || '',
        selectedLanguage.value
      )
    )
  })

  watch(
    [unsortedContentList, selectedLanguage],
    async ([ids, language]) => {
      displayNames.value = await getDisplayNames(ids, language)
    },
    { immediate: true }
  )

  watch(selectedTagFilters, fetchTaggings)

  fetchTaggings()

  Promise.all(
    tagRoots.map(tagRoot =>
      Agent.query(
        'taggings-targeting-tags',
        [tagRootPartition, tagRoot],
        'tags.knowlearning.systems'
      )
    )
  ).then(results => {
    tagFilters.value = results.flatMap(r => r.map(t => t.target))
  })
  
  const taggingIconVisibility = reactive({})

  async function loadTaggingIconVisibility(id) {
    const role = store.getters['roles/role'](user)
    const { owner } = await Agent.metadata(id)
    taggingIconVisibility[id] = role === 'admin' || user === owner
  }

  watch(
    currentContentList,
    ids => {
      ids.forEach(id => {
        if (!(id in taggingIconVisibility)) {
          loadTaggingIconVisibility(id)
        }
      })
    },
    { immediate: true }
  )

  async function fetchTaggings() {
    loading.value = true
    if (selectedTagFilters.value.length) {
      await (
        Agent
          .query('taggings-intersection', [tagRootPartition, selectedTagFilters.value], 'tags.knowlearning.systems')
          .then(result => taggedContent.value = result)
      )
    }
    else {
      await (
        Agent
          .query('taggings-for-tag', [DEFAULT_CONTENT_PARTITION, DEFAULT_CONTENT_TAG], 'tags.knowlearning.systems')
          .then(result => taggedContent.value = result)
      )
    }
    loading.value = false
  }

</script>

<style>
  .content-wrapper,
  .tagged-content-card-wrapper
  {
    display: flex;
  }
  .content-wrapper
  {
    flex-grow: 1;
  }
  .content-wrapper.metadata-open
  {
    margin-right: calc(30% + 32px);
  }
  .tagged-content-card-wrapper
  {
    flex-grow: 2;
  }
</style>