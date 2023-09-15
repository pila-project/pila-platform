<template>
  <h1>Studies</h1>
  <TaggedContent type="admin-approval-request" :tags="['admin-approved']" />
</template>

<script>
  import TaggedContent from '../../components/tagged-content-collection.vue'

  export default {
    components: {
      TaggedContent
    }
  }

</script>