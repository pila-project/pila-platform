<template>
  <div class="flex flex-wrap gap-2">
    <span
      v-for="{ tag } in tags"
      :key="tag"
      class="badge badge-info"
    >
      <TagTranslation :id="tag" />
    </span>
  </div>
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
