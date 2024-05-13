<template>
  <v-container>
    <v-chip
      v-for="{ tag } in tags"
      class="mr-2 mb-2"
    >
      <TagTranslation :id="tag" />
    </v-chip>
  </v-container>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import TagTranslation from './tag-translation.vue'

  const props = defineProps({ partition: String, target: String })

  const tags = ref([])

  Agent
    .query(
      'taggings-for-target',
      [props.partition, props.target],
      'tags.knowlearning.systems'
    )
    .then(r => tags.value = r)

</script>
