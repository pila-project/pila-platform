<template>
  <div class="tagged-content-card-wrapper">
    <ContentLibraryCard
      v-for="{ target: id } in taggedContent"
      :key="id"
      :id="id"
      :selected="selfSelected === id"
      @click="() => {
        if (selfSelected === id) selfSelected = null
        else selfSelected = id
        $emit('select', selfSelected)
      }"
      @preview="previewing = id"
      @remove="$store.dispatch('pila_tags/untag', { content_id: id, tag_type: 'tracked' })"
    />
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import ContentLibraryCard from './content-library-card.vue'

  const partition = store.getters.tagPartition
  const tag = 'f760dad0-f133-11ee-804e-27f76a81958c'

  const loading = ref(true)
  const taggedContent = ref([])
  const selfSelected = ref(null)

  fetchTaggings()

  async function fetchTaggings() {
    loading.value = true
    await (
      Agent
        .query('taggings-for-tag', [partition, tag], 'tags.knowlearning.systems')
        .then(result => taggedContent.value = result)
    )
    loading.value = false
  }
</script>

<style>
    .tagged-content-card-wrapper
    {
        display: flex;
    }
</style>
