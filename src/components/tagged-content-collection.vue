<template>
  <table>
    <thead>
      <tr>
        <th></th>
        <th>Name</th>
        <th v-for="tag in tags" :id="tag">
          {{tag}}
        </th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <TaggedContentItem
        v-for="id in content"
        :key="id"
        :id="id"
        :tags="tags"
        :tag_type="type"
      />
    </tbody>
  </table>
</template>

<script>
  import TaggedContentItem from './tagged-content-item.vue'

  export default {
    props: {
      type: String,
      tags: Array
    },
    components: {
      TaggedContentItem
    },
    computed: {
      content() {
        return this.$store.getters['tags/withTag'](this.type)
      }
    }
  }
</script>