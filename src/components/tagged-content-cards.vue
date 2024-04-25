<template>
  <div class="content-wrapper">
    <div v-if="selfSelected">
      <ContentMetadataPanel
        :key="selfSelected"
        @back="selfSelected = null"
        :id="selfSelected"
        :partition="partition"
      />
    </div>
    <div v-else>
      <TagTaggingsList
        :tags="competencies"
        :partition="partition"
        :selected="selectedCompetencies"
        @select="tag => toggleCompetency(tag)"
      />
    </div>
    <v-container>
      <v-row>
        <v-col
          v-for="({ target: id }, index) in taggedContent"
          :key="id + index"
          cols="12"
          lg="4"
          md="6"
          sm="12"
        >
          <TaggedContentCard
            :id="id"
            :selected="selfSelected === id"
            @click="() => {
              if (selfSelected === id) selfSelected = null
              else selfSelected = id
              $emit('select', selfSelected)
            }"
            @preview="previewing = id"
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
  import { ref, reactive } from 'vue'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import ContentMetadataPanel from './content-metadata-panel.vue'
  import TagTaggingsList from './tag-taggings-list.vue'
  import TaggedContentCard from './tagged-content-card.vue'

  const partition = store.getters.tagPartition
  const tag = '1a53db50-e248-11ee-ab5f-07f4a7408770'
  const competencyTag = 'f760dad0-f133-11ee-804e-27f76a81958c'

  const loading = ref(true)
  const taggedContent = ref([])
  const selfSelected = ref(null)
  const competencies = ref([])
  const selectedCompetencies = reactive([])

  fetchTaggings()

  Agent
    .query('taggings-targeting-tags', [partition, competencyTag], 'tags.knowlearning.systems')
    .then(r => competencies.value = r.map(t => t.target))

  function toggleCompetency(id) {
    const index = selectedCompetencies.indexOf(id)
    if (index > -1) selectedCompetencies.splice(index, 1)
    else selectedCompetencies.push(id)
    fetchTaggings()
  }

  async function fetchTaggings() {
    loading.value = true
    if (selectedCompetencies.length) {
      await (
        Agent
          .query('taggings-intersection', [partition, selectedCompetencies], 'tags.knowlearning.systems')
          .then(result => taggedContent.value = result)
      )
    }
    else {
      await (
        Agent
          .query('taggings-for-tag', [partition, tag], 'tags.knowlearning.systems')
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
  .tagged-content-card-wrapper
  {
    flex-grow: 2;
  }
</style>
