<template>
  <button
    class="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
    @click.stop.prevent="() => {
      if (loaded && childTags.length === 0) emit('select', props.tag)
      else open = !open
    }"
  >
    <span :style="`display: block; width: ${depth * 48}px`" />
    <LucideIcon
      v-if="loaded && childTags.length === 0"
      :name="selected.includes(props.tag) ? 'check-square' : 'square'"
      :size="16"
      class="mr-2"
    />
    <LucideIcon
      v-if="childTags.length"
      :name="open ? 'chevron-down' : 'chevron-right'"
      :size="16"
      class="mr-2"
      :style="{ marginLeft: `${Math.max(depth-1, 0) * 48}px` }"
      @click.stop="open = !open"
    />
    <span
      draggable="true"
      @dragstart="$event.dataTransfer.setData('text', props.tag)"
      @dragover.prevent
    >
      <TagTranslation :id="props.tag" />
    </span>
  </button>
  <TagTaggingsList
    v-if="open"
    :tags="childTags"
    :partition="props.partition"
    :selected="props.selected"
    :depth="props.depth + 1"
    @select="tag => emit('select', tag)"
  />
</template>

<script setup>
  import { ref } from 'vue'
  import TagTaggingsList from './tag-taggings-list.vue'
  import TagTranslation from './tag-translation.vue'
  import LucideIcon from '@/components/ui/LucideIcon.vue'

  const emit = defineEmits(['select'])

  const props = defineProps({
    tag: String,
    partition: String,
    selected: Array,
    depth: {
      type: Number,
      default: 0
    }
  })
  const open = ref(false)
  const childTags = ref([])
  const loaded = ref(false)

  Agent
    .query('taggings-targeting-tags', [props.partition, props.tag], 'tags.knowlearning.systems')
    .then(r => {
      childTags.value = r.map(t => t.target)
      loaded.value = true
    })

</script>
