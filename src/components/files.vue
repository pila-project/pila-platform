<template>
  <h1>Files</h1>
  <input
    ref="fileInput"
    style="display: none;"
    type="file"
    @change="uploadFile"
  >
  <button
    class="top-button"
    @click="$refs.fileInput.click()"
  >
    Upload
  </button>
  <TaggedContent type="file" />
</template>

<script>
  import TaggedContent from './tagged-content-collection.vue'

  export default {
    components: {
      TaggedContent
    },
    methods: {
      async uploadFile(e) {
        const file = e.target.files[0]
        const content_id = await Agent.upload(file.name, file.type, file)
        const metadata = await Agent.metadata(content_id)
        metadata.name = file.name
        this.$store.dispatch('tags/tag', { content_id, tag_type: 'file' } )
        e.target.value = ''
      }
    }
  }
  
</script>