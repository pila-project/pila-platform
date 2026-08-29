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
  import { ref, watch } from 'vue'
  import TagTranslation from './tag-translation.vue'

  const props = defineProps({ partition: String, target: String })

  const tags = ref([])

  watch(
    () => [props.partition, props.target],
    ([partition, target]) => {
      tags.value = []
      if (!partition || !target) return
      Agent
        .query(
          'taggings-for-target',
          [partition, target],
          'tags.knowlearning.systems'
        )
        .then(r => { tags.value = r })
        .catch(() => { tags.value = [] })
    },
    { immediate: true },
  )

</script>
