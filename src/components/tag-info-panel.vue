<template>
  <div>
    <h1>Tags</h1>
    <div v-for="tag in tagsForContent">
      <h2>
        <vueScopeComponent
          :id="tag"
          :path="['name']"
        />
      </h2>
    </div>
    <h1>Metadata</h1>
    <div>
      Created:
      <vueScopeComponent
        :id="content"
        metadata
        :path="['created']"
      />
      Updated:
      <vueScopeComponent
        :id="content"
        metadata
        :path="['updated']"
      />
    </div>
  </div>
</template>

<script setup>
  import { watch, ref } from 'vue'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'

  const { content } = defineProps({
    content: {
      type: String,
      required: false,
    },
    defaults: Array
  })

  const tagsForContent = ref([])

  Agent
    .query('tags-for-content', [content], 'tags.knowlearning.systems')
    .then(result => tagsForContent.value = result.map(r => r.tag_id))

</script>