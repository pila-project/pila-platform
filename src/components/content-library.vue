<template>
  <h1>My Content</h1>
  <input
    type="text"
    v-model="contentId"
    @keydown="showUUIDWarning = false"
  />
  <button @click="trackContent(contentId)">Add</button>
  <span v-if="showUUIDWarning">
    not a valid UUID!!!
  </span>
  <TaggedContent type="tracked" :tags="header_tag_types" />
  <h1>Expert Content</h1>
  <TaggedContent type="expert" :tags="header_tag_types" />
</template>

<script>
  import TaggedContent from './tagged-content-collection.vue'
  import { validate as isUUID } from 'uuid'

  export default {
    props: {
      header_tag_types: Array
    },
    components: {
      TaggedContent
    },
    data() {
      return {
        contentId: '',
        showUUIDWarning: false
      }
    },
    methods: {
      trackContent(content_id) {
        if (isUUID(content_id)) {
          this.$store.dispatch('tags/tag', { content_id, tag_type: 'tracked' })
        }
        else this.showUUIDWarning = true
      }
    }
  }
  
</script>